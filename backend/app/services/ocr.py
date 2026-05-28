"""
OCR 服务 — 当前为测试桩，后续接入真实 OCR
"""


class OcrService:
    """OCR 文字识别服务"""

    @staticmethod
    def recognize(image_bytes: bytes, filename: str = "") -> str:
        """
        识别图片中的文字

        Args:
            image_bytes: 图片二进制内容
            filename: 原始文件名

        Returns:
            识别出的文字内容
        """
        # TODO: 接入真实 OCR（PaddleOCR / 云 API / GPT-4V）
        return "OCR文字识别（测试）"
