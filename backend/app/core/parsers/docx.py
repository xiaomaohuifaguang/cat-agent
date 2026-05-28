from docx import Document
from docx.table import Table

from app.core.parsers.base import BaseParser
from app.services.ocr import OcrService


class DocxParser(BaseParser):
    supported_mimes = [
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ]

    def parse(self, file_bytes: bytes, filename: str) -> str:
        if not file_bytes:
            raise ValueError("文件内容为空")

        doc = Document(file_bytes)
        parts = []
        img_index = 0

        for block in doc.inline_shapes:
            img_index += 1
            # python-docx 不直接提供图片二进制，跳过或标记
            parts.append(f"[图{img_index}: 图片暂不支持提取]")

        for element in doc.element.body:
            if element.tag.endswith("p"):
                para_text = element.text_content().strip()
                if para_text:
                    parts.append(para_text)
            elif element.tag.endswith("tbl"):
                table = Table(element, doc)
                parts.append(self._table_to_markdown(table))

        if not parts:
            raise ValueError("DOCX 内容为空或无法解析")

        return "\n\n".join(parts)

    def _table_to_markdown(self, table: Table) -> str:
        rows = []
        for row in table.rows:
            cells = [cell.text.replace("|", "\\|").replace("\n", " ") for cell in row.cells]
            rows.append(cells)

        if not rows:
            return ""

        md_lines = []
        md_lines.append("| " + " | ".join(rows[0]) + " |")
        md_lines.append("| " + " | ".join(["---"] * len(rows[0])) + " |")
        for row in rows[1:]:
            md_lines.append("| " + " | ".join(row) + " |")

        return "\n".join(md_lines)
