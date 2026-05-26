# LLM 模型管理 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现 LLM 模型配置的管理功能 — 模型注册（CRUD）+ 用途分类映射（category UNIQUE），前后端完整可用。

**Architecture:** 后端新增两张 SQLAlchemy 模型（`llm_providers` + `llm_settings`），api_key 用 Fernet 对称加密存储，密钥来自环境变量。前端新增两个管理页面，通过 react-query 与后端交互。所有接口需 Bearer 认证。

**Tech Stack:** FastAPI, SQLAlchemy 2.0, PyMySQL, cryptography(Fernet), React 18, TypeScript, react-query, axios, Tailwind CSS

---

## File Structure

### Backend — New Files
- `backend/app/models/__init__.py` — 导出所有模型，触发 Base.metadata 注册
- `backend/app/models/llm.py` — LlmProvider + LlmSetting 两个 ORM 模型
- `backend/app/schemas/llm.py` — Pydantic schemas (Create/Update/Response)
- `backend/app/core/crypto.py` — Fernet 加密/解密工具函数
- `backend/app/api/v1/llm.py` — 模型管理和用途配置的路由

### Backend — Modified Files
- `backend/app/main.py` — 添加 startup 事件：自动建表
- `backend/app/api/v1/__init__.py` — 注册 llm router
- `backend/app/core/config.py` — 添加 ENCRYPTION_KEY 配置项
- `backend/requirements.txt` — 添加 cryptography 依赖

### Frontend — New Files
- `frontend/src/api/llm.ts` — 模型管理和用途配置的 API 函数
- `frontend/src/pages/ModelProviders.tsx` — 模型注册管理页面（CRUD）
- `frontend/src/pages/ModelSettings.tsx` — 用途配置管理页面

### Frontend — Modified Files
- `frontend/src/App.tsx` — 添加新路由
- `frontend/src/components/Sidebar.tsx` — 添加侧边栏导航
- `frontend/src/components/Layout.tsx` — 添加页面标题映射

---

### Task 1: 后端 — 加密工具 & 配置

**Files:**
- Create: `backend/app/core/crypto.py`
- Modify: `backend/app/core/config.py`
- Modify: `backend/requirements.txt`

- [ ] **Step 1: 添加 cryptography 到 requirements.txt**

在 `backend/requirements.txt` 末尾添加：
```
cryptography==44.0.3
```

- [ ] **Step 2: 安装依赖**

Run: `cd backend && pip install cryptography==44.0.3`
Expected: 安装成功

- [ ] **Step 3: 在 config.py 中添加 ENCRYPTION_KEY**

在 `backend/app/core/config.py` 的 `Settings` 类中，JWT 配置之后添加：

```python
    # 加密配置
    ENCRYPTION_KEY: str = os.getenv("ENCRYPTION_KEY", "")
```

- [ ] **Step 4: 创建 crypto.py**

创建 `backend/app/core/crypto.py`：

```python
from cryptography.fernet import Fernet

from app.core.config import settings


def _get_fernet() -> Fernet:
    if not settings.ENCRYPTION_KEY:
        raise ValueError("ENCRYPTION_KEY 未配置，请在 .env 中设置")
    return Fernet(settings.ENCRYPTION_KEY.encode())


def encrypt_value(plain: str) -> str:
    return _get_fernet().encrypt(plain.encode()).decode()


def decrypt_value(cipher: str) -> str:
    return _get_fernet().decrypt(cipher.encode()).decode()
```

- [ ] **Step 5: 在 .env 中添加 ENCRYPTION_KEY**

Run: `cd backend && python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"`
将输出值添加到 `backend/.env`：`ENCRYPTION_KEY=<生成的值>`

- [ ] **Step 6: 验证加密工具可用**

Run: `cd backend && python -c "from app.core.crypto import encrypt_value, decrypt_value; c=encrypt_value('test'); print(c, decrypt_value(c))"`
Expected: 输出加密字符串和 "test"

- [ ] **Step 7: Commit**

```bash
git add backend/requirements.txt backend/app/core/config.py backend/app/core/crypto.py backend/.env
git commit -m "feat: 添加 Fernet 加密工具及 ENCRYPTION_KEY 配置"
```

---

### Task 2: 后端 — SQLAlchemy 模型 & 自动建表

**Files:**
- Create: `backend/app/models/__init__.py`
- Create: `backend/app/models/llm.py`
- Modify: `backend/app/main.py`

