import re

from flask import Blueprint, request, jsonify, abort
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy.exc import SQLAlchemyError

from ..models import db, User
from ..utils.jwt_utils import fresh_jwt_required

users_bp = Blueprint('users', __name__)

@users_bp.route('/me', methods=['GET'])
@jwt_required()
def get_current_user_info():
    user_id = get_jwt_identity()
    
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    return jsonify({
        'user': user.to_dict()
    }), 200

@users_bp.route('/<user_id>', methods=['GET'])
@jwt_required()
def get_user_info(user_id):
    requesting_user_id = get_jwt_identity() 
    
    target_user_id = user_id
    
    user = User.query.get(target_user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    return jsonify({
        'user': user.to_dict()
    }), 200

@users_bp.route('/me', methods=['PUT'])
@fresh_jwt_required  
def update_user():
    user_id = get_jwt_identity()
    
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No input data provided'}), 400
    
    if 'username' in data:
        new_username = data.get('username')
        
        if not new_username or len(new_username) < 3 or len(new_username) > 100:
            return jsonify({'error': 'Username must be between 3 and 100 characters'}), 400

        if not re.match(r'^[\x20-\x7F]+$', new_username):
            return jsonify({'error': 'Username can only contain printable characters'}), 400
        
        existing_user = User.query.filter_by(username=new_username).first()
        if existing_user and existing_user.id != user_id:
            return jsonify({'error': 'Username already exists'}), 409
        user.username = new_username
    
    try:
        db.session.commit()
        return jsonify({
            'message': 'User updated successfully',
            'user': user.to_dict()
        }), 200
    except SQLAlchemyError as e:
        db.session.rollback()
        return jsonify({'error': 'Database error', 'details': str(e)}), 500
