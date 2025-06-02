import random
from enum import StrEnum

from aiohttp import web
from typing import Dict, Any

from core.db import database
from repositories.game_session_repository import GameSessionRepository
from repositories.user_repository import UserRepository


async def get_active_sessions(request):
    user_id = request['user_id']

    active_sessions = await GameSessionRepository.get_user_active_sessions(user_id)

    sessions_data = []
    for session in active_sessions:
        session_data = {
            'id': session['id'],
            'player1_id': session['player1_id'],
            'player1_stake': float(session['player1_stake']) if session['player1_stake'] is not None else None,
            'created_at': session['created_at'].isoformat() if session['created_at'] else None
        }
        sessions_data.append(session_data)

    return web.json_response({
        'status': 'success',
        'active_sessions': sessions_data
    })


async def get_game_history(request):
    user_id = request['user_id']
    game_history = await GameSessionRepository.get_user_game_history(user_id)

    games_data = []
    for game in game_history:
        game_data = {
            'id': game['id'],
            'player1_id': game['player1_id'],
            'player2_id': game['player2_id'],
            'player1_wallet_address': game['player1_wallet_address'],
            'player2_wallet_address': game['player2_wallet_address'],
            'player1_stake': float(game['player1_stake']) if game['player1_stake'] is not None else None,
            'player2_stake': float(game['player2_stake']) if game['player2_stake'] is not None else None,
            'player1_suit': game['player1_suit'],
            'player2_suit': game['player2_suit'],
            'player1_value': game['player1_value'],
            'player2_value': game['player2_value'],
            'winner_id': game['winner_id'],
            'winning_amount': float(game['winning_amount']) if game['winning_amount'] is not None else None,
            'created_at': game['created_at'].isoformat() if game['created_at'] else None
        }
        games_data.append(game_data)

    return web.json_response({
        'status': 'success',
        'game_history': games_data
    })


async def create_session(request):
    async with database.transaction():
        user_id = request['user_id']
        user = await UserRepository.get_by_id(user_id)
        if not user:
            return web.Response(status=404, text='User not found')

        if user['is_vip']:
            return web.Response(status=400, text='With great power comes great responsibility!')

        try:
            data = await request.json()
            stake_amount = float(data.get('stake_amount', 0))
        except (ValueError, TypeError):
            return web.Response(status=400, text='Invalid stake amount')

        if stake_amount <= 0:
            return web.Response(status=400, text='Stake amount must be positive')

        if float(user['balance']) < stake_amount:
            return web.Response(status=400, text='Insufficient balance')

        active_sessions = await GameSessionRepository.get_active_sessions(user['id'])
        await UserRepository.update(
            user_id,
            balance=float(user['balance']) - stake_amount
        )

        if active_sessions:
            session = active_sessions[0]

            player1_id = session['player1_id']
            player2_id = user_id
            player1_stake = float(session['player1_stake'])

            if player1_id == player2_id:
                return web.Response(status=400, text='Cannot play against yourself')

            (player1_suit, player1_value), (player2_suit, player2_value), winner = burmalda(
                player1_stake, stake_amount,
            )

            if winner == 1:
                winner_id = player1_id
            else:
                winner_id = player2_id

            winning_amount = (player1_stake + stake_amount) * 0.95
            updated_session = await GameSessionRepository.update(
                session['id'],
                player2_id=player2_id,
                player2_stake=stake_amount,
                player1_suit=player1_suit,
                player2_suit=player2_suit,
                player1_value=player1_value,
                player2_value=player2_value,
                winner_id=winner_id,
                winning_amount=winning_amount
            )

            await UserRepository.update(
                winner_id,
                balance=float((await UserRepository.get_by_id(winner_id))['balance']) + winning_amount
            )
            session = await GameSessionRepository.get_by_id(updated_session['id'])
            return web.json_response({
                'status': 'game_completed',
                'session_id': updated_session['id'],
                'winner_id': winner_id,
                'winning_amount': float(winning_amount),
                'player1_suit': player1_suit,
                'player2_suit': player2_suit,
                'player1_value': player1_value,
                'player2_value': player2_value,
                'player1_wallet_address': session['player1_wallet_address'],
                'player2_wallet_address': session['player2_wallet_address'],
            })
        else:
            new_session = await GameSessionRepository.create(
                player1_id=user_id,
                player1_stake=stake_amount
            )

            return web.json_response({
                'status': 'waiting_for_opponent',
                'session_id': new_session['id']
            })


