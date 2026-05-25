import os

from dotenv import load_dotenv

load_dotenv()


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

    @property
    def DATABASE_URL(self) -> str:
        return (
            f"mysql+pymysql://{self.DB_USER}:{self.DB_PASSWORD}"
            f"@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
            f"?charset=utf8mb4"
        )


settings = Settings()
