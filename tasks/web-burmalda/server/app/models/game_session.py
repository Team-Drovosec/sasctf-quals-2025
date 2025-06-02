from sqlalchemy import Column, Integer, DateTime, Numeric, ForeignKey, String
from sqlalchemy.sql import func

from core.db import Base

class GameSession(Base):
    __tablename__ = "game_sessions"

    id = Column(Integer, primary_key=True, index=True)
    player1_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    player2_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    player1_stake = Column(Numeric(precision=18, scale=6), nullable=False)
    player2_stake = Column(Numeric(precision=18, scale=6), nullable=True)
    player1_suit = Column(String, nullable=True)
    player2_suit = Column(String, nullable=True)
    player1_value = Column(Integer, nullable=True)
    player2_value = Column(Integer, nullable=True)
    winner_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    winning_amount = Column(Numeric(precision=18, scale=6), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
