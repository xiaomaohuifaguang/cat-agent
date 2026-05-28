from app.core.parsers.base import BaseParser
from app.core.parsers.docx import DocxParser
from app.core.parsers.image import ImageParser
from app.core.parsers.pdf import PdfParser
from app.core.parsers.txt import TxtParser
from app.core.parsers.xlsx import XlsxParser

# MIME -> Parser 映射表
PARSER_REGISTRY: dict[str, type[BaseParser]] = {}


def _register_parser(parser_cls: type[BaseParser]):
    for mime in parser_cls.supported_mimes:
        PARSER_REGISTRY[mime] = parser_cls
    return parser_cls


# 注册所有解析器
_register_parser(TxtParser)
_register_parser(ImageParser)
_register_parser(PdfParser)
_register_parser(DocxParser)
_register_parser(XlsxParser)


def get_parser(mime_type: str) -> BaseParser | None:
    """根据 MIME 类型获取对应的解析器实例"""
    parser_cls = PARSER_REGISTRY.get(mime_type)
    if parser_cls:
        return parser_cls()
    return None


__all__ = ["BaseParser", "TxtParser", "get_parser", "PARSER_REGISTRY"]
