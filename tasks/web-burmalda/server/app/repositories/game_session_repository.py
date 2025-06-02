from typing import Optional, List, Dict, Any
from sqlalchemy import or_, and_, select

from core.db import database
from models.game_session import GameSession
from models.user import User

class GameSessionRepository:
    @staticmethod
    async def create(player1_id: int, player1_stake: float) -> Dict[str, Any]:
        query = GameSession.__table__.insert().values(
            player1_id=player1_id,
            player1_stake=player1_stake
        ).returning(GameSession.__table__)

        return await database.fetch_one(query)

    @staticmethod
    async def get_by_id(session_id: int) -> Optional[Dict[str, Any]]:
        player1 = User.__table__.alias('player1')
        player2 = User.__table__.alias('player2')

        query = select(
            GameSession.__table__.c.id,
            GameSession.__table__.c.player1_id,
            GameSession.__table__.c.player2_id,
            GameSession.__table__.c.player1_stake,
            GameSession.__table__.c.player2_stake,
            GameSession.__table__.c.player1_suit,
            GameSession.__table__.c.player2_suit,
            GameSession.__table__.c.player1_value,
            GameSession.__table__.c.player2_value,
            GameSession.__table__.c.winner_id,
            GameSession.__table__.c.winning_amount,
            GameSession.__table__.c.created_at,
            player1.c.wallet_address.label('player1_wallet_address'),
            player2.c.wallet_address.label('player2_wallet_address')
        ).select_from(
            GameSession.__table__.join(
                player1,
                GameSession.player1_id == player1.c.id,
                isouter=True
            ).join(
                player2,
                GameSession.player2_id == player2.c.id,
                isouter=True
            )
        ).where(
            GameSession.id == session_id
        )
        return await database.fetch_one(query)

    @staticmethod
    async def get_by_player1_id(player1_id: int) -> List[Dict[str, Any]]:
        query = GameSession.__table__.select().where(GameSession.player1_id == player1_id)
        return await database.fetch_all(query)

    @staticmethod
    async def get_by_player2_id(player2_id: int) -> List[Dict[str, Any]]:
        query = GameSession.__table__.select().where(GameSession.player2_id == player2_id)
        return await database.fetch_all(query)

    @staticmethod
    async def get_active_sessions(user_id: int) -> List[Dict[str, Any]]:
        query = GameSession.__table__.select().where(
            GameSession.player1_id != user_id,
            GameSession.player2_id == None,
        )
        return await database.fetch_all(query)

    @staticmethod
    async def get_user_active_sessions(user_id: int) -> List[Dict[str, Any]]:
        query = GameSession.__table__.select().where(
            and_(
                GameSession.player1_id == user_id,
                GameSession.player2_id == None
            )
        )
        return await database.fetch_all(query)

    @staticmethod
    async def get_user_game_history(user_id: int) -> List[Dict[str, Any]]:
        player1 = User.__table__.alias('player1')
        player2 = User.__table__.alias('player2')
        
        query = select(
            GameSession.__table__.c.id,
            GameSession.__table__.c.player1_id,
            GameSession.__table__.c.player2_id,
            GameSession.__table__.c.player1_stake,
            GameSession.__table__.c.player2_stake,
            GameSession.__table__.c.player1_suit,
            GameSession.__table__.c.player2_suit,
            GameSession.__table__.c.player1_value,
            GameSession.__table__.c.player2_value,
            GameSession.__table__.c.winner_id,
            GameSession.__table__.c.winning_amount,
            GameSession.__table__.c.created_at,
            player1.c.wallet_address.label('player1_wallet_address'),
            player2.c.wallet_address.label('player2_wallet_address')
        ).select_from(
            GameSession.__table__.join(
                player1,
                GameSession.player1_id == player1.c.id,
                isouter=True
            ).join(
                player2,
                GameSession.player2_id == player2.c.id,
                isouter=True
            )
        ).where(
            and_(
                or_(
                    GameSession.player1_id == user_id,
                    GameSession.player2_id == user_id
                ),
                GameSession.winner_id != None
            )
        ).order_by(GameSession.created_at.desc()).limit(30)
        
        return await database.fetch_all(query)

    @staticmethod
    async def update(session_id: int, **kwargs) -> Optional[Dict[str, Any]]:
        query = GameSession.__table__.update().where(
            GameSession.id == session_id
        ).values(**kwargs).returning(GameSession.__table__)

        return await database.fetch_one(query)

    @staticmethod
    async def delete(session_id: int) -> None:
        query = GameSession.__table__.delete().where(GameSession.id == session_id)
        await database.execute(query)
