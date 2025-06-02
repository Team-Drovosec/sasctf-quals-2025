from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request, get_jwt
from functools import wraps
from flask import jsonify, current_app

def get_current_user():
    try:
        verify_jwt_in_request()
        user_id = get_jwt_identity()
        
        from ..models import User
        user = User.query.get(user_id)
        
        if user:
            return {
                'user_id': str(user.id),
                'username': user.username
            }
        return None
    except Exception as e:
        print(f"JWT Error: {str(e)}")
        return None

def validate_token_freshness():
    try:
        from ..models import User
        claims = get_jwt()
        user_id = claims["sub"]
        login_time = claims.get("login_time")
        
        user = User.query.get(user_id)
        
        if not user or not user.last_login_at:
            return False
        
        if not login_time or login_time < user.last_login_at.timestamp():
            return False
            
        return True
    except Exception as e:
        print(f"Token freshness validation error: {str(e)}")
        return False

def fresh_jwt_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        if not validate_token_freshness():
            return jsonify({"error": "Token has been invalidated by a new login"}), 401
        return fn(*args, **kwargs)
    return wrapper
