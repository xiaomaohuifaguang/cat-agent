import io

from docx import Document
from docx.oxml.table import CT_Tbl
from docx.oxml.text.paragraph import CT_P

from app.core.parsers.base import BaseParser


class DocxParser(BaseParser):
    supported_mimes = [
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ]

    def parse(self, file_bytes: bytes, filename: str) -> str:
        if not file_bytes:
            raise ValueError("文件内容为空")

        doc = Document(io.BytesIO(file_bytes))
        parts = []
        img_index = 0

        # 遍历 body 子元素保持顺序
        for element in doc.element.body:
            if isinstance(element, CT_P):
                text = self._get_paragraph_text(element)
                if text:
                    parts.append(text)
            elif isinstance(element, CT_Tbl):
                md = self._table_to_markdown(element)
                if md:
                    parts.append(md)

        # 图片标记
        for _ in doc.inline_shapes:
            img_index += 1
            parts.append(f"[图{img_index}: 图片暂不支持提取]")

        if not parts:
            raise ValueError("DOCX 内容为空或无法解析")

        return "\n\n".join(parts)

    def _get_paragraph_text(self, p_element) -> str:
        """从 CT_P 元素提取文本"""
        texts = []
        for run in p_element.iter():
            if run.text:
                texts.append(run.text)
        return "".join(texts).strip()

    def _table_to_markdown(self, tbl_element) -> str:
        """将 CT_Tbl 转为 Markdown 表格"""
        rows = []
        for tr in tbl_element.iter():
            if tr.tag.endswith("tr"):
                cells = []
                for tc in tr.iter():
                    if tc.tag.endswith("tc"):
                        cell_texts = []
                        for node in tc.iter():
                            if node.text:
                                cell_texts.append(node.text)
                        text = "".join(cell_texts).strip().replace("|", "\\|").replace("\n", " ")
                        cells.append(text)
                if cells:
                    rows.append(cells)

        if not rows:
            return ""

        max_cols = max(len(r) for r in rows)
        for r in rows:
            while len(r) < max_cols:
                r.append("")

        lines = []
        lines.append("| " + " | ".join(rows[0]) + " |")
        lines.append("| " + " | ".join(["---"] * max_cols) + " |")
        for row in rows[1:]:
            lines.append("| " + " | ".join(row) + " |")

        return "\n".join(lines)
