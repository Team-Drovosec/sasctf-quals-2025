import React, {useEffect, useState} from 'react';
import {useNavigate, useParams} from 'react-router-dom';
import {useAuth} from '../contexts/AuthContext';
import {postsAPI} from '../api/posts';
import {commentsAPI} from '../api/comments';
import {usersAPI} from '../api/users';
import Header from "../components/layout/Header";

function PostView() {
  const { userId, postId } = useParams();
  const { currentUser, logout } = useAuth();
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [author, setAuthor] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, [userId, postId]);

  const fetchUserData = async (userId) => {
    try {
      const response = await usersAPI.getUserProfile(userId);
      setAuthor(response.data.user);
    } catch (error) {
      console.error('Error fetching user data:', error);
      setAuthor(null);
    }
  };

  const fetchPost = async () => {
    try {
      const response = await postsAPI.getPost(userId, postId);
      const postData = response.data;
      
      setPost(postData);
      if (postData.comments && postData.comments.items) {
        setComments(postData.comments.items);
      } else {
        setComments([]);
      }
      setError(null);
    } catch (error) {
      setError('Failed to load post. It may not exist or you may not have permission to view it.');
      setPost(null);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchPost(),
        fetchUserData(userId)
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    
    if (!newComment.trim()) return;
    
    try {
      const response = await commentsAPI.createComment(userId, postId, newComment);
      
      setNewComment('');
      fetchData();
    } catch (error) {
      alert('Failed to submit comment: ' + (error.response?.data?.message || error.message));
    }
  };

  const goBack = () => {
    navigate('/dashboard');
  };

  const handleProfileClick = () => {
    navigate('/profile');
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="post-view-container">
        <div className="loading">Loading post...</div>
      </div>
    );
  }

  return (
    <div className="post-view-container">
      <Header
        currentUser={currentUser}
        onLogout={handleLogout}
        onProfileClick={handleProfileClick}
      />
      <div className="post-view-header">
        <button className="back-button" onClick={goBack}>
          ← Back to Dashboard
        </button>
      </div>

      <div className="post-view-content">
        <div className="post-detail">
          <div className="post-header">
            <span className="post-author">@{author?.username || 'Unknown'}</span>
          </div>
        {error ? (
          <div className="error-message">
            {error}
          </div>
        ) : post ? (
            <>
              {post.created_at && (
                <span className="post-date">
                  {new Date(post.created_at).toLocaleString()}
                </span>
              )}
              <div className="post-content">
                {post.content ? (
                  <div dangerouslySetInnerHTML={{ __html: post.content }} />
                ) : (
                  <div className="empty-content">No content</div>
                )}
              </div>
            </>
        ) : (
          <div className="error-message">
            Post not found or you don't have permission to view it.
          </div>
        )}
        </div>

        <div className="comments-section">
          <div className="comments-header">
            <h3>Comments ({comments.length})</h3>
          </div>

          <div className="comments-list">
            {comments.length > 0 ? (
              comments.map(comment => (
                <div key={comment.id} className="comment-item">
                  <div className="comment-header">
                    <span className="comment-author">@{comment.author || 'Unknown'}</span>
                    {comment.created_at && (
                      <span className="comment-date">
                        {new Date(comment.created_at).toLocaleString()}
                      </span>
                    )}
                  </div>
                  <div className="comment-content">
                    <div dangerouslySetInnerHTML={{ __html: (comment.content || '') }} />
                  </div>
                </div>
              ))
            ) : (
              <p className="no-comments">No comments yet. Be the first to comment!</p>
            )}
          </div>

          <div className="comment-form-wrapper">
            <form className="comment-form" onSubmit={handleCommentSubmit}>
              <textarea
                className="comment-textarea"
                placeholder="Write a comment... (You can use BBCode)"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                rows={4}
                required
              />
              <div className="comment-form-actions">
                <button type="submit" className="submit-comment-btn">
                  Submit Comment
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PostView;
