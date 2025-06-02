import redis
from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from sqlalchemy import text

from .config import Config
from .models import db
from .routes.auth import auth_bp
from .routes.comments import comments_bp
from .routes.drafts import drafts_bp
from .routes.posts import posts_bp
from .routes.users import users_bp


def create_app(config_name='default'):
    app = Flask(__name__)
    app.url_map.strict_slashes = False
    app.config.from_object(Config)
    
    db.init_app(app)
    jwt = JWTManager(app)
    
    app.config["JWT_BLOCKLIST_ENABLED"] = True
    app.config["JWT_BLOCKLIST_TOKEN_CHECKS"] = ["access"]
    
    @jwt.token_in_blocklist_loader
    def check_if_token_is_revoked(jwt_header, jwt_payload):
        try:
            jti = jwt_payload["jti"]
            token_in_redis = app.redis.get(f"token_blacklist:{jti}")
            return token_in_redis is not None
        except Exception as e:
            print(f"Redis error: {str(e)}")
            return False

    try:
        app.redis = redis.from_url(app.config['REDIS_URL'])
        print(f"Connected to Redis at {app.config['REDIS_URL']}")
    except Exception as e:
        print(f"Warning: Redis connection failed: {str(e)}")
        raise e
    
    app.register_blueprint(auth_bp, url_prefix='/auth')
    app.register_blueprint(posts_bp, url_prefix='/posts')
    app.register_blueprint(comments_bp, url_prefix='/comments')
    app.register_blueprint(drafts_bp, url_prefix='/drafts')
    app.register_blueprint(users_bp, url_prefix='/users')

    app.config["JWT_VERIFY_SUB"] = False

    with app.app_context():
        try:
            db.session.execute(text('CREATE EXTENSION IF NOT EXISTS "pgcrypto";'))
            db.session.commit()
            print("Created PostgreSQL extensions")
        except Exception as e:
            db.session.rollback()
            print(f"Error creating extensions: {str(e)}")
        
        try:
            db.create_all()
            print("Created database tables")
        except Exception as e:
            print(f"Error creating tables: {str(e)}")
    
    return app
