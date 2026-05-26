from datetime import datetime

from sqlalchemy import String, Integer, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class LlmProvider(Base):
    __tablename__ = "llm_providers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False, comment="模型名称标识")
    base_url: Mapped[str] = mapped_column(String(500), nullable=False, comment="API Base URL")
    model_name: Mapped[str] = mapped_column(String(200), nullable=False, comment="模型标识名")
    api_key: Mapped[str] = mapped_column(String(500), nullable=False, comment="加密存储的 API Key")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, comment="创建时间")
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, onupdate=datetime.now, comment="更新时间")

    settings: Mapped[list["LlmSetting"]] = relationship(back_populates="provider")


class LlmSetting(Base):
    __tablename__ = "llm_settings"
    __table_args__ = (
        UniqueConstraint("category", name="uq_llm_settings_category"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    category: Mapped[str] = mapped_column(String(50), nullable=False, comment="用途类型: embedding/chat/default 等")
    provider_id: Mapped[int] = mapped_column(Integer, ForeignKey("llm_providers.id"), nullable=False, comment="关联的模型提供商")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, comment="创建时间")
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, onupdate=datetime.now, comment="更新时间")

    provider: Mapped["LlmProvider"] = relationship(back_populates="settings")
