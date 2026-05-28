from datetime import datetime

from sqlalchemy import Integer, String, DateTime, ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class ApiKey(Base):
    __tablename__ = "api_keys"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    key: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, comment="API Key 值")
    name: Mapped[str] = mapped_column(String(100), nullable=False, comment="名称备注")
    status: Mapped[int] = mapped_column(Integer, default=1, nullable=False, comment="0=禁用 1=启用")
    expires_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True, comment="过期时间，null=永不过期")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, comment="创建时间")
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, onupdate=datetime.now, comment="更新时间")

    permissions: Mapped[list["ApiKeyPermission"]] = relationship(
        back_populates="api_key", cascade="all, delete-orphan"
    )
    usage_logs: Mapped[list["ApiKeyUsageLog"]] = relationship(
        back_populates="api_key", cascade="all, delete-orphan"
    )


class ApiKeyPermission(Base):
    __tablename__ = "api_key_permissions"
    __table_args__ = (
        Index("ix_akp_key_endpoint", "api_key_id", "endpoint", "method", unique=True),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    api_key_id: Mapped[int] = mapped_column(Integer, ForeignKey("api_keys.id"), nullable=False)
    endpoint: Mapped[str] = mapped_column(String(255), nullable=False, comment="接口路径，如 /api/v1/documents/parse")
    method: Mapped[str] = mapped_column(String(10), nullable=False, comment="HTTP 方法，如 POST")
    rate_limit: Mapped[int] = mapped_column(Integer, default=-1, nullable=False, comment="每分钟限流次数，-1=不限")
    quota: Mapped[int] = mapped_column(Integer, default=-1, nullable=False, comment="总调用配额，-1=不限")
    used_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False, comment="已调用次数")

    api_key: Mapped["ApiKey"] = relationship(back_populates="permissions")


class ApiKeyUsageLog(Base):
    __tablename__ = "api_key_usage_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    api_key_id: Mapped[int] = mapped_column(Integer, ForeignKey("api_keys.id"), nullable=False)
    endpoint: Mapped[str] = mapped_column(String(255), nullable=False)
    method: Mapped[str] = mapped_column(String(10), nullable=False)
    status_code: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, comment="调用时间")

    api_key: Mapped["ApiKey"] = relationship(back_populates="usage_logs")