- [ ] **Step 1: 创建 models/llm.py**

创建 `backend/app/models/llm.py`：

```python
from datetime import datetime

from sqlalchemy import String, Integer, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class LlmProvider(Base):
    __tablename__ = "llm_providers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False, comment="模型名称标识")
    base_url: Mapped[str] = mapped_column(String(500), nullable=False, comment="API Base URL")
    model_name: Mapped[str] = mapped_column(String(200), nullable=False, comment="模型标识名")
    api_key: Mapped[str] = mapped_column(String(500), nullable=False, comment="加密存储的 API Key")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, comment="创建时间")
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, onupdate=datetime.now, comment="更新时间")

    settings: Mapped[list["LlmSetting"]] = relationship(back_populates="provider")


class LlmSetting(Base):
    __tablename__ = "llm_settings"
    __table_args__ = (
        UniqueConstraint("category", name="uq_llm_settings_category"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    category: Mapped[str] = mapped_column(String(50), nullable=False, comment="用途类型: embedding/chat/default 等")
    provider_id: Mapped[int] = mapped_column(Integer, ForeignKey("llm_providers.id"), nullable=False, comment="关联的模型提供商")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, comment="创建时间")
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, onupdate=datetime.now, comment="更新时间")

    provider: Mapped["LlmProvider"] = relationship(back_populates="settings")
```

- [ ] **Step 2: 创建 models/__init__.py**

创建 `backend/app/models/__init__.py`：

```python
from app.models.llm import LlmProvider, LlmSetting

__all__ = ["LlmProvider", "LlmSetting"]
```

- [ ] **Step 3: 在 main.py 添加自动建表**

在 `backend/app/main.py` 中，`app = FastAPI(title="CatAgent")` 之前添加导入，之后添加 startup 事件：

```python
from app.models import LlmProvider, LlmSetting  # noqa: F401
```

在 `app.include_router(api_router)` 之后添加：

```python
@app.on_event("startup")
def startup():
    from app.core.database import Base, engine
    Base.metadata.create_all(bind=engine)
```

- [ ] **Step 4: 验证建表**

Run: `cd backend && python -c "from app.main import app; print('OK')"`
Expected: 输出 "OK"，无报错

Run: `cd backend && uvicorn app.main:app --reload` 启动后检查数据库中是否有 `llm_providers` 和 `llm_settings` 表。
Expected: 两张表已创建

- [ ] **Step 5: Commit**

```bash
git add backend/app/models/ backend/app/main.py
git commit -m "feat: 添加 LlmProvider/LlmSetting 模型及自动建表"
```

---

### Task 3: 后端 — Pydantic Schemas

**Files:**
- Create: `backend/app/schemas/llm.py`

- [ ] **Step 1: 创建 schemas/llm.py**

创建 `backend/app/schemas/llm.py`：

```python
from datetime import datetime
from typing import Optional

from pydantic import BaseModel


# ---------- LlmProvider ----------

class ProviderCreate(BaseModel):
    name: str
    base_url: str
    model_name: str
    api_key: str


class ProviderUpdate(BaseModel):
    name: Optional[str] = None
    base_url: Optional[str] = None
    model_name: Optional[str] = None
    api_key: Optional[str] = None


class ProviderResponse(BaseModel):
    id: int
    name: str
    base_url: str
    model_name: str
    api_key_masked: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ---------- LlmSetting ----------

class SettingCreate(BaseModel):
    category: str
    provider_id: int


class SettingUpdate(BaseModel):
    provider_id: int


class SettingResponse(BaseModel):
    id: int
    category: str
    provider_id: int
    provider: ProviderResponse
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/schemas/llm.py
git commit -m "feat: 添加 LLM 管理 Pydantic schemas"
```

---

### Task 4: 后端 — API 路由

**Files:**
- Create: `backend/app/api/v1/llm.py`
- Modify: `backend/app/api/v1/__init__.py`

- [ ] **Step 1: 创建 api/v1/llm.py**

创建 `backend/app/api/v1/llm.py`：

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.crypto import decrypt_value, encrypt_value
from app.core.database import get_db
from app.core.response import error, success
from app.models.llm import LlmProvider, LlmSetting
from app.schemas.llm import (
    ProviderCreate,
    ProviderResponse,
    ProviderUpdate,
    SettingCreate,
    SettingResponse,
    SettingUpdate,
)

