import React, { useState } from 'react';

const AwardModal = ({ isOpen, onClose, onSubmit, isUploading }) => {
  const [awardName, setAwardName] = useState('');
  const [imageFile, setImageFile] = useState(null);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const file = e.target.files && e.target.files[0];
    setImageFile(file || null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!awardName.trim()) {
      alert('Please enter an award name');
      return;
    }
    if (!imageFile) {
      alert('Please select an award image');
      return;
    }
    await onSubmit(awardName.trim(), imageFile);
    setAwardName('');
    setImageFile(null);
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
            <label htmlFor="awardImage">Award Image *</label>
            <input
              type="file"
              id="awardImage"
              accept="image/*"
              onChange={handleFileChange}
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


