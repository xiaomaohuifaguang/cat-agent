# 文档解析功能设计

## 目标

实现文件上传解析功能，用户上传文件后解析为纯文本展示。首版支持 txt 文件，通过 MIME 类型判断文件格式，自动检测编码。

## 架构

```
后端:
  api/v1/documents.py    — 路由（接收上传、调用 Parser、返回结果）
  core/parsers/          — 解析器抽象层
    __init__.py
    base.py              — BaseParser 接口
    txt.py               — TxtParser（chardet 编码检测）
  core/config.py         — 新增 MAX_UPLOAD_SIZE 配置

前端:
  pages/FileParser.tsx   — 文件解析页面
  api/documents.ts       — 上传 API
```

## 后端设计

### Parser 抽象层

**BaseParser 接口：**

```python
class BaseParser:
    supported_mimes: list[str]
    def parse(self, file_bytes: bytes, filename: str) -> str: ...
```

**TxtParser：**
- 用 `python-magic` 检测 MIME type（文件头，不依赖后缀）
- 用 `chardet` 检测编码
- 解码为字符串返回
- 编码检测失败时，先尝试 UTF-8 兜底，再尝试 GBK，都失败则抛出异常

### API 路由

`POST /api/v1/documents/parse`
- Content-Type: `multipart/form-data`
- 参数: `file` (二进制文件)
- 返回: `{"code": 0, "message": "success", "data": {"text": "解析后的文本"}}`

**处理流程：**
1. 校验文件大小 ≤ `MAX_UPLOAD_SIZE`（默认 500MB，单位字节）
2. 用 `python-magic` 检测 MIME type
3. 根据 MIME 查找对应的 Parser
4. 调用 Parser.parse() 获取文本
5. 返回文本

### 配置项

在 `app/core/config.py` 新增：
```python
MAX_UPLOAD_SIZE: int = int(os.getenv("MAX_UPLOAD_SIZE", "524288000"))  # 500MB
```

### 错误码

| HTTP 状态 | 错误信息 |
|-----------|----------|
| 413 | 文件过大 |
| 415 | 不支持的文件格式 |
| 400 | 编码检测失败 / 空文件 |

## 前端设计

### 页面布局

- 左侧 40%：上传区域
  - 支持拖拽和点击选择文件
  - 显示文件名、MIME 类型、文件大小
  - "解析"按钮（未选择文件时禁用）
- 右侧 60%：文本展示区域
  - 未解析时显示占位提示
  - 解析中显示 loading 动画
  - 解析完成显示文本 + "复制全文"按钮

### 交互流程

1. 用户选择/拖拽文件 → 浏览器 File API 获取 MIME 和大小
2. 文件大小超过 500MB → 前端直接拦截，Toast 提示
3. 点击解析 → 调 `POST /api/v1/documents/parse`
4. 右侧展示返回的文本

### 路由 & 导航

- 新增路由 `/parser`
- Sidebar 在"模型配置"下方新增"文件解析"入口

## 新增依赖

- 后端: `python-magic==0.4.27`, `chardet==5.2.0`
- 前端: 无

## 扩展预留

后续添加 PDF、Word 等格式时：
1. 在 `core/parsers/` 新增 `pdf.py`、`docx.py`
2. 实现 `BaseParser` 接口
3. 注册到 Parser 工厂
4. 前端无需改动（MIME 自动识别）