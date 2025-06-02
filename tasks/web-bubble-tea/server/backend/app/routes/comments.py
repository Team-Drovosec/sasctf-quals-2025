from flask import Blueprint, request, jsonify
from ..models import db, Post, Comment
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy.exc import SQLAlchemyError
import uuid

from ..utils.bb_parser import BBCodeParser

comments_bp = Blueprint('comments', __name__)

def validate_comment_content(content):
    if not content:
        return False, "Content cannot be empty"
    
    if len(content) > 2000:
        return False, "Content is too long (max 2000 characters)"
    
    return True, ""

@comments_bp.route('/user/<user_id>/posts/<post_id>', methods=['POST'])
@jwt_required()
def create_comment(user_id, post_id):
    current_user_id = get_jwt_identity()
    
    if not post_id or not post_id.isdigit():
        return jsonify({'error': 'Invalid post ID format'}), 400
    
    try:
        user_uuid = uuid.UUID(user_id)
    except ValueError:
        return jsonify({'error': 'Invalid user ID format'}), 400
    
    post = Post.query.filter_by(id=int(post_id), user_id=user_uuid).first()
    if not post:
        return jsonify({'error': 'Post not found'}), 404
    
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No input data provided'}), 400
    
    content = data.get('content', '')
    
    valid, error_msg = validate_comment_content(content)
    if not valid:
        return jsonify({'error': error_msg}), 400

    parser = BBCodeParser()
    content_html = parser.parse(content)
    
    try:
        comment = Comment(
            content=content_html,
            post_id=post.id,
            user_id=current_user_id
        )
        
        db.session.add(comment)
        db.session.commit()
        
        return jsonify({
            'message': 'Comment created successfully',
            'comment': comment.to_dict()
        }), 201
    
    except SQLAlchemyError as e:
        db.session.rollback()
        return jsonify({'error': 'Database error', 'details': str(e)}), 500