router = APIRouter(tags=["LLM 管理"], dependencies=[Depends(get_current_user)])


def _mask_api_key(key: str) -> str:
    if len(key) <= 8:
        return "****"
    return key[:4] + "****" + key[-4:]


def _provider_to_response(p: LlmProvider) -> ProviderResponse:
    plain_key = decrypt_value(p.api_key)
    return ProviderResponse(
        id=p.id,
        name=p.name,
        base_url=p.base_url,
        model_name=p.model_name,
        api_key_masked=_mask_api_key(plain_key),
        created_at=p.created_at,
        updated_at=p.updated_at,
    )


# ==================== Provider CRUD ====================

@router.get("/providers")
def list_providers(db: Session = Depends(get_db)):
    providers = db.query(LlmProvider).order_by(LlmProvider.id.desc()).all()
    return success(data=[_provider_to_response(p) for p in providers])


@router.post("/providers")
def create_provider(req: ProviderCreate, db: Session = Depends(get_db)):
    provider = LlmProvider(
        name=req.name,
        base_url=req.base_url,
        model_name=req.model_name,
        api_key=encrypt_value(req.api_key),
    )
    db.add(provider)
    db.commit()
    db.refresh(provider)
    return success(data=_provider_to_response(provider), message="添加成功")


@router.put("/providers/{provider_id}")
def update_provider(provider_id: int, req: ProviderUpdate, db: Session = Depends(get_db)):
    provider = db.query(LlmProvider).filter(LlmProvider.id == provider_id).first()
    if not provider:
        raise HTTPException(status_code=404, detail=error(404, "模型不存在"))
    if req.name is not None:
        provider.name = req.name
    if req.base_url is not None:
        provider.base_url = req.base_url
    if req.model_name is not None:
        provider.model_name = req.model_name
    if req.api_key is not None:
        provider.api_key = encrypt_value(req.api_key)
    db.commit()
    db.refresh(provider)
    return success(data=_provider_to_response(provider), message="更新成功")


@router.delete("/providers/{provider_id}")
def delete_provider(provider_id: int, db: Session = Depends(get_db)):
    provider = db.query(LlmProvider).filter(LlmProvider.id == provider_id).first()
    if not provider:
        raise HTTPException(status_code=404, detail=error(404, "模型不存在"))
    setting_count = db.query(LlmSetting).filter(LlmSetting.provider_id == provider_id).count()
    if setting_count > 0:
        raise HTTPException(status_code=400, detail=error(400, "该模型正在被用途配置引用，请先解除关联"))
    db.delete(provider)
    db.commit()
    return success(message="删除成功")


# ==================== Settings 管理 ====================

@router.get("/settings")
def list_settings(db: Session = Depends(get_db)):
    settings = db.query(LlmSetting).order_by(LlmSetting.id).all()
    return success(data=[
        SettingResponse(
            id=s.id,
            category=s.category,
            provider_id=s.provider_id,
            provider=_provider_to_response(s.provider),
            created_at=s.created_at,
            updated_at=s.updated_at,
        ) for s in settings
    ])


@router.post("/settings")
def create_setting(req: SettingCreate, db: Session = Depends(get_db)):
    provider = db.query(LlmProvider).filter(LlmProvider.id == req.provider_id).first()
    if not provider:
        raise HTTPException(status_code=400, detail=error(400, "指定的模型不存在"))
    existing = db.query(LlmSetting).filter(LlmSetting.category == req.category).first()
    if existing:
        raise HTTPException(status_code=400, detail=error(400, f"用途 '{req.category}' 已配置，请使用更新接口"))
    setting = LlmSetting(category=req.category, provider_id=req.provider_id)
    db.add(setting)
    db.commit()
    db.refresh(setting)
    return success(data=SettingResponse(
        id=setting.id,
        category=setting.category,
        provider_id=setting.provider_id,
        provider=_provider_to_response(setting.provider),
        created_at=setting.created_at,
        updated_at=setting.updated_at,
    ), message="配置成功")