async def get_session_by_id(request):
    user_id = request['user_id']
    session_id = request.match_info.get('id')
    if not session_id:
        return web.Response(status=400, text='Session ID is required')

    try:
        session_id = int(session_id)
    except ValueError:
        return web.Response(status=400, text='Invalid session ID')

    session = await GameSessionRepository.get_by_id(session_id)
    if not session:
        return web.Response(status=404, text='Session not found')

    if session['player1_id'] != user_id and session['player2_id'] != user_id:
        return web.Response(status=403, text='Access denied: You are not a player in this session')

    session_data = {
        'id': session['id'],
        'player1_id': session['player1_id'],
        'player2_id': session['player2_id'],
        'player1_stake': float(session['player1_stake']) if session['player1_stake'] is not None else None,
        'player2_stake': float(session['player2_stake']) if session['player2_stake'] is not None else None,
        'player1_suit': session['player1_suit'],
        'player2_suit': session['player2_suit'],
        'player1_value': session['player1_value'],
        'player2_value': session['player2_value'],
        'winner_id': session['winner_id'],
        'winning_amount': float(session['winning_amount']) if session['winning_amount'] is not None else None,
        'created_at': session['created_at'].isoformat() if session['created_at'] else None
    }

    return web.json_response({
        'status': 'success',
        'session': session_data
    })


def burmalda(stake1, stake2) -> tuple[tuple[str, int], tuple[str, int], int]:
    suits = [SuitEnum.PAWN, SuitEnum.KNIGHT, SuitEnum.BISHOP, SuitEnum.ROOK, SuitEnum.QUEEN, SuitEnum.KING]

    max_stake = max(stake1, stake2)

    if stake1 == stake2:
        suit1 = random.choices(
            suits,
            [60, 50, 40, 30, 20, 10]
        )[0]
        suit2 = random.choices(
            suits,
            [60, 50, 40, 30, 20, 10]
        )[0]
    elif max_stake == stake1:
        modifier = stake2 / stake1
        suit1 = random.choices(
            suits,
            [
                10 ** modifier,
                19 ** modifier + 0.1,
                28 ** modifier + 0.11,
                37 ** modifier + 0.12,
                46 ** modifier + 0.13,
                55 ** modifier + 0.14,
            ]
        )[0]
        suit2 = random.choices(
            suits,
            [60, 50, 40, 30, 20, 10]
        )[0]
    else:
        modifier = stake1 / stake2
        suit1 = random.choices(
            suits,
            [60, 50, 40, 30, 20, 10]
        )[0]
        suit2 = random.choices(
            suits,
            [
                10 ** modifier,
                19 ** modifier + 0.1,
                28 ** modifier + 0.11,
                37 ** modifier + 0.12,
                46 ** modifier + 0.13,
                55 ** modifier + 0.14,
            ]
        )[0]
    nums = list(range(1, 7))
    num1 = random.choice(nums)
    nums.remove(num1)
    num2 = random.choice(nums)
    if suits.index(suit1) > suits.index(suit2):
        winner = 1
    elif suits.index(suit1) < suits.index(suit2):
        winner = 2
    else:
        if num1 > num2:
            winner = 1
        else:
            winner = 2
    return (suit1.value, num1), (suit2.value, num2), winner


class SuitEnum(StrEnum):
    PAWN = "PAWN"
    KNIGHT = "KNIGHT"
    BISHOP = "BISHOP"
    ROOK = "ROOK"
    QUEEN = "QUEEN"
    KING = "KING"
