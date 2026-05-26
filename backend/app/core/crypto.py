from cryptography.fernet import Fernet

from app.core.config import settings


def _get_fernet() -> Fernet:
    if not settings.ENCRYPTION_KEY:
        raise ValueError("ENCRYPTION_KEY 未配置，请在 .env 中设置")
    return Fernet(settings.ENCRYPTION_KEY.encode())


def encrypt_value(plain: str) -> str:
    return _get_fernet().encrypt(plain.encode()).decode()


def decrypt_value(cipher: str) -> str:
    return _get_fernet().decrypt(cipher.encode()).decode()