@router.put("/settings/{category}")
def update_setting(category: str, req: SettingUpdate, db: Session = Depends(get_db)):
    setting = db.query(LlmSetting).filter(LlmSetting.category == category).first()
    if not setting:
        raise HTTPException(status_code=404, detail=error(404, f"用途 '{category}' 未配置"))
    provider = db.query(LlmProvider).filter(LlmProvider.id == req.provider_id).first()
    if not provider:
        raise HTTPException(status_code=400, detail=error(400, "指定的模型不存在"))
    setting.provider_id = req.provider_id
    db.commit()
    db.refresh(setting)
    return success(data=SettingResponse(
        id=setting.id,
        category=setting.category,
        provider_id=setting.provider_id,
        provider=_provider_to_response(setting.provider),
        created_at=setting.created_at,
        updated_at=setting.updated_at,
    ), message="更新成功")


@router.delete("/settings/{category}")
def delete_setting(category: str, db: Session = Depends(get_db)):
    setting = db.query(LlmSetting).filter(LlmSetting.category == category).first()
    if not setting:
        raise HTTPException(status_code=404, detail=error(404, f"用途 '{category}' 未配置"))
    db.delete(setting)
    db.commit()
    return success(message="删除成功")
```

- [ ] **Step 2: 注册 llm router**

修改 `backend/app/api/v1/__init__.py`：

```python
from fastapi import APIRouter

from app.api.v1 import auth, llm, system

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(auth.router, prefix="/auth")
api_router.include_router(system.router, prefix="/system")
api_router.include_router(llm.router, prefix="/llm")
```

- [ ] **Step 3: 启动验证 API 可访问**

Run: `cd backend && uvicorn app.main:app --reload`

访问 `http://127.0.0.1:8000/docs`，检查 LLM 管理 分组下是否出现以下接口：
- GET /api/v1/llm/providers
- POST /api/v1/llm/providers
- PUT /api/v1/llm/providers/{provider_id}
- DELETE /api/v1/llm/providers/{provider_id}
- GET /api/v1/llm/settings
- POST /api/v1/llm/settings
- PUT /api/v1/llm/settings/{category}
- DELETE /api/v1/llm/settings/{category}

Expected: 所有接口出现在文档中

- [ ] **Step 4: Commit**

```bash
git add backend/app/api/v1/llm.py backend/app/api/v1/__init__.py
git commit -m "feat: 添加 LLM 模型管理和用途配置 API 路由"
```

---

### Task 5: 前端 — API 层

**Files:**
- Create: `frontend/src/api/llm.ts`

- [ ] **Step 1: 创建 api/llm.ts**

创建 `frontend/src/api/llm.ts`：

```typescript
import { apiClient } from './client'

// ---------- Types ----------

export interface ProviderResponse {
  id: number
  name: string
  base_url: string
  model_name: string
  api_key_masked: string
  created_at: string
  updated_at: string
}

export interface ProviderCreate {
  name: string
  base_url: string
  model_name: string
  api_key: string
}

export interface ProviderUpdate {
  name?: string
  base_url?: string
  model_name?: string
  api_key?: string
}

export interface SettingResponse {
  id: number
  category: string
  provider_id: number
  provider: ProviderResponse
  created_at: string
  updated_at: string
}

export interface SettingCreate {
  category: string
  provider_id: number
}

export interface SettingUpdate {
  provider_id: number
}

// ---------- Provider API ----------

export async function listProviders() {
  const res = await apiClient.get('/api/v1/llm/providers')
  return res.data.data as ProviderResponse[]
}

export async function createProvider(data: ProviderCreate) {
  const res = await apiClient.post('/api/v1/llm/providers', data)
  return res.data.data as ProviderResponse
}

export async function updateProvider(id: number, data: ProviderUpdate) {
  const res = await apiClient.put(`/api/v1/llm/providers/${id}`, data)
  return res.data.data as ProviderResponse
}

export async function deleteProvider(id: number) {
  const res = await apiClient.delete(`/api/v1/llm/providers/${id}`)
  return res.data
}

// ---------- Setting API ----------

export async function listSettings() {
  const res = await apiClient.get('/api/v1/llm/settings')
  return res.data.data as SettingResponse[]
}

export async function createSetting(data: SettingCreate) {
  const res = await apiClient.post('/api/v1/llm/settings', data)
  return res.data.data as SettingResponse
}

export async function updateSetting(category: string, data: SettingUpdate) {
  const res = await apiClient.put(`/api/v1/llm/settings/${category}`, data)
  return res.data.data as SettingResponse
}

export async function deleteSetting(category: string) {
  const res = await apiClient.delete(`/api/v1/llm/settings/${category}`)
  return res.data
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/api/llm.ts
git commit -m "feat: 添加 LLM 管理前端 API 层"
```

