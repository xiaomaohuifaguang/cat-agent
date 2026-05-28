# 文档解析功能 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现文件上传解析功能，首版支持 txt 文件，左侧上传右侧展示解析结果。

**Architecture:** 后端采用 Service + Parser 抽象层结构，路由层只处理 HTTP；前端左右分栏布局，支持拖拽上传。

**Tech Stack:** FastAPI, python-magic, chardet, React 18, TypeScript, Tailwind CSS, Axios

---

## File Structure

### Backend — New Files
- `backend/app/core/parsers/__init__.py` — 导出 Parser 注册表
- `backend/app/core/parsers/base.py` — BaseParser 抽象类
- `backend/app/core/parsers/txt.py` — TxtParser 实现
- `backend/app/services/documents.py` — DocumentService 业务逻辑
- `backend/app/api/v1/documents.py` — 文件解析路由

### Backend — Modified Files
- `backend/app/core/config.py` — 添加 MAX_UPLOAD_SIZE
- `backend/app/api/v1/__init__.py` — 注册 documents router
- `backend/requirements.txt` — 添加 python-magic, chardet

### Frontend — New Files
- `frontend/src/api/documents.ts` — 文件上传 API
- `frontend/src/pages/FileParser.tsx` — 文件解析页面

### Frontend — Modified Files
- `frontend/src/App.tsx` — 添加 /parser 路由
- `frontend/src/components/Sidebar.tsx` — 添加"文件解析"导航
- `frontend/src/components/Layout.tsx` — 添加标题映射

---

### Task 1: 安装依赖 + 配置

**Files:**
- Modify: `backend/requirements.txt`
- Modify: `backend/app/core/config.py`

- [ ] **Step 1: 添加依赖到 requirements.txt**

在 `backend/requirements.txt` 末尾添加：
```
python-magic==0.4.27
chardet==5.2.0
```

- [ ] **Step 2: 安装依赖**

Run: `cd backend && pip install python-magic==0.4.27 chardet==5.2.0`
Expected: 安装成功

- [ ] **Step 3: 添加 MAX_UPLOAD_SIZE 到 config.py**

在 `backend/app/core/config.py` 的 `ENCRYPTION_KEY` 之后添加：

```python
    # 文件上传配置
    MAX_UPLOAD_SIZE: int = int(os.getenv("MAX_UPLOAD_SIZE", "524288000"))  # 500MB
```

- [ ] **Step 4: Commit**

```bash
git add backend/requirements.txt backend/app/core/config.py
git commit -m "feat: 添加文档解析依赖及上传大小配置"
```

---

### Task 2: Parser 抽象层

**Files:**
- Create: `backend/app/core/parsers/base.py`
- Create: `backend/app/core/parsers/__init__.py`

- [ ] **Step 1: 创建 base.py**

创建 `backend/app/core/parsers/base.py`：

```python
from abc import ABC, abstractmethod


class BaseParser(ABC):
    """文件解析器基类"""

    supported_mimes: list[str] = []

    @abstractmethod
    def parse(self, file_bytes: bytes, filename: str) -> str:
        """将文件字节解析为文本

        Args:
            file_bytes: 文件二进制内容
            filename: 原始文件名

        Returns:
            解析后的文本内容
        """
        ...
```

- [ ] **Step 2: 创建 __init__.py**

创建 `backend/app/core/parsers/__init__.py`：

```python
from app.core.parsers.base import BaseParser
from app.core.parsers.txt import TxtParser

# MIME -> Parser 映射表
PARSER_REGISTRY: dict[str, type[BaseParser]] = {}


def _register_parser(parser_cls: type[BaseParser]):
    for mime in parser_cls.supported_mimes:
        PARSER_REGISTRY[mime] = parser_cls
    return parser_cls


# 注册所有解析器
_register_parser(TxtParser)


def get_parser(mime_type: str) -> BaseParser | None:
    """根据 MIME 类型获取对应的解析器实例"""
    parser_cls = PARSER_REGISTRY.get(mime_type)
    if parser_cls:
        return parser_cls()
    return None


__all__ = ["BaseParser", "TxtParser", "get_parser", "PARSER_REGISTRY"]
```

- [ ] **Step 3: Commit**

```bash
git add backend/app/core/parsers/
git commit -m "feat: 添加 Parser 抽象层及注册机制"
```

---

### Task 3: TxtParser 实现

