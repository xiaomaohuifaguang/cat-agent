import io

from pypdf import PdfReader

from app.core.parsers.base import BaseParser
from app.services.ocr import OcrService


class PdfParser(BaseParser):
    supported_mimes = ["application/pdf"]

    def parse(self, file_bytes: bytes, filename: str) -> str:
        if not file_bytes:
            raise ValueError("文件内容为空")

        reader = PdfReader(io.BytesIO(file_bytes))
        parts = []
        img_index = 0

        for page in reader.pages:
            # 提取文字
            text = page.extract_text()
            if text:
                parts.append(text)

            # 提取图片并 OCR（简化版）
            try:
                if "/Resources" in page:
                    resources = page["/Resources"]
                    if "/XObject" in resources:
                        xobjects = resources["/XObject"]
                        for name in xobjects:
                            try:
                                obj = xobjects[name]
                                if hasattr(obj, "get_object"):
                                    obj = obj.get_object()
                                subtype = obj.get("/Subtype")
                                if subtype == "/Image":
                                    img_index += 1
                                    try:
                                        img_data = obj.get_data()
                                    except Exception:
                                        continue
                                    ocr_text = OcrService.recognize(img_data, filename)
                                    parts.append(f"[图{img_index}: {ocr_text}]")
                            except Exception:
                                continue
            except Exception:
                pass

        if not parts:
            raise ValueError("PDF 内容为空或无法解析")

        return "\n\n".join(parts)
