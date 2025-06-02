from flask import Blueprint, request, jsonify, current_app
from ..models import db, User
from flask_jwt_extended import create_access_token, jwt_required, get_jwt
import re
import datetime

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No input data provided'}), 400
    
    username = data.get('username', '')
    password = data.get('password', '')
    
    if not username or len(username) < 3 or len(username) > 100: 
        return jsonify({'error': 'Username must be between 3 and 100 characters'}), 400
    
    if not re.match(r'^[\x20-\x7F]+$', username):
        return jsonify({'error': 'Username can only contain printable characters'}), 400
    
    if not password or len(password) < 8:
        return jsonify({'error': 'Password must be at least 8 characters'}), 400
    
    existing_user = User.query.filter_by(username=username).first()
    if existing_user:
        return jsonify({'error': 'Username already exists'}), 409
    
    new_user = User(username=username, password=password)
    
    
    db.session.add(new_user)
    db.session.commit()
    
    new_user.last_login_at = datetime.datetime.now()
    db.session.commit()
    
    access_token = create_access_token(
        identity=new_user.id,
        expires_delta=datetime.timedelta(hours=1),
        additional_claims={"login_time": new_user.last_login_at.timestamp()}
    )
    
    return jsonify({
        'message': 'User registered successfully',
        'access_token': access_token,
        'user': {
            'id': new_user.id,
            'username': new_user.username 
        }
    }), 201

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No input data provided'}), 400
    
    username = data.get('username', '')
    password = data.get('password', '')
    
    user = User.query.filter_by(username=username).first()
    
    if not user or not user.verify_password(password):
        return jsonify({'error': 'Invalid username or password'}), 401
    
    user.last_login_at = datetime.datetime.now()
    db.session.commit()
    
    access_token = create_access_token(
        identity=str(user.id),
        expires_delta=datetime.timedelta(hours=1),
        additional_claims={"login_time": user.last_login_at.timestamp()}
    )
    
    return jsonify({
        'message': 'Login successful',
        'access_token': access_token,
        'user': {
            'id': str(user.id),
            'username': user.username 
        }
    }), 200

@auth_bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    jti = get_jwt()["jti"]
    
    current_app.redis.setex(f"token_blacklist:{jti}", 3600, "1")
    
    return jsonify({
        'message': 'Logout successful'
    }), 200