**Files:**
- Create: `backend/app/core/parsers/txt.py`

- [ ] **Step 1: 创建 txt.py**

创建 `backend/app/core/parsers/txt.py`：

```python
import chardet

from app.core.parsers.base import BaseParser


class TxtParser(BaseParser):
    supported_mimes = ["text/plain"]

    def parse(self, file_bytes: bytes, filename: str) -> str:
        if not file_bytes:
            raise ValueError("文件内容为空")

        # 检测编码
        detected = chardet.detect(file_bytes)
        encoding = detected.get("encoding") or "utf-8"
        confidence = detected.get("confidence", 0)

        # 高置信度直接用，低置信度尝试 UTF-8 兜底
        if confidence and confidence > 0.7:
            return file_bytes.decode(encoding, errors="replace")

        # 低置信度：依次尝试 UTF-8、GBK、GB2312
        for enc in ("utf-8", "gbk", "gb2312"):
            try:
                return file_bytes.decode(enc)
            except UnicodeDecodeError:
                continue

        # 全部失败，用 UTF-8 强制解码（替换非法字符）
        return file_bytes.decode("utf-8", errors="replace")
```

- [ ] **Step 2: 验证 TxtParser**

Run: `cd backend && python -c "from app.core.parsers import TxtParser; p = TxtParser(); print(p.parse(b'hello world', 'test.txt'))"`
Expected: 输出 "hello world"

Run: `cd backend && python -c "from app.core.parsers import TxtParser; p = TxtParser(); print(p.parse('中文测试'.encode('gbk'), 'test.txt'))"`
Expected: 输出 "中文测试"

- [ ] **Step 3: Commit**

```bash
git add backend/app/core/parsers/txt.py
git commit -m "feat: 添加 TxtParser，支持编码自动检测"
```

---

### Task 4: DocumentService

**Files:**
- Create: `backend/app/services/documents.py`

- [ ] **Step 1: 创建 documents.py**

创建 `backend/app/services/documents.py`：

```python
import magic

from app.core.config import settings
from app.core.parsers import get_parser


class DocumentService:
    @staticmethod
    def parse_file(file_bytes: bytes, filename: str, content_type: str | None = None) -> str:
        # 1. 文件大小校验
        if len(file_bytes) > settings.MAX_UPLOAD_SIZE:
            max_mb = settings.MAX_UPLOAD_SIZE // (1024 * 1024)
            raise ValueError(f"文件过大，最大支持 {max_mb}MB")

        if not file_bytes:
            raise ValueError("文件内容为空")

        # 2. 用 python-magic 检测真实 MIME 类型（基于文件头）
        mime_type = magic.from_buffer(file_bytes, mime=True)

        # 3. 查找对应 Parser
        parser = get_parser(mime_type)
        if not parser:
            raise ValueError(f"不支持的文件格式: {mime_type}")

        # 4. 解析
        return parser.parse(file_bytes, filename)
```

- [ ] **Step 2: 验证 Service**

Run: `cd backend && python -c "
from app.services.documents import DocumentService
text = DocumentService.parse_file(b'hello world', 'test.txt')
print(text)
"`
Expected: 输出 "hello world"

- [ ] **Step 3: Commit**

```bash
git add backend/app/services/documents.py
git commit -m "feat: 添加 DocumentService"
```

---

### Task 5: API 路由

**Files:**
- Create: `backend/app/api/v1/documents.py`
- Modify: `backend/app/api/v1/__init__.py`

- [ ] **Step 1: 创建 documents.py**

创建 `backend/app/api/v1/documents.py`：

```python
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from app.api.deps import get_current_user
from app.core.response import error, success
from app.services.documents import DocumentService

router = APIRouter(tags=["文档解析"], dependencies=[Depends(get_current_user)])


@router.post("/parse")
def parse_document(file: UploadFile = File(...)):
    try:
        file_bytes = file.file.read()
        text = DocumentService.parse_file(
            file_bytes=file_bytes,
            filename=file.filename or "unknown",
            content_type=file.content_type,
        )
        return success(data={"text": text}, message="解析成功")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=error(400, str(e)))
    except Exception:
        raise HTTPException(status_code=500, detail=error(500, "解析失败，请稍后重试"))
```

- [ ] **Step 2: 注册路由**

修改 `backend/app/api/v1/__init__.py`：

