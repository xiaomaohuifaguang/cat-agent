import os
import re

from dotenv import load_dotenv

load_dotenv()


def _parse_size(value: str | None, default: int) -> int:
    """解析带单位的大小字符串，如 '500M', '1G', '1024K'"""
    if not value:
        return default
    value = value.strip().upper()
    match = re.match(r"^(\d+(?:\.\d+)?)\s*([KMGT]?)B?$", value)
    if not match:
        return default
    num = float(match.group(1))
    unit = match.group(2)
    multipliers = {"": 1, "K": 1024, "M": 1024 ** 2, "G": 1024 ** 3, "T": 1024 ** 4}
    return int(num * multipliers.get(unit, 1))


class Settings:
    # 应用配置
    USER: str = os.getenv("USER", "admin")
    PASSWORD: str = os.getenv("PASSWORD", "123456")

    # 数据库配置
    DB_HOST: str = os.getenv("DB_HOST", "localhost")
    DB_PORT: str = os.getenv("DB_PORT", "3306")
    DB_USER: str = os.getenv("DB_USER", "root")
    DB_PASSWORD: str = os.getenv("DB_PASSWORD", "")
    DB_NAME: str = os.getenv("DB_NAME", "catagent")
    DB_TIMEZONE: str = os.getenv("DB_TIMEZONE", "Asia/Shanghai")

    # Redis 配置
    REDIS_HOST: str = os.getenv("REDIS_HOST", "localhost")
    REDIS_PORT: int = int(os.getenv("REDIS_PORT", "6379"))
    REDIS_DB: int = int(os.getenv("REDIS_DB", "0"))
    REDIS_PASSWORD: str = os.getenv("REDIS_PASSWORD", "")

    # JWT 配置
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "changeme")
    JWT_EXPIRE_DAYS: int = int(os.getenv("JWT_EXPIRE_DAYS", "7"))

    # 加密配置
    ENCRYPTION_KEY: str = os.getenv("ENCRYPTION_KEY", "")

    # 文件上传配置
    MAX_UPLOAD_SIZE: int = _parse_size(os.getenv("MAX_UPLOAD_SIZE"), 524288000)  # 500MB

    @property
    def DATABASE_URL(self) -> str:
        return (
            f"mysql+pymysql://{self.DB_USER}:{self.DB_PASSWORD}"
            f"@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
            f"?charset=utf8mb4"
        )


settings = Settings()