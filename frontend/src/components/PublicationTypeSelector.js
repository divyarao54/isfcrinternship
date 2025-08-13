import React from 'react';
import './PatentForm.css';

const PublicationTypeSelector = ({ isOpen, onSelect, onClose }) => {
  if (!isOpen) return null;
  return (
    <div className="publication-form-overlay">
      <div className="publication-form-modal publication-form-centered">
        <div className="publication-form-header" style={{minHeight: '250px'}}>
          <h2>Select Publication Type</h2>
          <button className="close-btn" onClick={onClose}>×</button>
          <div style={{ position:'absolute', display: 'flex', flexDirection: 'row', gap: 16, marginTop: 75, /*left: '33%', alignItems: 'center', height:'auto'*/}}>
            <button className="submit-btn" onClick={() => onSelect('conference')} style={{width : '21%', height: '60px', paddingLeft: '10px'}}>Add Conference</button>
            <button className="submit-btn" onClick={() => onSelect('journal')} style={{width : '21%', height: '60px'}}>Add Journal</button>
            <button className="submit-btn" onClick={() => onSelect('book')} style={{width : '21%', height: '60px'}}>Add Book</button>
            <button className="submit-btn" onClick={() => onSelect('patent')} style={{width : '21%', height: '60px'}}>Add Patent</button>
          </div>
        </div>
        
      </div>
    </div>
  );
};

export default PublicationTypeSelector; 