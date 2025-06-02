import uuid

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import or_, and_
from sqlalchemy.exc import SQLAlchemyError

from ..models import db, Post, Comment
from ..utils.bb_parser import BBCodeParser

posts_bp = Blueprint('posts', __name__)

def validate_post_content(content):
    if not content:
        return False, "Content cannot be empty"
    
    if len(content) > 2000: 
        return False, "Content is too long (max 2000 characters)"
    
    return True, ""

def generate_draft_key(user_id):
    return f"draft:{user_id}"

@posts_bp.route('/', methods=['GET'])
@jwt_required()
def get_posts():
    page = request.args.get('page', 1, type=int)
    per_page = min(request.args.get('per_page', 10, type=int), 50)
    
    posts = (
        Post.query
        .where(Post.user_id == get_jwt_identity())
        .order_by(Post.created_at.desc())
        .paginate(page=page, per_page=per_page)
    )
    
    result = []
    for post in posts.items:
        post_dict = post.to_extended_dict()
        post_dict['top_comments'] = [comment.to_dict() for comment in 
                                   post.comments.order_by(Comment.created_at.desc()).limit(3).all()]
        result.append(post_dict)
    
    return jsonify({
        'items': result,
        'page': page,
        'per_page': per_page,
        'total': posts.total,
        'pages': posts.pages
    }), 200

@posts_bp.route('/user/<user_id>/posts/<post_id>', methods=['GET'])
@jwt_required()
def get_post(user_id, post_id):
    if not post_id or not post_id.isdigit():
        return jsonify({'error': 'Invalid post ID format'}), 400
    
    try:
        user_uuid = uuid.UUID(user_id)
    except ValueError:
        return jsonify({'error': 'Invalid user ID format'}), 400
    
    post = Post.query.where(
        Post.id == int(post_id),
        Post.user_id == user_uuid,
        or_(
            Post.user_id == get_jwt_identity(),
            Post.is_private == False,
        ),
    ).first()
    if not post:
        return jsonify({'error': 'Post not found'}), 404
    
    post_dict = post.to_dict()
    
    page = request.args.get('page', 1, type=int)
    per_page = min(request.args.get('per_page', 20, type=int), 100)
    
    comments = post.comments.order_by(Comment.created_at.desc()).paginate(page=page, per_page=per_page)
    
    post_dict['comments'] = {
        'items': [comment.to_dict() for comment in comments.items],
        'page': page,
        'per_page': per_page,
        'total': comments.total,
        'pages': comments.pages
    }
    
    return jsonify(post_dict), 200

@posts_bp.route('/', methods=['POST'])
@jwt_required()
def create_post():
    user_id = get_jwt_identity()
    
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No input data provided'}), 400
    
    content_raw = data.get('content', '')
    
    valid, error_msg = validate_post_content(content_raw)
    if not valid:
        return jsonify({'error': error_msg}), 400

    parser = BBCodeParser()
    content_html = parser.parse(content_raw)
    
    draft_key = generate_draft_key(user_id)
    if current_app.redis.exists(draft_key):
        current_app.redis.delete(draft_key)
    
    try:
        post = Post(
            content_raw=content_raw,
            content_html=content_html,
            user_id=user_id,
            is_private=data.get('is_private', False),
        )
        
        db.session.add(post)
        db.session.commit()
        
        return jsonify({
            'message': 'Post created successfully',
            'post': post.to_extended_dict(),
        }), 201
    
    except SQLAlchemyError as e:
        db.session.rollback()
        return jsonify({'error': 'Database error', 'details': str(e)}), 500

@posts_bp.route('/user/<user_id>/posts/<post_id>', methods=['PUT'])
@jwt_required()
def update_post(user_id, post_id):
    current_user_id = get_jwt_identity()
    
    if not post_id or not post_id.isdigit():
        return jsonify({'error': 'Invalid post ID format'}), 400
    
    try:
        user_uuid = uuid.UUID(user_id)
    except ValueError:
        return jsonify({'error': 'Invalid user ID format'}), 400
    
    if str(user_uuid) != current_user_id:
        return jsonify({'error': 'You can only edit your own posts'}), 403
    
    post = Post.query.filter_by(id=int(post_id), user_id=user_uuid).first()
    if not post:
        return jsonify({'error': 'Post not found'}), 404
    
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No input data provided'}), 400
    
    content_raw = data.get('content')
    if content_raw is None:
        return jsonify({'error': 'Content is required'}), 400
    
    valid, error_msg = validate_post_content(content_raw)
    if not valid:
        return jsonify({'error': error_msg}), 400
    
    parser = BBCodeParser()
    content_html = parser.parse(content_raw)
    
    try:
        post.content_raw = content_raw
        post.content_html = content_html
        
        db.session.commit()
        
        return jsonify({
            'message': 'Post updated successfully',
            'post': post.to_extended_dict()
        }), 200
    
    except SQLAlchemyError as e:
        db.session.rollback()
        return jsonify({'error': 'Database error', 'details': str(e)}), 500

@posts_bp.route('/user/<user_id>/posts/<post_id>', methods=['DELETE'])
@jwt_required()
def delete_post(user_id, post_id):
    current_user_id = get_jwt_identity()
    
    if not post_id or not post_id.isdigit():
        return jsonify({'error': 'Invalid post ID format'}), 400
    
    try:
        user_uuid = uuid.UUID(user_id)
    except ValueError:
        return jsonify({'error': 'Invalid user ID format'}), 400
    
    if str(user_uuid) != current_user_id:
        return jsonify({'error': 'You can only delete your own posts'}), 403
    
    post = Post.query.filter_by(id=int(post_id), user_id=user_uuid).first()
    if not post:
        return jsonify({'error': 'Post not found'}), 404
    
    try:
        db.session.delete(post)
        db.session.commit()
        
        return jsonify({
            'message': 'Post deleted successfully'
        }), 200
    
    except SQLAlchemyError as e:
        db.session.rollback()
        return jsonify({'error': 'Database error', 'details': str(e)}), 500
