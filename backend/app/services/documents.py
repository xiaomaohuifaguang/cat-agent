import puremagic

from app.core.config import settings
from app.core.parsers import get_parser


class DocumentService:
    @staticmethod
    def parse_file(file_bytes: bytes, filename: str, content_type: str | None = None) -> str:
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

        # 4. 解析
        return parser.parse(file_bytes, filename)