```python
from fastapi import APIRouter

from app.api.v1 import auth, documents, llm, system

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(auth.router, prefix="/auth")
api_router.include_router(system.router, prefix="/system")
api_router.include_router(llm.router, prefix="/llm")
api_router.include_router(documents.router, prefix="/documents")
```

- [ ] **Step 3: 验证接口**

Run: `cd backend && python -c "from app.main import app; print('OK')"`
Expected: 输出 "OK"

启动后访问 `http://127.0.0.1:8000/docs`，确认 "文档解析" 分组下有 `POST /api/v1/documents/parse`

- [ ] **Step 4: Commit**

```bash
git add backend/app/api/v1/documents.py backend/app/api/v1/__init__.py
git commit -m "feat: 添加文档解析 API 路由"
```

---

### Task 6: 前端 API 层

**Files:**
- Create: `frontend/src/api/documents.ts`

- [ ] **Step 1: 创建 documents.ts**

创建 `frontend/src/api/documents.ts`：

```typescript
import { apiClient } from './client'

export interface ParseResponse {
  text: string
}

export async function parseDocument(file: File) {
  const formData = new FormData()
  formData.append('file', file)
  const res = await apiClient.post('/api/v1/documents/parse', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  return res.data.data as ParseResponse
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/api/documents.ts
git commit -m "feat: 添加文档解析前端 API 层"
```

---

### Task 7: 前端页面

**Files:**
- Create: `frontend/src/pages/FileParser.tsx`

- [ ] **Step 1: 创建 FileParser.tsx**

创建 `frontend/src/pages/FileParser.tsx`：

```tsx
import { useState, useCallback } from 'react'
import { useMutation } from '@tanstack/react-query'
import { parseDocument } from '../api/documents'
import { useToastStore } from '../store/toast'

const MAX_SIZE_MB = 500
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024

export default function FileParser() {
  const addToast = useToastStore((s) => s.addToast)
  const [file, setFile] = useState<File | null>(null)
  const [text, setText] = useState('')

  const parseMut = useMutation({
    mutationFn: parseDocument,
    onSuccess: (data) => {
      setText(data.text)
      addToast('success', '解析成功')
    },
    onError: (err: any) => {
      addToast('error', err.response?.data?.message || '解析失败')
    },
  })

  const handleFile = useCallback((selected: File) => {
    if (selected.size > MAX_SIZE_BYTES) {
      addToast('error', `文件过大，最大支持 ${MAX_SIZE_MB}MB`)
      return
    }
    setFile(selected)
    setText('')
  }, [addToast])

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const dropped = e.dataTransfer.files[0]
      if (dropped) handleFile(dropped)
    },
    [handleFile]
  )

  const onFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = e.target.files?.[0]
      if (selected) handleFile(selected)
    },
    [handleFile]
  )

  const onParse = () => {
    if (file) parseMut.mutate(file)
  }

  const boxStyle = {
    background: 'var(--bg-surface)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius)',
    boxShadow: 'var(--shadow)',
  }

  return (
    <div className="flex gap-6 h-full" style={{ minHeight: 'calc(100vh - 200px)' }}>
      {/* 左侧上传区 */}
      <div className="w-2/5 flex flex-col gap-4">
        <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
          文件解析
        </h2>

        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          className="flex flex-col items-center justify-center p-8 text-center cursor-pointer transition"
          style={{
            ...boxStyle,
            borderStyle: 'dashed',
            background: 'var(--bg-body)',
          }}
          onClick={() => document.getElementById('file-input')?.click()}
        >
          <input
            id="file-input"
            type="file"
            className="hidden"
            onChange={onFileChange}
            accept=".txt"
          />
          <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
            拖拽文件到此处，或点击上传
          </p>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            支持 .txt 文件，最大 {MAX_SIZE_MB}MB
          </p>
        </div>

        {file && (
          <div className="p-4" style={boxStyle}>
            <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
              {file.name}
            </p>
            <p className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>
              {(file.size / 1024).toFixed(1)} KB | {file.type || '未知类型'}
            </p>
            <button
              onClick={onParse}
              disabled={parseMut.isPending}
              className="w-full px-4 py-2 text-sm font-semibold cursor-pointer transition hover:brightness-110 disabled:opacity-50"
              style={{
                background: 'var(--accent-color)',
                color: 'var(--accent-text)',
                borderRadius: 'var(--radius)',
              }}
            >
              {parseMut.isPending ? '解析中...' : '开始解析'}
            </button>
          </div>
        )}
      </div>

      {/* 右侧展示区 */}
      <div className="w-3/5 flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
            解析结果
          </h3>
          {text && (
            <button
              onClick={() => {
                navigator.clipboard.writeText(text)
                addToast('success', '已复制到剪贴板')
              }}
              className="px-3 py-1 text-xs cursor-pointer transition hover:brightness-110"
              style={{
                background: 'var(--bg-body)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius)',
              }}
            >
              复制全文
            </button>
          )}
        </div>

        <div
          className="flex-1 p-4 overflow-auto"
          style={{
            ...boxStyle,
            background: 'var(--bg-body)',
          }}
        >
          {parseMut.isPending ? (
            <p style={{ color: 'var(--text-secondary)' }}>解析中...</p>
          ) : text ? (
            <pre
              className="whitespace-pre-wrap text-sm"
              style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-body)' }}
            >
              {text}
            </pre>
          ) : (
            <p style={{ color: 'var(--text-secondary)' }}>上传文件后点击解析，结果将显示在此处</p>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/FileParser.tsx
git commit -m "feat: 添加文件解析页面"
```