---

### Task 6: 前端 — 模型管理页面

**Files:**
- Create: `frontend/src/pages/ModelProviders.tsx`

- [ ] **Step 1: 创建 ModelProviders.tsx**

创建 `frontend/src/pages/ModelProviders.tsx`：

```tsx
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  listProviders,
  createProvider,
  updateProvider,
  deleteProvider,
  type ProviderResponse,
  type ProviderCreate,
  type ProviderUpdate,
} from '../api/llm'
import ConfirmDialog from '../components/ConfirmDialog'

interface FormData {
  name: string
  base_url: string
  model_name: string
  api_key: string
}

const emptyForm: FormData = { name: '', base_url: '', model_name: '', api_key: '' }

export default function ModelProviders() {
  const queryClient = useQueryClient()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<ProviderResponse | null>(null)
  const [form, setForm] = useState<FormData>(emptyForm)
  const [deleteTarget, setDeleteTarget] = useState<ProviderResponse | null>(null)

  const { data: providers = [], isLoading } = useQuery({
    queryKey: ['providers'],
    queryFn: listProviders,
  })

  const createMut = useMutation({
    mutationFn: (data: ProviderCreate) => createProvider(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['providers'] })
      closeForm()
    },
  })

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: ProviderUpdate }) => updateProvider(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['providers'] })
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      closeForm()
    },
  })

  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteProvider(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['providers'] })
      setDeleteTarget(null)
    },
  })

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setFormOpen(true)
  }

  const openEdit = (p: ProviderResponse) => {
    setEditing(p)
    setForm({ name: p.name, base_url: p.base_url, model_name: p.model_name, api_key: '' })
    setFormOpen(true)
  }

  const closeForm = () => {
    setFormOpen(false)
    setEditing(null)
    setForm(emptyForm)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editing) {
      const data: ProviderUpdate = {}
      if (form.name !== editing.name) data.name = form.name
      if (form.base_url !== editing.base_url) data.base_url = form.base_url
      if (form.model_name !== editing.model_name) data.model_name = form.model_name
      if (form.api_key) data.api_key = form.api_key
      updateMut.mutate({ id: editing.id, data })
    } else {
      createMut.mutate(form)
    }
  }

  const inputStyle = {
    background: 'var(--bg-body)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius)',
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-body)',
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
          模型管理
        </h2>
        <button
          onClick={openCreate}
          className="px-4 py-2 text-sm font-semibold cursor-pointer transition hover:brightness-110"
          style={{
            background: 'var(--accent-color)',
            color: 'var(--accent-text)',
            borderRadius: 'var(--radius)',
          }}
        >
          添加模型
        </button>
      </div>

      {/* 表格 */}
      {isLoading ? (
        <p style={{ color: 'var(--text-secondary)' }}>加载中...</p>
      ) : providers.length === 0 ? (
        <p style={{ color: 'var(--text-secondary)' }}>暂无模型，点击"添加模型"开始配置</p>
      ) : (
        <div
          className="overflow-x-auto"
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius)',
            boxShadow: 'var(--shadow)',
          }}
        >
          <table className="w-full text-sm" style={{ fontFamily: 'var(--font-body)' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: 'var(--text-primary)' }}>名称</th>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: 'var(--text-primary)' }}>Base URL</th>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: 'var(--text-primary)' }}>模型标识</th>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: 'var(--text-primary)' }}>API Key</th>
                <th className="text-right px-4 py-3 font-semibold" style={{ color: 'var(--text-primary)' }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {providers.map((p) => (
                <tr key={p.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                  <td className="px-4 py-3" style={{ color: 'var(--text-primary)' }}>{p.name}</td>
                  <td className="px-4 py-3" style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{p.base_url}</td>
                  <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{p.model_name}</td>
                  <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{p.api_key_masked}</td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button
                      onClick={() => openEdit(p)}
                      className="px-3 py-1 text-xs cursor-pointer transition hover:brightness-110"
                      style={{
                        background: 'var(--accent-color)',
                        color: 'var(--accent-text)',
                        borderRadius: 'var(--radius)',
                      }}
                    >
                      编辑
                    </button>
                    <button
                      onClick={() => setDeleteTarget(p)}
                      className="px-3 py-1 text-xs cursor-pointer transition hover:brightness-110"
                      style={{
                        background: 'var(--bg-body)',
                        color: 'var(--text-secondary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius)',
                      }}
                    >
                      删除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 新增/编辑弹窗 */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={closeForm} />
          <div
            className="relative w-full max-w-md mx-4"
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius)',
              boxShadow: 'var(--shadow)',
              fontFamily: 'var(--font-body)',
            }}
          >
            <form onSubmit={handleSubmit}>
              <div className="p-6 space-y-4">
                <h3
                  className="text-lg font-semibold"
                  style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}
                >
                  {editing ? '编辑模型' : '添加模型'}
                </h3>

                <div>
                  <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>名称</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-3 py-2 text-sm outline-none"
                    style={inputStyle}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Base URL</label>
                  <input
                    type="text"
                    value={form.base_url}
                    onChange={(e) => setForm({ ...form, base_url: e.target.value })}
                    className="w-full px-3 py-2 text-sm outline-none"
                    style={inputStyle}
                    placeholder="https://api.deepseek.com/v1"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>模型标识</label>
                  <input
                    type="text"
                    value={form.model_name}
                    onChange={(e) => setForm({ ...form, model_name: e.target.value })}
                    className="w-full px-3 py-2 text-sm outline-none"
                    style={inputStyle}
                    placeholder="deepseek-chat"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>
                    API Key {editing && <span style={{ color: 'var(--text-secondary)' }}>(留空则不修改)</span>}
                  </label>
                  <input
                    type="password"
                    value={form.api_key}
                    onChange={(e) => setForm({ ...form, api_key: e.target.value })}
                    className="w-full px-3 py-2 text-sm outline-none"
                    style={inputStyle}
                    required={!editing}
                  />
                </div>
              </div>

              <div
                className="flex justify-end gap-3 px-6 py-4"
                style={{ borderTop: '1px solid var(--border-light)' }}
              >
                <button
                  type="button"
                  onClick={closeForm}
                  className="px-4 py-2 text-sm cursor-pointer transition hover:bg-[var(--border-light)]"
                  style={{
                    background: 'var(--bg-body)',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius)',
                  }}
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-semibold cursor-pointer transition hover:brightness-110"
                  style={{
                    background: 'var(--accent-color)',
                    color: 'var(--accent-text)',
                    borderRadius: 'var(--radius)',
                  }}
                >
                  {editing ? '保存' : '添加'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 删除确认 */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="删除确认"
        content={`确定要删除模型「${deleteTarget?.name}」吗？`}
        onConfirm={() => deleteTarget && deleteMut.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/ModelProviders.tsx
git commit -m "feat: 添加模型管理页面"
```

