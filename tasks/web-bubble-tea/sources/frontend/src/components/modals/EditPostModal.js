import React from 'react';
import {parseBBCode} from '../../utils/bbcode';

const EditPostModal = ({
  show,
  editContent,
  onClose,
  onContentChange,
  onSubmit
}) => {
  if (!show) return null;
  
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Edit Post</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-body">
          <textarea
            className="post-textarea"
            value={editContent}
            onChange={(e) => onContentChange(e.target.value)}
            placeholder="Edit your post content..."
            rows={8}
          />
          
          {editContent && (
            <div className="live-preview">
              <p style={{fontSize: '12px', color: '#666', marginBottom: '5px'}}>Preview:</p>
              <div dangerouslySetInnerHTML={{ __html: parseBBCode(editContent) }} />
            </div>
          )}
        </div>
        
        <div className="modal-footer">
          <button className="cancel-btn" onClick={onClose}>Cancel</button>
          <button className="publish-btn" onClick={onSubmit}>
            Update Post
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditPostModal;