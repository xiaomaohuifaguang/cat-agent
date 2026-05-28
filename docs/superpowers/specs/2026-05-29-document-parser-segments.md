# 文档解析分段返回设计

## 目标

PDF 和 XLSX 解析支持分段返回，前端可在"完整文本"和"分页/分 Sheet"视图间切换。

## 后端设计

### 接口返回格式

```json
{
  "text": "完整合并文本",
  "segments": [
    {"title": "第1页", "content": "..."},
    {"title": "第2页", "content": "..."}
  ]
}
```

- `text`: 所有内容合并后的完整文本（向后兼容）
- `segments`: 分段数组，PDF 为页，XLSX 为 sheet，其他格式为空

### Parser 改造

**BaseParser 新增可选方法：**

```python
class BaseParser(ABC):
    supported_mimes: list[str] = []

    @abstractmethod
    def parse(self, file_bytes: bytes, filename: str) -> str: ...

    def parse_segments(self, file_bytes: bytes, filename: str) -> list[dict]:
        """返回分段内容，默认返回空列表"""
        return []
```

**PdfParser 改造：**
- `parse()` 保持不变（合并文本）
- 新增 `parse_segments()`：每页一个 segment，`title=f"第{i}页"`

**XlsxParser 改造：**
- `parse()` 保持不变（合并文本）
- 新增 `parse_segments()`：每个 sheet 一个 segment，`title=sheet_name`

**DocumentService 改造：**
- 新增 `parse_file_with_segments()` 方法
- 返回 `{"text": str, "segments": list[dict]}`
- 调用 `parser.parse()` 获取完整文本
- 调用 `parser.parse_segments()` 获取分段（不支持分段的 parser 返回空列表）

**API 路由改造：**
- `POST /api/v1/documents/parse` 返回新格式（含 segments）

## 前端设计

### 右侧展示区改造

- 顶部增加切换按钮组："完整文本" / "分页查看"
- "完整文本"：展示 `text`，和当前一致
- "分页查看"：展示 `segments` 列表
  - 每个 segment 一个卡片/折叠面板
  - 标题：`segment.title`
  - 内容：`segment.content`
  - 内容样式和完整文本一致（pre + break-all）
- 非 PDF/XLSX 文件：隐藏切换按钮，只展示完整文本
