import io

from docx import Document
from docx.oxml.ns import qn
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

    def parse_pages(self, file_bytes: bytes, filename: str) -> list[dict]:
        """按分页符将 DOCX 拆分为多页返回

        Returns:
            每页内容列表，每项包含 page（页码，从1开始）和 text
        """
        if not file_bytes:
            raise ValueError("文件内容为空")

        doc = Document(io.BytesIO(file_bytes))
        pages = []
        current_parts = []
        img_index = 0

        for element in doc.element.body:
            if isinstance(element, CT_P):
                text = self._get_paragraph_text(element)
                has_break = self._has_page_break(element)

                if text:
                    current_parts.append(text)

                if has_break:
                    if current_parts:
                        pages.append({"page": len(pages) + 1, "text": "\n\n".join(current_parts)})
                        current_parts = []

            elif isinstance(element, CT_Tbl):
                md = self._table_to_markdown(element)
                if md:
                    current_parts.append(md)

        # 最后一页
        if current_parts:
            pages.append({"page": len(pages) + 1, "text": "\n\n".join(current_parts)})

        # 图片标记（无精确位置信息，统一放在最后一页）
        for _ in doc.inline_shapes:
            img_index += 1
            img_mark = f"[图{img_index}: 图片暂不支持提取]"
            if pages:
                pages[-1]["text"] += f"\n\n{img_mark}"
            else:
                pages.append({"page": 1, "text": img_mark})

        if not pages:
            raise ValueError("DOCX 内容为空或无法解析")

        return pages

    def _get_paragraph_text(self, p_element) -> str:
        """从 CT_P 元素提取文本"""
        texts = []
        for run in p_element.iter():
            if run.text:
                texts.append(run.text)
        return "".join(texts).strip()

    @staticmethod
    def _has_page_break(p_element) -> bool:
        """检查段落是否包含显式分页符"""
        for br in p_element.iter(qn("w:br")):
            if br.get(qn("w:type")) == "page":
                return True
        # 检查 section property 中的分页类型
        for pPr in p_element.iter(qn("w:pPr")):
            for sectPr in pPr.iter(qn("w:sectPr")):
                for tp in sectPr.iter(qn("w:type")):
                    if tp.get(qn("w:val")) in ("nextPage", "oddPage", "evenPage"):
                        return True
                # 无 type 但有 sectPr 通常也意味着新节/新页
                # 但仅在不是 body 最后一个 sectPr 时才视为分页
                # 这里简化处理：sectPr 存在即视为可能分页
                # 跳过 body 末尾的全局 sectPr（它不是段落内的）
                pass
        return False

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
