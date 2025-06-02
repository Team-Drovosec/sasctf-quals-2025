from typing import Optional, List, Dict, Any

from core.db import database
from models.user import User

class UserRepository:
    @staticmethod
    async def create(wallet_address: str) -> Dict[str, Any]:
        query = User.__table__.insert().values(
            wallet_address=wallet_address,
            balance=100
        ).returning(User.__table__)

        return await database.fetch_one(query)

    @staticmethod
    async def get_by_id(user_id: int) -> Optional[Dict[str, Any]]:
        query = User.__table__.select().where(User.id == user_id)
        return await database.fetch_one(query)

    @staticmethod
    async def get_by_wallet_address(wallet_address: str) -> Optional[Dict[str, Any]]:
        query = User.__table__.select().where(User.wallet_address == wallet_address)
        return await database.fetch_one(query)

    @staticmethod
    async def get_all() -> List[Dict[str, Any]]:
        query = User.__table__.select()
        return await database.fetch_all(query)

    @staticmethod
    async def update(user_id: int, **kwargs) -> Optional[Dict[str, Any]]:
        query = User.__table__.update().where(
            User.id == user_id
        ).values(**kwargs).returning(User.__table__)

        return await database.fetch_one(query)

    @staticmethod
    async def delete(user_id: int) -> None:
        query = User.__table__.delete().where(User.id == user_id)
        await database.execute(query)

    @staticmethod
    async def get_leaderboard(limit: int = 50) -> List[Dict[str, Any]]:
        query = User.__table__.select().order_by(
            User.balance.desc(),
            User.is_vip.desc(),
        ).limit(limit)
        return await database.fetch_all(query)
