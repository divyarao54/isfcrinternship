import React, { useState } from 'react';
import '../styles/admin.css';

const ProjectDeleteModal = ({ isOpen, onClose, project, onDeleteProject, isLoading }) => {
  const [isConfirming, setIsConfirming] = useState(false);

  if (!isOpen || !project) return null;

  const handleDelete = async () => {
    if (isConfirming) {
      await onDeleteProject(project);
      setIsConfirming(false);
      onClose();
    } else {
      setIsConfirming(true);
    }
  };

  const handleCancel = () => {
    setIsConfirming(false);
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="delete-modal">
        <div className="modal-header">
          <h2>Delete Project</h2>
          <button className="close-btn" onClick={handleCancel}>&times;</button>
        </div>
        <div className="modal-content">
          <div className="delete-confirmation">
            <h3>Are you sure you want to delete this project?</h3>
            <div className="project-details">
              <p><strong>Project Name:</strong> {project.projectName}</p>
              <p><strong>Teacher:</strong> {project.teacherName}</p>
              <p><strong>Year:</strong> {project.year}</p>
              <p><strong>Description:</strong> {project.projectDescription}</p>
              {project.students && (
                <p>
                  <strong>Students:</strong>{' '}
                  {Array.isArray(project.students)
                    ? project.students
                        .filter(s => s && (s.name || s.srn))
                        .map(s => `${s.name || ''}${s.srn ? ` (${s.srn})` : ''}`)
                        .join(', ')
                    : project.students}
                </p>
              )}
            </div>
            <div className="warning-message">
              <p>⚠️ This action cannot be undone. The project will be permanently removed from the database.</p>
            </div>
            <div className="delete-actions">
              {!isConfirming ? (
                <button
                  className="delete-btn"
                  onClick={handleDelete}
                  disabled={isLoading}
                >
                  {isLoading ? 'Deleting...' : 'Delete Project'}
                </button>
              ) : (
                <>
                  <button
                    className="confirm-delete-btn"
                    onClick={handleDelete}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Deleting...' : 'Yes, Delete Permanently'}
                  </button>
                  <button
                    className="cancel-delete-btn"
                    onClick={handleCancel}
                    disabled={isLoading}
                  >
                    Cancel
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectDeleteModal;
