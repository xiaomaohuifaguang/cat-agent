from abc import ABC, abstractmethod


class BaseParser(ABC):
    """文件解析器基类"""

    supported_mimes: list[str] = []

    @abstractmethod
    def parse(self, file_bytes: bytes, filename: str) -> str:
        """将文件字节解析为文本

        Args:
            file_bytes: 文件二进制内容
            filename: 原始文件名

        Returns:
            解析后的文本内容
        """
        ...
