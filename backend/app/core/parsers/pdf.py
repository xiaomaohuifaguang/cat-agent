from pypdf import PdfReader

from app.core.parsers.base import BaseParser
from app.services.ocr import OcrService


class PdfParser(BaseParser):
    supported_mimes = ["application/pdf"]

    def parse(self, file_bytes: bytes, filename: str) -> str:
        if not file_bytes:
            raise ValueError("文件内容为空")

        reader = PdfReader(file_bytes)
        parts = []
        img_index = 0

        for page in reader.pages:
            # 提取文字
            text = page.extract_text()
            if text:
                parts.append(text)

            # 提取图片并 OCR
            if "/Resources" in page:
                resources = page["/Resources"]
                if "/XObject" in resources:
                    xobjects = resources["/XObject"]
                    for name in xobjects:
                        obj = xobjects[name]
                        try:
                            obj = obj.get_object() if hasattr(obj, "get_object") else obj
                            if obj.get("/Subtype") == "/Image":
                                img_index += 1
                                img_data = obj.get_data() if hasattr(obj, "get_data") else obj.data
                                ocr_text = OcrService.recognize(img_data, filename)
                                parts.append(f"[图{img_index}: {ocr_text}]")
                        except Exception:
                            continue

        if not parts:
            raise ValueError("PDF 内容为空或无法解析")

        return "\n\n".join(parts)
