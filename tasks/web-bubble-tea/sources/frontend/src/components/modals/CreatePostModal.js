import React from 'react';
import {parseBBCode} from '../../utils/bbcode';
import { LockIcon } from '../icons';

const CreatePostModal = ({
  show,
  postContent,
  parsedContent,
  isPrivate,
  onClose,
  onContentChange,
  onPrivateChange,
  onSubmit,
  showDraftSuccess
}) => {
  if (!show) return null;
  
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Create Post</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-body">
          {showDraftSuccess && (
            <div className="draft-success-box">
              Draft saved successfully!
            </div>
          )}
          
          <textarea
            className="post-textarea"
            value={postContent}
            onChange={onContentChange}
            placeholder="Write your post here..."
            rows={8}
          />
          
          <div className="post-options">
            <label className="private-checkbox">
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={onPrivateChange}
                className="private-checkbox-input"
              />
              <span className="private-checkbox-custom">
                <LockIcon />
              </span>
              <span className="private-checkbox-label">Private post</span>
            </label>
          </div>
          
          {parsedContent && (
            <div className="live-preview">
              <div dangerouslySetInnerHTML={{ __html: parseBBCode(parsedContent) }} />
            </div>
          )}
        </div>
        
        <div className="modal-footer">
          <div className="footer-right">
            <button className="publish-btn" onClick={onSubmit}>
              Publish
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreatePostModal;