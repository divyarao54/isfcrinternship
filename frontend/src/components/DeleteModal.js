import React, { useState } from 'react';
import '../styles/admin.css';

const DeleteModal = ({ isOpen, onClose, teachers, onDeleteTeacher, onFetchPublications, publications, onDeletePublication, selectedTeacher, onBackToTeachers, isLoadingTeachers, isLoadingPublications }) => {
  const [confirmingTeacherId, setConfirmingTeacherId] = useState(null);
  const [confirmingPublicationId, setConfirmingPublicationId] = useState(null);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="delete-modal">
        <div className="modal-header">
          <h2>Delete Teachers & Publications</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-content">
          {!selectedTeacher ? (
            <>
              <h3>All Teachers</h3>
              {isLoadingTeachers ? (
                <div className="modal-loading">Loading teachers...</div>
              ) : (
                <ul className="teacher-list">
                  {teachers.map(teacher => (
                    <li key={teacher._id} className="teacher-list-item">
                      <div className="teacher-info">
                        <span className="teacher-name">{teacher.name}</span>
                      </div>
                      <div className="teacher-actions">
                        <button
                          className="delete-btn"
                          onClick={() => setConfirmingTeacherId(teacher._id)}
                          disabled={confirmingTeacherId === teacher._id}
                        >
                          {confirmingTeacherId === teacher._id ? 'Confirm?' : 'Delete Profile'}
                        </button>
                        <button
                          className="view-pubs-btn"
                          onClick={() => onFetchPublications(teacher)}
                        >
                          View Publications
                        </button>
                        {confirmingTeacherId === teacher._id && (
                          <button
                            className="confirm-delete-btn"
                            onClick={() => { onDeleteTeacher(teacher); setConfirmingTeacherId(null); }}
                          >
                            Yes, Delete
                          </button>
                        )}
                        {confirmingTeacherId === teacher._id && (
                          <button
                            className="cancel-delete-btn"
                            onClick={() => setConfirmingTeacherId(null)}
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <>
              <button className="back-btn" onClick={onBackToTeachers}>&larr; Back to Teachers</button>
              <h3>Publications of {selectedTeacher.name}</h3>
              {isLoadingPublications ? (
                <div className="modal-loading">Loading publications...</div>
              ) : (
                <ul className="publication-list">
                  {publications.map(pub => (
                    <li key={pub._id} className="publication-list-item">
                      <div className="publication-info">
                        <span className="pub-title">{pub.title}</span>
                        <span className="pub-year">{pub.year}</span>
                        <span className="pub-authors">{pub.authors}</span>
                      </div>
                      <div className="publication-actions">
                        <button
                          className="delete-btn"
                          onClick={() => setConfirmingPublicationId(pub._id)}
                          disabled={confirmingPublicationId === pub._id}
                        >
                          {confirmingPublicationId === pub._id ? 'Confirm?' : 'Delete'}
                        </button>
                        {confirmingPublicationId === pub._id && (
                          <button
                            className="confirm-delete-btn"
                            onClick={() => { onDeletePublication(pub); setConfirmingPublicationId(null); }}
                          >
                            Yes, Delete
                          </button>
                        )}
                        {confirmingPublicationId === pub._id && (
                          <button
                            className="cancel-delete-btn"
                            onClick={() => setConfirmingPublicationId(null)}
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                  {publications.length === 0 && <li className="no-publications">No publications found.</li>}
                </ul>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default DeleteModal; 