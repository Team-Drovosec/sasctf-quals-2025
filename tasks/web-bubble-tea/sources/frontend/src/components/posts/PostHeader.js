import React from 'react';
import { ThreeDotsIcon } from '../icons';

const PostHeader = ({ post, onMenuToggle }) => {
  return (
    <div className="post-header">
      <span className="post-author">
        @{post.author}
      </span>
      
      <div className="post-menu-container">
        <button 
          className="post-menu-button"
          onClick={onMenuToggle}
        >
          <ThreeDotsIcon />
        </button>
      </div>
    </div>
  );
};

export default PostHeader;