---

### Task 8: 路由和导航

**Files:**
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/components/Sidebar.tsx`
- Modify: `frontend/src/components/Layout.tsx`

- [ ] **Step 1: 更新 App.tsx**

修改 `frontend/src/App.tsx`，添加导入和路由：

```tsx
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/auth'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import ModelProviders from './pages/ModelProviders'
import ModelSettings from './pages/ModelSettings'
import FileParser from './pages/FileParser'

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
        <Route path="parser" element={<FileParser />} />
        <Route path="" element={<Navigate to="/dashboard" replace />} />
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

export default App
```

- [ ] **Step 2: 更新 Sidebar.tsx**

在 `frontend/src/components/Sidebar.tsx` 的模型配置 `</li>` 之后添加文件解析链接：

```tsx
          <li>
            <NavLink
              to="/parser"
              className={({ isActive }) =>
                `block px-4 py-2.5 text-sm transition ${isActive ? 'font-semibold' : ''}`
              }
              style={({ isActive }) => ({
                borderRadius: 'var(--radius)',
                background: isActive ? 'var(--accent-color)' : 'transparent',
                color: isActive ? 'var(--accent-text)' : 'var(--text-on-dark)',
              })}
            >
              文件解析
            </NavLink>
          </li>
```

- [ ] **Step 3: 更新 Layout.tsx**

修改 `frontend/src/components/Layout.tsx` 的 titleMap：

```tsx
const titleMap: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/models': '模型管理',
  '/settings': '用途配置',
  '/parser': '文件解析',
}
```

- [ ] **Step 4: 启动验证**

Run backend: `cd backend && uvicorn app.main:app --reload`
Run frontend: `cd frontend && npm run dev`

验证：
1. 登录后侧边栏出现"文件解析"
2. 点击进入页面，左侧上传区域正常显示
3. 上传一个 txt 文件，显示文件名和大小
4. 点击"开始解析"，右侧显示文件内容
5. 点击"复制全文"，Toast 提示成功
6. 上传超过 500MB 的文件，前端拦截并提示

- [ ] **Step 5: Commit**

```bash
git add frontend/src/App.tsx frontend/src/components/Sidebar.tsx frontend/src/components/Layout.tsx
git commit -m "feat: 添加文件解析路由与导航"
```

---

## Self-Review

**1. Spec coverage:**
- 后端 Parser 抽象层 ✓ (Task 2)
- TxtParser 编码检测 ✓ (Task 3)
- DocumentService 业务逻辑 ✓ (Task 4)
- API 路由 + 大小校验 ✓ (Task 5)
- 前端上传页面 ✓ (Task 7)
- 路由导航 ✓ (Task 8)
- MIME 类型检测 ✓ (Task 4, python-magic)
- 500MB 可配置 ✓ (Task 1, config)

**2. Placeholder scan:** 无 TBD/TODO，所有步骤含完整代码。

**3. Type consistency:**
- `DocumentService.parse_file` 签名在 Task 4 和 Task 5 中一致
- `ParseResponse` 接口在 Task 6 和 Task 7 中一致
- `MAX_UPLOAD_SIZE` 在 config 和前端常量中一致（500MB）

无问题，计划完成。