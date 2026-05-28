import io
import re

import fitz

from app.core.parsers.base import BaseParser
from app.services.ocr import OcrService


class PdfParser(BaseParser):
    supported_mimes = ["application/pdf"]

    def parse(self, file_bytes: bytes, filename: str) -> str:
        if not file_bytes:
            raise ValueError("文件内容为空")

        doc = fitz.open(stream=file_bytes, filetype="pdf")
        parts = []
        img_index = 0

        for page in doc:
            page_text, img_index = self._extract_page_text(page, filename, img_index)
            parts.append(page_text)

        doc.close()

        if not parts:
            raise ValueError("PDF 内容为空或无法解析")

        return "\n\n".join(parts)

    def parse_pages(self, file_bytes: bytes, filename: str) -> list[dict]:
        """将文件字节按页解析为文本

        Returns:
            每页解析后的文本内容列表，每项包含 page（页码，从1开始）和 text
        """
        if not file_bytes:
            raise ValueError("文件内容为空")

        doc = fitz.open(stream=file_bytes, filetype="pdf")
        pages = []
        img_index = 0

        for page_num, page in enumerate(doc, start=1):
            page_text, img_index = self._extract_page_text(page, filename, img_index)
            pages.append({"page": page_num, "text": page_text})

        doc.close()

        if not pages:
            raise ValueError("PDF 内容为空或无法解析")

        return pages

    def _extract_page_text(self, page, filename: str, img_index: int) -> tuple[str, int]:
        """提取单页文本，表格自动转为 markdown 格式

        Returns:
            (page_text, updated_img_index)
        """
        text = page.get_text()

        # 判断提取的文字是否有效（不是全是乱码）
        if text and self._is_valid_text(text):
            # 尝试提取表格并转为 markdown
            page_text = self._page_to_text_with_tables(page)
            return page_text, img_index

        # Fallback: 页面转图片 OCR
        img_index += 1
        pix = page.get_pixmap(dpi=200)
        img_bytes = pix.tobytes("png")
        ocr_text = OcrService.recognize(img_bytes, filename)
        return f"[图{img_index}: {ocr_text}]", img_index

    def _page_to_text_with_tables(self, page) -> str:
        """提取页面文本，将检测到的表格转为 markdown 格式"""
        tables_data = self._extract_page_tables(page)
        if not tables_data:
            return page.get_text()

        table_bboxes = [t[0] for t in tables_data]
        text_blocks = self._get_non_table_text_blocks(page, table_bboxes)

        # 合并文本块和表格，按 y 坐标排序
        elements: list[tuple[float, str, str]] = []
        for y, txt in text_blocks:
            elements.append((y, "text", txt))
        for bbox, md in tables_data:
            elements.append((bbox[1], "table", md))

        elements.sort(key=lambda x: x[0])

        return "\n\n".join(item[2] for item in elements)

    def _extract_page_tables(self, page) -> list[tuple]:
        """从页面提取表格，返回 [(bbox, markdown), ...]"""
        try:
            tables = page.find_tables()
        except Exception:
            return []

        result = []
        for table in tables.tables:
            rows = table.extract()
            if not rows:
                continue
            md = self._table_rows_to_markdown(rows)
            if md:
                result.append((table.bbox, md))
        return result

    @staticmethod
    def _table_rows_to_markdown(rows: list) -> str:
        """将表格行数据转为 markdown 表格"""
        if not rows:
            return ""

        # 过滤全空行并补齐列数
        max_cols = max(len(row) for row in rows)
        filtered = []
        for row in rows:
            if any(cell is not None and str(cell).strip() for cell in row):
                cells = []
                for cell in row:
                    text = "" if cell is None else str(cell).strip()
                    text = text.replace("|", "\\|").replace("\n", " ")
                    cells.append(text)
                while len(cells) < max_cols:
                    cells.append("")
                filtered.append(cells)

        if not filtered:
            return ""

        lines = []
        for i, cells in enumerate(filtered):
            lines.append("| " + " | ".join(cells) + " |")
            if i == 0:
                lines.append("| " + " | ".join(["---"] * max_cols) + " |")

        return "\n".join(lines)

    @staticmethod
    def _get_non_table_text_blocks(page, table_bboxes: list) -> list[tuple[float, str]]:
        """获取页面中不属于表格区域的文本块，返回 [(y, text), ...]"""
        blocks = page.get_text("blocks")
        result = []
        for block in blocks:
            x0, y0, x1, y1, text, *_ = block
            bbox = (x0, y0, x1, y1)
            if not text.strip():
                continue
            # 检查是否在表格区域内
            in_table = False
            for tb in table_bboxes:
                if PdfParser._bbox_overlap(bbox, tb):
                    in_table = True
                    break
            if not in_table:
                result.append((y0, text.strip()))
        return result

    @staticmethod
    def _bbox_overlap(bbox1: tuple, bbox2: tuple) -> bool:
        """判断两个 bbox 是否重叠"""
        x0_1, y0_1, x1_1, y1_1 = bbox1
        x0_2, y0_2, x1_2, y1_2 = bbox2
        return not (x1_1 < x0_2 or x1_2 < x0_1 or y1_1 < y0_2 or y1_2 < y0_1)

    @staticmethod
    def _is_valid_text(text: str) -> bool:
        """判断提取的文字是否有效（不是全是乱码）"""
        if not text.strip():
            return False
        # 统计正常字符比例
        total = len(text)
        if total == 0:
            return False
        # 乱码通常是 U+FFFD 或大量控制字符
        valid_chars = len(re.sub(r"[�\x00-\x08\x0b\x0c\x0e-\x1f]", "", text))
        return valid_chars / total > 0.8