---

### Task 7: 前端 — 用途配置页面

**Files:**
- Create: `frontend/src/pages/ModelSettings.tsx`

- [ ] **Step 1: 创建 ModelSettings.tsx**

创建 `frontend/src/pages/ModelSettings.tsx`：

```tsx
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  listSettings,
  listProviders,
  createSetting,
  updateSetting,
  deleteSetting,
  type SettingResponse,
  type SettingCreate,
} from '../api/llm'
import ConfirmDialog from '../components/ConfirmDialog'

interface FormData {
  category: string
  provider_id: number
}

export default function ModelSettings() {
  const queryClient = useQueryClient()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<SettingResponse | null>(null)
  const [form, setForm] = useState<FormData>({ category: '', provider_id: 0 })
  const [deleteTarget, setDeleteTarget] = useState<SettingResponse | null>(null)

  const { data: settings = [], isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: listSettings,
  })

  const { data: providers = [] } = useQuery({
    queryKey: ['providers'],
    queryFn: listProviders,
  })

  const createMut = useMutation({
    mutationFn: (data: SettingCreate) => createSetting(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      closeForm()
    },
  })

  const updateMut = useMutation({
    mutationFn: ({ category, provider_id }: { category: string; provider_id: number }) =>
      updateSetting(category, { provider_id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      closeForm()
    },
  })

  const deleteMut = useMutation({
    mutationFn: (category: string) => deleteSetting(category),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      setDeleteTarget(null)
    },
  })

  const openCreate = () => {
    setEditing(null)
    setForm({ category: '', provider_id: providers[0]?.id ?? 0 })
    setFormOpen(true)
  }

  const openEdit = (s: SettingResponse) => {
    setEditing(s)
    setForm({ category: s.category, provider_id: s.provider_id })
    setFormOpen(true)
  }

  const closeForm = () => {
    setFormOpen(false)
    setEditing(null)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editing) {
      updateMut.mutate({ category: editing.category, provider_id: form.provider_id })
    } else {
      createMut.mutate(form)
    }
  }

  const inputStyle = {
    background: 'var(--bg-body)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius)',
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-body)',
  }

  const categoryLabel: Record<string, string> = {
    chat: 'Chat Model',
    embedding: 'Embedding Model',
    default: '默认模型',
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
          用途配置
        </h2>
        <button
          onClick={openCreate}
          className="px-4 py-2 text-sm font-semibold cursor-pointer transition hover:brightness-110"
          style={{
            background: 'var(--accent-color)',
            color: 'var(--accent-text)',
            borderRadius: 'var(--radius)',
          }}
        >
          添加配置
        </button>
      </div>

      {/* 卡片列表 */}
      {isLoading ? (
        <p style={{ color: 'var(--text-secondary)' }}>加载中...</p>
      ) : settings.length === 0 ? (
        <p style={{ color: 'var(--text-secondary)' }}>暂无配置，点击"添加配置"开始设置</p>
      ) : (
        <div className="grid gap-4">
          {settings.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between p-4"
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius)',
                boxShadow: 'var(--shadow)',
              }}
            >
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="px-2 py-0.5 text-xs font-semibold"
                    style={{
                      background: 'var(--accent-color)',
                      color: 'var(--accent-text)',
                      borderRadius: 'var(--radius)',
                    }}
                  >
                    {s.category}
                  </span>
                  <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {categoryLabel[s.category] || s.category}
                  </span>
                </div>
                <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
                  {s.provider.name} — {s.provider.model_name}
                </p>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {s.provider.base_url} | {s.provider.api_key_masked}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => openEdit(s)}
                  className="px-3 py-1 text-xs cursor-pointer transition hover:brightness-110"
                  style={{
                    background: 'var(--accent-color)',
                    color: 'var(--accent-text)',
                    borderRadius: 'var(--radius)',
                  }}
                >
                  切换模型
                </button>
                <button
                  onClick={() => setDeleteTarget(s)}
                  className="px-3 py-1 text-xs cursor-pointer transition hover:brightness-110"
                  style={{
                    background: 'var(--bg-body)',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius)',
                  }}
                >
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 新增/编辑弹窗 */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={closeForm} />
          <div
            className="relative w-full max-w-md mx-4"
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius)',
              boxShadow: 'var(--shadow)',
              fontFamily: 'var(--font-body)',
            }}
          >
            <form onSubmit={handleSubmit}>
              <div className="p-6 space-y-4">
                <h3
                  className="text-lg font-semibold"
                  style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}
                >
                  {editing ? '切换模型' : '添加用途配置'}
                </h3>

                <div>
                  <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>用途类型</label>
                  {editing ? (
                    <input
                      type="text"
                      value={editing.category}
                      className="w-full px-3 py-2 text-sm"
                      style={{ ...inputStyle, opacity: 0.5 }}
                      disabled
                    />
                  ) : (
                    <select
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                      className="w-full px-3 py-2 text-sm outline-none"
                      style={inputStyle}
                      required
                    >
                      <option value="">请选择</option>
                      <option value="chat">chat — Chat Model</option>
                      <option value="embedding">embedding — Embedding Model</option>
                      <option value="default">default — 默认模型</option>
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>选择模型</label>
                  <select
                    value={form.provider_id}
                    onChange={(e) => setForm({ ...form, provider_id: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-sm outline-none"
                    style={inputStyle}
                    required
                  >
                    <option value={0}>请选择模型</option>
                    {providers.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.model_name})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div
                className="flex justify-end gap-3 px-6 py-4"
                style={{ borderTop: '1px solid var(--border-light)' }}
              >
                <button
                  type="button"
                  onClick={closeForm}
                  className="px-4 py-2 text-sm cursor-pointer transition hover:bg-[var(--border-light)]"
                  style={{
                    background: 'var(--bg-body)',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius)',
                  }}
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-semibold cursor-pointer transition hover:brightness-110"
                  style={{
                    background: 'var(--accent-color)',
                    color: 'var(--accent-text)',
                    borderRadius: 'var(--radius)',
                  }}
                >
                  {editing ? '保存' : '添加'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 删除确认 */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="删除确认"
        content={`确定要删除用途「${deleteTarget?.category}」的配置吗？`}
        onConfirm={() => deleteTarget && deleteMut.mutate(deleteTarget.category)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/ModelSettings.tsx
git commit -m "feat: 添加用途配置页面"
```

