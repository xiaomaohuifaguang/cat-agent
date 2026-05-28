import puremagic

from app.core.config import settings
from app.core.parsers import get_parser


class DocumentService:
    @staticmethod
    def parse_file(file_bytes: bytes, filename: str, content_type: str | None = None) -> dict:
        # 1. 文件大小校验
        if len(file_bytes) > settings.MAX_UPLOAD_SIZE:
            max_mb = settings.MAX_UPLOAD_SIZE // (1024 * 1024)
            raise ValueError(f"文件过大，最大支持 {max_mb}MB")

        if not file_bytes:
            raise ValueError("文件内容为空")

        # 2. 用 puremagic 检测真实 MIME 类型（基于文件头）
        mime_type = puremagic.from_string(file_bytes, mime=True, filename=filename)

        # 3. 查找对应 Parser
        parser = get_parser(mime_type)
        if not parser:
            raise ValueError(f"不支持的文件格式: {mime_type}")

        # 4. 解析全文
        text = parser.parse(file_bytes, filename)
        result: dict = {"text": text}

        # 5. 如果 parser 支持分页/分 Sheet 解析，也返回结构化数据
        if hasattr(parser, "parse_pages"):
            result["pages"] = parser.parse_pages(file_bytes, filename)
        elif hasattr(parser, "parse_sheets"):
            result["sheets"] = parser.parse_sheets(file_bytes, filename)

        return result
