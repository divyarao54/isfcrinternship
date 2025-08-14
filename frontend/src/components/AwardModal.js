import React, { useState } from 'react';

const AwardModal = ({ isOpen, onClose, onSubmit, isUploading }) => {
  const [awardName, setAwardName] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!awardName.trim()) {
      alert('Please enter an award name');
      return;
    }
    if (!imageUrl.trim()) {
      alert('Please enter an image URL');
      return;
    }
    
    // Basic URL validation
    try {
      new URL(imageUrl.trim());
    } catch {
      alert('Please enter a valid image URL (e.g., https://example.com/image.jpg)');
      return;
    }
    
    await onSubmit(awardName.trim(), imageUrl.trim());
    setAwardName('');
    setImageUrl('');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add Award</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit} className="add-project-form">
          <div className="form-group">
            <label htmlFor="awardName">Award Name *</label>
            <input
              type="text"
              id="awardName"
              value={awardName}
              onChange={(e) => setAwardName(e.target.value)}
              placeholder="Enter award name"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="awardImage">Award Image URL *</label>
            <input
              type="url"
              id="awardImage"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="Enter image URL (e.g., https://example.com/image.jpg)"
              required
            />
          </div>
          <div className="form-actions">
            <button type="button" onClick={onClose} className="cancel-btn">Cancel</button>
            <button type="submit" className="submit-btn" disabled={isUploading}>
              {isUploading ? 'Uploading...' : 'Upload Award'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AwardModal;


