import os
import jwt

import sqlalchemy
from aiohttp import web

from api.game import create_session, get_active_sessions, get_game_history, get_session_by_id
from api.users import wallet_auth, auth, me, leaderboard
from core.db import database, Base
from core.middleware import auth_middleware, auth_vip_middleware
from core.templates import get_templates, get_vip_templates
from models.user import User
from settings import get_app_settings


async def create_vip_users():
    vip_addresses = [
        "UQB8sn/HnbfA2tp6YZb23AcGvDpvNvx230k67oyoVPUSMEg/",
        "UQAGCxO5Eo7yvbut7YnbnJeN0ShcTQflIEZJm2yLhS2fUyuA",
        "UQC6kd3YrbsFRyBTHpGhOpwMUur6JOEehQtSRFHojqR/tj4N"
    ]
    balances = [
        9898989,
        9768769,
        9117711,
    ]
    
    for address, balance in zip(vip_addresses, balances):
        query = User.__table__.select().where(User.wallet_address == address)
        result = await database.fetch_one(query=query)
        
        if not result:
            query = User.__table__.insert().values(
                wallet_address=address,
                balance=balance,
                is_vip=True,
            )
            await database.execute(query=query)

async def startup(_) -> None:
    await database.connect()

    dialect = sqlalchemy.dialects.postgresql.dialect()
    for table in reversed(Base.metadata.tables.values()):
        schema = sqlalchemy.schema.CreateTable(table, if_not_exists=True)
        query = str(schema.compile(dialect=dialect))
        await database.execute(query=query)
    
    await create_vip_users()


async def shutdown(_) -> None:
    await database.disconnect()


async def index(request: web.Request) -> web.FileResponse | web.Response:
    try:
        auth_token = request.cookies.get('auth_token')
        if not auth_token:
            return web.FileResponse(os.path.join(os.path.dirname(__file__), 'templates/auth.html'))
        
        try:
            payload = jwt.decode(auth_token, get_app_settings().JWT_SECRET_KEY, algorithms=[get_app_settings().JWT_ALGORITHM])
            user_id = payload.get('user_id')
            if not user_id:
                return web.FileResponse(os.path.join(os.path.dirname(__file__), 'templates/auth.html'))
        except jwt.InvalidTokenError:
            return web.FileResponse(os.path.join(os.path.dirname(__file__), 'templates/auth.html'))
        
        return web.FileResponse(os.path.join(os.path.dirname(__file__), 'templates/casino.html'))
    except Exception as e:
        print(f"Error in index route: {e}")
        return web.FileResponse(os.path.join(os.path.dirname(__file__), 'templates/auth.html'))


async def vip_page(request):
    return web.Response(text=get_vip_templates()['vip'].render(), content_type='text/html')


async def tonconnect_manifest(request):
    return web.json_response({
        "url": "https://burmalda.task.sasc.tf",
        "name": "Burmalda",
        "iconUrl": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2b/Ufenau_-_Oryctolagus_cuniculus_2011-07-25_17-33-40.jpg/1920px-Ufenau_-_Oryctolagus_cuniculus_2011-07-25_17-33-40.jpg",
        "termsOfUseUrl": "https://example.com/terms",
        "privacyPolicyUrl": "https://example.com/privacy"
    })


burmalda_app = web.Application(
    middlewares=[auth_middleware],
)

burmalda_app.router.add_get('/', index)
burmalda_app.router.add_get('/tonconnect-manifest.json', tonconnect_manifest)
burmalda_app.router.add_get('/api/users/wallet_auth', wallet_auth)
burmalda_app.router.add_post('/api/auth', auth)
burmalda_app.router.add_get('/api/users/me', me)
burmalda_app.router.add_get('/api/users/leaderboard', leaderboard)
burmalda_app.router.add_post('/api/game/session', create_session)
burmalda_app.router.add_get('/api/game/session/{id}', get_session_by_id)
burmalda_app.router.add_get('/api/game/active-sessions', get_active_sessions)
burmalda_app.router.add_get('/api/game/history', get_game_history)

burmalda_app.router.add_static('/static', os.path.join(os.path.dirname(__file__), 'templates/static'))

vip_app = web.Application(
    middlewares=[auth_vip_middleware],
)

vip_app.router.add_get('', vip_page)
vip_app.router.add_static('/static', os.path.join(os.path.dirname(__file__), 'vip_templates/static'))

burmalda_app.add_subapp('/vip', vip_app)

burmalda_app.on_startup.append(startup)
burmalda_app.on_cleanup.append(shutdown)


if __name__ == '__main__':
    web.run_app(burmalda_app, host='127.0.0.1', port=4100)
