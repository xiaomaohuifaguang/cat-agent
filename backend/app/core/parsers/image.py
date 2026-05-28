from app.core.parsers.base import BaseParser
from app.services.ocr import OcrService


class ImageParser(BaseParser):
    supported_mimes = [
        "image/png",
        "image/jpeg",
        "image/jpg",
        "image/gif",
        "image/webp",
        "image/bmp",
    ]

    def parse(self, file_bytes: bytes, filename: str) -> str:
        if not file_bytes:
            raise ValueError("文件内容为空")
        return OcrService.recognize(file_bytes, filename)
