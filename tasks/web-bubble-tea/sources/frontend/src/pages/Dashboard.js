import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { postsAPI } from '../api/posts';
import { commentsAPI } from '../api/comments';
import { draftsAPI } from '../api/drafts';
import useInfiniteScroll from '../hooks/useInfiniteScroll';
import Header from '../components/layout/Header';
import FloatingActionButton from '../components/layout/FloatingActionButton';
import PostCard from '../components/posts/PostCard';
import PostActionsMenu from '../components/menus/PostActionsMenu';
import CreatePostModal from '../components/modals/CreatePostModal';
import EditPostModal from '../components/modals/EditPostModal';

function Dashboard() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [expandedPosts, setExpandedPosts] = useState({});
  const [postComments, setPostComments] = useState({});
  const [loadingComments, setLoadingComments] = useState({});
  const [postMenuOpen, setPostMenuOpen] = useState({});
  
  // Post creation state
  const [showPostModal, setShowPostModal] = useState(false);
  const [postContent, setPostContent] = useState('');
  const [parsedContent, setParsedContent] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [showDraftSuccess, setShowDraftSuccess] = useState(false);
  
  // Edit post modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [editContent, setEditContent] = useState('');
  
  // Comment submission state
  const [commentInputs, setCommentInputs] = useState({});
  const [submittingComment, setSubmittingComment] = useState({});
  
  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Don't close if clicking on a menu button or inside a menu
      if (event.target.closest('.post-menu-button') || event.target.closest('.post-menu')) {
        return;
      }
      
      // Close all post menus
      setPostMenuOpen({});
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Infinite scroll
  const lastPostElementRef = useInfiniteScroll(
    () => setPage(prevPage => prevPage + 1),
    loading,
    hasMore
  );
  
  // Fetch posts on load and when page changes
  useEffect(() => {
    fetchPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);
  
  const fetchPosts = async () => {
    try {
      setLoading(true);
      const response = await postsAPI.getPosts(page, 5);
      
      if (response.data.items) {
        console.log('Posts received:', response.data.items);
        setPosts(prev => page === 1 ? response.data.items : [...prev, ...response.data.items]);
        setHasMore(response.data.pages > page);
      } else {
        setPosts([]);
        setHasMore(false);
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const fetchPostComments = async (userId, postId) => {
    try {
      setLoadingComments(prev => ({ ...prev, [postId]: true }));
      const response = await postsAPI.getPost(userId, postId);
      
      if (response.data && response.data.comments && response.data.comments.items) {
        setPostComments(prev => ({
          ...prev,
          [postId]: response.data.comments.items
        }));
        
        // Update the comment count in case it's out of sync
        setPosts(prev => prev.map(post => 
          post.id === postId 
            ? { ...post, comments_count: response.data.comments.total || response.data.comments.items.length }
            : post
        ));
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoadingComments(prev => ({ ...prev, [postId]: false }));
    }
  };
  
  // User menu handlers
  const handleProfileClick = () => {
    navigate('/profile');
  };
  
  const handleLogout = async () => {
    await logout();
    navigate('/');
  };
  
  // Post handlers
  const handleCreatePost = async () => {
    try {
      const response = await draftsAPI.loadDrafts();
      if (response.data.drafts && response.data.drafts.length > 0) {
        const draft = response.data.drafts[0];
        setPostContent(draft.content);
        setParsedContent(draft.content);
      } else {
        setPostContent('');
        setParsedContent('');
      }
    } catch (error) {
      console.error('Error loading draft:', error);
      setPostContent('');
      setParsedContent('');
    }
    setIsPrivate(false);
    setShowPostModal(true);
  };
  
  const handlePostContentChange = (e) => {
    const content = e.target.value;
    setPostContent(content);
    setParsedContent(content);
  };
  
  const handlePostSubmit = async () => {
    if (!postContent.trim()) return;
    
    try {
      await postsAPI.createPost(postContent, isPrivate);
      
      setShowPostModal(false);
      setPostContent('');
      setParsedContent('');
      setIsPrivate(false);
      
      setPage(1);
      fetchPosts();
    } catch (error) {
      console.error('Error creating post:', error);
      alert('Failed to create post. Please try again.');
    }
  };
  
  const handlePrivateChange = (e) => {
    setIsPrivate(e.target.checked);
  };
  
  const handleSaveDraft = async () => {
    if (!postContent.trim()) return;
    
    try {
      await draftsAPI.saveDraft(postContent);
      setShowDraftSuccess(true);
      setTimeout(() => setShowDraftSuccess(false), 3000);
    } catch (error) {
      console.error('Error saving draft:', error);
      alert('Failed to save draft. Please try again.');
    }
  };
  
  const handleCloseModal = async () => {
    if (postContent.trim()) {
      await handleSaveDraft();
    }
    setShowPostModal(false);
  };
  
  const togglePostComments = (userId, postId) => {
    setExpandedPosts(prev => ({
      ...prev,
      [postId]: !prev[postId]
    }));
    
    if (!expandedPosts[postId]) {
      fetchPostComments(userId, postId);
    }
  };
  
  const togglePostMenu = (postId, event) => {
    event.stopPropagation();
    
    // Close all other menus first
    const newMenuState = {};
    
    // If this menu isn't open, open it
    if (!postMenuOpen[postId]) {
      const buttonRect = event.currentTarget.getBoundingClientRect();
      newMenuState[postId] = {
        top: buttonRect.top,
        left: buttonRect.right + 10,
      };
    }
    
    setPostMenuOpen(newMenuState);
  };
  
  const handleCommentSubmit = async (e, userId, postId) => {
    e.preventDefault();
    
    const comment = commentInputs[postId];
    if (!comment || !comment.trim()) return;
    
    try {
      setSubmittingComment(prev => ({ ...prev, [postId]: true }));
      
      await commentsAPI.createComment(userId, postId, comment);
      
      setCommentInputs(prev => ({ ...prev, [postId]: '' }));
      
      // Update the comment count in the posts list
      setPosts(prev => prev.map(post => 
        post.id === postId 
          ? { ...post, comments_count: (post.comments_count || 0) + 1 }
          : post
      ));
      
      // Refresh comments if they're already loaded
      if (postComments[postId]) {
        await fetchPostComments(userId, postId);
      }
    } catch (error) {
      console.error('Error submitting comment:', error);
      alert('Failed to submit comment. Please try again.');
    } finally {
      setSubmittingComment(prev => ({ ...prev, [postId]: false }));
    }
  };
  
  const handleCommentInputChange = (postId, value) => {
    setCommentInputs(prev => ({ ...prev, [postId]: value }));
  };
  
  const handleEditPost = (post) => {
    setEditingPost(post);
    setEditContent(post.content || '');
    setShowEditModal(true);
    setPostMenuOpen({});
  };
  
  const handleUpdatePost = async () => {
    if (!editingPost || !editContent.trim()) return;
    
    try {
      await postsAPI.updatePost(editingPost.user_id, editingPost.id, editContent);
      
      setPosts(prev => prev.map(post => 
        post.id === editingPost.id 
          ? { ...post, content: editContent }
          : post
      ));
      
      setShowEditModal(false);
      setEditingPost(null);
      setEditContent('');
      alert('Post updated successfully!');
    } catch (error) {
      console.error('Error updating post:', error);
      alert('Failed to update post. Please try again.');
    }
  };
  
  const handleDeletePost = async (userId, postId) => {
    if (window.confirm('Are you sure you want to delete this post?')) {
      try {
        await postsAPI.deletePost(userId, postId);
        setPosts(prev => prev.filter(post => post.id !== postId));
        setPostMenuOpen({});
        alert('Post deleted successfully!');
      } catch (error) {
        console.error('Error deleting post:', error);
        alert('Failed to delete post. Please try again.');
      }
    }
  };
  
  const handleViewPost = (userId, postId) => {
    navigate(`/post/${userId}/posts/${postId}`);
    setPostMenuOpen({});
  };
  
  const isUserPost = (post) => {
    return currentUser && post.user_id === currentUser.id;
  };
  
  return (
    <div className="dashboard">
      <Header 
        currentUser={currentUser}
        onLogout={handleLogout}
        onProfileClick={handleProfileClick}
      />
      
      <FloatingActionButton onClick={handleCreatePost} />
      
      <div className="posts-container">
        {posts.length === 0 && !loading ? (
          <p className="no-posts">No posts yet. Be the first to create one!</p>
        ) : (
          posts.map((post, index) => (
            <div
              key={post.id}
              ref={index === posts.length - 1 ? lastPostElementRef : null}
            >
              <PostCard
                post={post}
                onToggleComments={() => togglePostComments(post.user_id, post.id)}
                onMenuToggle={(e) => {
                  e.stopPropagation();
                  togglePostMenu(post.id, e);
                }}
                onEditClick={() => handleEditPost(post)}
                onDeleteClick={() => handleDeletePost(post.user_id, post.id)}
                onViewClick={() => handleViewPost(post.user_id, post.id)}
                isExpanded={expandedPosts[post.id]}
                comments={postComments[post.id]}
                loadingComments={loadingComments[post.id]}
                onCommentSubmit={(e) => handleCommentSubmit(e, post.user_id, post.id)}
                commentInput={commentInputs[post.id]}
                onCommentInputChange={(value) => handleCommentInputChange(post.id, value)}
                submittingComment={submittingComment[post.id]}
                isUserPost={isUserPost(post)}
                menuOpen={postMenuOpen[post.id]}
              />
            </div>
          ))
        )}
        
        {loading && (
          <div className="loading">Loading posts...</div>
        )}
      </div>
      
      {/* Floating menus for posts */}
      {Object.entries(postMenuOpen).map(([postId, position]) => {
        const post = posts.find(p => p.id.toString() === postId);
        if (!post) return null;
        
        return (
          <PostActionsMenu
            key={`menu-${postId}`}
            post={post}
            position={position}
            isUserPost={isUserPost(post)}
            onEdit={handleEditPost}
            onView={handleViewPost}
            onDelete={handleDeletePost}
            currentUserId={currentUser.id}
          />
        );
      })}
      
      <CreatePostModal
        show={showPostModal}
        postContent={postContent}
        parsedContent={parsedContent}
        isPrivate={isPrivate}
        onClose={handleCloseModal}
        onContentChange={handlePostContentChange}
        onPrivateChange={handlePrivateChange}
        onSubmit={handlePostSubmit}
        showDraftSuccess={showDraftSuccess}
      />
      
      <EditPostModal
        show={showEditModal}
        editContent={editContent}
        onClose={() => {
          setShowEditModal(false);
          setEditingPost(null);
          setEditContent('');
        }}
        onContentChange={setEditContent}
        onSubmit={handleUpdatePost}
      />
    </div>
  );
}

export default Dashboard;
