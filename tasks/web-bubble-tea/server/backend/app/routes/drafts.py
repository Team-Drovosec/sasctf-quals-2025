from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
import json
import time

drafts_bp = Blueprint('drafts', __name__)

def get_draft_key(user_id):
    return f"draft:{user_id}"

@drafts_bp.route('/save', methods=['POST'])
@jwt_required()
def save_draft():
    user_id = get_jwt_identity()
    
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No input data provided'}), 400
    
    content = data.get('content', '')
    
    if not content:
        return jsonify({'error': 'Content cannot be empty'}), 400
    if len(content) > 2000:
        return jsonify({'error': 'Content is too long (max 2000 characters)'}), 400
    
    timestamp = int(time.time())
    
    draft_data = {
        'content': content,
        'updated_at': timestamp
    }
    
    draft_key = get_draft_key(user_id)
    current_app.redis.set(draft_key, json.dumps(draft_data))
    
    return jsonify({
        'message': 'Draft saved successfully',
        'draft': draft_data
    }), 200

@drafts_bp.route('/load', methods=['GET'])
@jwt_required()
def load_draft():
    user_id = get_jwt_identity()
    
    draft_key = get_draft_key(user_id)
    data = current_app.redis.get(draft_key)
    
    if not data:
        return jsonify({
            'message': 'No draft found',
            'drafts': [],
            'count': 0
        }), 200
    
    try:
        draft = json.loads(data)
        return jsonify({
            'message': 'Draft loaded successfully',
            'drafts': [draft],
            'count': 1
        }), 200
    except:
        return jsonify({
            'message': 'Error loading draft',
            'drafts': [],
            'count': 0
        }), 200
