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
            text = page.get_text()

            # 判断提取的文字是否有效（不是全是乱码）
            if text and self._is_valid_text(text):
                parts.append(text)
            else:
                # Fallback: 页面转图片 OCR
                img_index += 1
                pix = page.get_pixmap(dpi=200)
                img_bytes = pix.tobytes("png")
                ocr_text = OcrService.recognize(img_bytes, filename)
                parts.append(f"[图{img_index}: {ocr_text}]")

        doc.close()

        if not parts:
            raise ValueError("PDF 内容为空或无法解析")

        return "\n\n".join(parts)

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
