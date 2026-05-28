import chardet

from app.core.parsers.base import BaseParser


class TxtParser(BaseParser):
    supported_mimes = ["text/plain"]

    def parse(self, file_bytes: bytes, filename: str) -> str:
        if not file_bytes:
            raise ValueError("文件内容为空")

        # 检测编码
        detected = chardet.detect(file_bytes)
        encoding = detected.get("encoding") or "utf-8"
        confidence = detected.get("confidence", 0)

        # 高置信度直接用，低置信度尝试 UTF-8 兜底
        if confidence and confidence > 0.7:
            return file_bytes.decode(encoding, errors="replace")

        # 低置信度：依次尝试 UTF-8、GBK、GB2312
        for enc in ("utf-8", "gbk", "gb2312"):
            try:
                return file_bytes.decode(enc)
            except UnicodeDecodeError:
                continue

        # 全部失败，用 UTF-8 强制解码（替换非法字符）
        return file_bytes.decode("utf-8", errors="replace")
