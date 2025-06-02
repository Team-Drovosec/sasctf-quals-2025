import sqlalchemy
from sqlalchemy import Column, Integer, String, DateTime, Numeric, Boolean, CheckConstraint
from sqlalchemy.sql import func

from core.db import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    wallet_address = Column(String, unique=True, index=True, nullable=False)
    balance = Column(Numeric(precision=18, scale=6), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    is_vip = Column(Boolean, server_default=sqlalchemy.text("FALSE"), nullable=False)

    __table_args__ = (
        CheckConstraint("balance >= 0", name="check_balance_non_negative"),
    )
