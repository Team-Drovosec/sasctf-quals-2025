import React from 'react';

const CommentForm = ({ 
  value, 
  onChange, 
  onSubmit, 
  submitting = false,
  placeholder = "Write a comment...",
  rows = 2,
  className = "inline-comment-form"
}) => {
  return (
    <form className={className} onSubmit={onSubmit}>
      <textarea
        className="inline-comment-textarea"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        required
      />
      <button 
        type="submit" 
        className="inline-submit-comment-btn"
        disabled={submitting}
      >
        {submitting ? 'Posting...' : 'Post'}
      </button>
    </form>
  );
};

export default CommentForm;