---

### Task 8: 前端 — 路由 & 导航

**Files:**
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/components/Sidebar.tsx`
- Modify: `frontend/src/components/Layout.tsx`

- [ ] **Step 1: 更新 App.tsx 添加路由**

修改 `frontend/src/App.tsx`，添加两个新页面的导入和路由：

```tsx
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/auth'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import ModelProviders from './pages/ModelProviders'
import ModelSettings from './pages/ModelSettings'

function App() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />}
      />
      <Route
        path="/"
        element={isAuthenticated ? <Layout /> : <Navigate to="/login" replace />}
      >
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="models" element={<ModelProviders />} />
        <Route path="settings" element={<ModelSettings />} />
        <Route path="" element={<Navigate to="/dashboard" replace />} />
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

export default App
```

- [ ] **Step 2: 更新 Sidebar.tsx 添加导航**

修改 `frontend/src/components/Sidebar.tsx`，在 nav 列表中添加两个新链接：

```tsx
import { NavLink } from 'react-router-dom'

export default function Sidebar() {
  return (
    <aside
      className="w-64 flex flex-col fixed h-full left-0 top-0"
      style={{
        background: 'var(--bg-sidebar)',
        borderRight: '1px solid var(--border-color)',
        fontFamily: 'var(--font-display)',
      }}
    >
      <div
        className="h-16 flex items-center px-6"
        style={{ borderBottom: '1px solid var(--border-color)' }}
      >
        <h1 className="text-xl font-bold tracking-wide" style={{ color: 'var(--text-on-dark)' }}>
          CatAgent
        </h1>
      </div>
      <nav className="flex-1 py-4">
        <ul className="space-y-1 px-3">
          <li>
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                `block px-4 py-2.5 text-sm transition ${isActive ? 'font-semibold' : ''}`
              }
              style={({ isActive }) => ({
                borderRadius: 'var(--radius)',
                background: isActive ? 'var(--accent-color)' : 'transparent',
                color: isActive ? 'var(--accent-text)' : 'var(--text-on-dark)',
              })}
            >
              Dashboard
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/models"
              className={({ isActive }) =>
                `block px-4 py-2.5 text-sm transition ${isActive ? 'font-semibold' : ''}`
              }
              style={({ isActive }) => ({
                borderRadius: 'var(--radius)',
                background: isActive ? 'var(--accent-color)' : 'transparent',
                color: isActive ? 'var(--accent-text)' : 'var(--text-on-dark)',
              })}
            >
              模型管理
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/settings"
              className={({ isActive }) =>
                `block px-4 py-2.5 text-sm transition ${isActive ? 'font-semibold' : ''}`
              }
              style={({ isActive }) => ({
                borderRadius: 'var(--radius)',
                background: isActive ? 'var(--accent-color)' : 'transparent',
                color: isActive ? 'var(--accent-text)' : 'var(--text-on-dark)',
              })}
            >
              用途配置
            </NavLink>
          </li>
        </ul>
      </nav>
    </aside>
  )
}
```

- [ ] **Step 3: 更新 Layout.tsx 添加标题映射**

修改 `frontend/src/components/Layout.tsx`，更新 titleMap：

```tsx
const titleMap: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/models': '模型管理',
  '/settings': '用途配置',
}
```

- [ ] **Step 4: 启动前后端验证**

Run backend: `cd backend && uvicorn app.main:app --reload`
Run frontend: `cd frontend && npm run dev`

1. 访问 `http://localhost:5173`，登录后侧边栏应出现 "模型管理" 和 "用途配置"
2. 点击 "模型管理" → 页面显示空状态 "暂无模型"
3. 点击 "添加模型" → 填写表单 → 提交 → 表格中出现记录
4. 点击 "用途配置" → 添加配置 → 选择 category 和 provider → 保存
5. 切换主题，确认页面样式正常

Expected: 所有功能正常工作

- [ ] **Step 5: Commit**

```bash
git add frontend/src/App.tsx frontend/src/components/Sidebar.tsx frontend/src/components/Layout.tsx
git commit -m "feat: 添加模型管理和用途配置的路由与导航"
```