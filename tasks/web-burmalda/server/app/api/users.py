from secrets import token_urlsafe

from aiohttp import web
from pytonconnect.parsers import WalletInfo, Account, TonProof

from core.auth_jwt import generate_token
from repositories.user_repository import UserRepository
from settings import get_app_settings
from utils.ton_addr import to_human_readable_address


async def wallet_auth(request):
    return web.json_response({'data': {'nonce': token_urlsafe(32)}})


async def auth(request):
    data = await request.json()
    account = Account.from_dict(data['account'])
    proof = TonProof.from_dict(data)
    wi = WalletInfo()
    wi.account = account
    wi.ton_proof = proof

    is_valid = wi.check_proof()

    if not is_valid:
        return web.Response(status=401, text='Invalid proof')

    wallet_address = to_human_readable_address(account.address)
    user = await UserRepository.get_by_wallet_address(wallet_address)

    if not user:
        user = await UserRepository.create(wallet_address=wallet_address)

    token = generate_token(wallet_address, user['id'])

    response = web.json_response({'data': {'success': True}})
    response.set_cookie(
        'auth_token',
        token,
        httponly=True,
        samesite='Strict',
        max_age=get_app_settings().JWT_EXPIRATION_SECONDS
    )
    return response


async def me(request):
    user_id = request['user_id']
    user = await UserRepository.get_by_id(user_id)
    if not user:
        return web.Response(status=404, text='User not found')

    user_data = {
        'id': user['id'],
        'is_vip': user['is_vip'],
        'wallet_address': user['wallet_address'],
        'balance': float(user['balance']) if user['balance'] is not None else 0,
    }

    return web.json_response({
        'status': 'authenticated',
        'user': user_data
    })


async def leaderboard(request):
    users = await UserRepository.get_leaderboard(limit=50)
    
    leaderboard_data = []
    for user in users:
        leaderboard_data.append({
            'id': user['id'],
            'wallet_address': user['wallet_address'],
            'balance': float(user['balance']) if user['balance'] is not None else 0,
            'is_vip': user['is_vip'],
            'created_at': user['created_at'].isoformat() if user['created_at'] else None
        })
    
    return web.json_response({
        'data': leaderboard_data
    })
