import React, { useState, useEffect } from 'react';
import axios from 'axios';

import '../styles/ProjectRepository.css';
import ProjectDeleteModal from '../components/ProjectDeleteModal';

const API_BASE = process.env.REACT_APP_API_URL || '';
// Award add has moved to Admin page

const ProjectRepository = () => {
  const [projects, setProjects] = useState([]);
  const [isAdmin, setIsAdmin] = useState(() => localStorage.getItem('isAdminLoggedIn') === 'true');
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false); // will be hidden for non-admin view
  const [showAddMenu, setShowAddMenu] = useState(false); // removed from UI
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkFile, setBulkFile] = useState(null);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkPreview, setBulkPreview] = useState([]);
  // Award modal moved to Admin page
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [students, setStudents] = useState('');
  const [expandedYears, setExpandedYears] = useState(new Set([new Date().getFullYear()])); // Current year always expanded

  useEffect(() => {
    fetchProjects();
    fetchTeachers();
    // Listen for admin login status changes
    const handler = () => setIsAdmin(localStorage.getItem('isAdminLoggedIn') === 'true');
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/api/yearly-projects`);
      console.log('Fetched projects response:', response.data);
      setProjects(response.data.projects || []);
      setError('');
    } catch (err) {
      setError('Failed to fetch projects');
      console.error('Error fetching projects:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeachers = async () => {
    try {
      const response = await axios.get(`${API_BASE}/teachers`);
      setTeachers(response.data.teachers || []);
    } catch (err) {
      console.error('Error fetching teachers:', err);
    }
  };

  const handleAddProject = async (e) => {
    e.preventDefault();
    
    if (!selectedYear || !selectedTeacher || !projectName || !projectDescription) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const projectData = {
        year: parseInt(selectedYear),
        teacherName: selectedTeacher,
        projectName: projectName.trim(),
        projectDescription: projectDescription.trim(),
        students: students.trim() || null,
        createdAt: new Date().toISOString()
      };

      const response = await axios.post(`${API_BASE}/api/yearly-projects`, projectData);
      
      if (response.data.success) {
        // Reset form
        setSelectedYear('');
        setSelectedTeacher('');
        setProjectName('');
        setProjectDescription('');
        setStudents('');
        setShowAddForm(false);
        
        // Refresh projects list
        fetchProjects();
        
        // Expand the year if it's not already expanded
        if (!expandedYears.has(parseInt(selectedYear))) {
          setExpandedYears(prev => new Set([...prev, parseInt(selectedYear)]));
        }
        
        alert('Project added successfully!');
      }
    } catch (err) {
      setError('Failed to add project');
      console.error('Error adding project:', err);
    }
  };

  const toggleYearExpansion = (year) => {
    setExpandedYears(prev => {
      const newSet = new Set(prev);
      if (newSet.has(year)) {
        newSet.delete(year);
      } else {
        newSet.add(year);
      }
      return newSet;
    });
  };

  const getAvailableYears = () => {
    const years = [...new Set(projects.map(project => project.year))];
    return years.sort((a, b) => b - a); // Sort in descending order
  };

  const getProjectsByYear = (year) => {
    return projects.filter(project => project.year === year);
  };

  const resetForm = () => {
    setSelectedYear('');
    setSelectedTeacher('');
    setProjectName('');
    setProjectDescription('');
    setStudents('');
    setShowAddForm(false);
  };

  // Add actions moved to Admin page
  const openAddMenu = () => {};
  const openAddProject = () => {};
  const openAddBulk = () => {};

  // Award add moved to Admin page

  const handleDeleteProject = async (project) => {
    try {
      setIsDeleting(true);
      console.log('Attempting to delete project:', project);
      console.log('Project ID:', project._id);
      
      if (!project._id) {
        setError('Project ID is missing');
        return;
      }
      
      const response = await axios.delete(`${API_BASE}/api/yearly-projects/${project._id}`);
      
      if (response.data.success) {
        // Refresh projects list
        fetchProjects();
        alert('Project deleted successfully!');
      }
    } catch (err) {
      console.error('Error deleting project:', err);
      if (err.response) {
        console.error('Error response:', err.response.data);
        setError(`Failed to delete project: ${err.response.data.error || 'Unknown error'}`);
      } else {
        setError('Failed to delete project: Network error');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const openDeleteModal = (project) => {
    setProjectToDelete(project);
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setProjectToDelete(null);
  };

  if (loading) {
    return (
      <div className="project-repository-container">
        <div className="loading">Loading projects...</div>
      </div>
    );
  }

  return (
    <div className="project-repository-container">
      <div className="project-repository-header">
        <h1>Project Repository</h1>
        {/* Add actions moved to Admin page */}
      </div>

      {error && (
        <div className="error-message">
          {error}
          <button onClick={fetchProjects} className="retry-btn">Retry</button>
        </div>
      )}

      {/* Add Project Form Modal */}
      {showAddForm && (
        <div className="modal-overlay" onClick={resetForm}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add New Project</h2>
              <button className="close-btn" onClick={resetForm}>×</button>
            </div>
            
            <form onSubmit={handleAddProject} className="add-project-form">
              <div className="form-group">
                <label htmlFor="year">Select Year *</label>
                <select
                  id="year"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  required
                >
                  <option value="">Choose Year</option>
                  {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="teacher">Select Teacher *</label>
                <select
                  id="teacher"
                  value={selectedTeacher}
                  onChange={(e) => setSelectedTeacher(e.target.value)}
                  required
                >
                  <option value="">Choose Teacher</option>
                  {teachers.map(teacher => (
                    <option key={teacher.name} value={teacher.name}>
                      {teacher.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="projectName">Project Name *</label>
                <input
                  type="text"
                  id="projectName"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="Enter project name"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="projectDescription">Project Description *</label>
                <textarea
                  id="projectDescription"
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  placeholder="Enter project description"
                  rows="4"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="students">Students (Optional)</label>
                <input
                  type="text"
                  id="students"
                  value={students}
                  onChange={(e) => setStudents(e.target.value)}
                  placeholder="Enter student names (comma separated)"
                />
              </div>

              <div className="form-actions">
                <button type="button" onClick={resetForm} className="cancel-btn">
                  Cancel
                </button>
                <button type="submit" className="submit-btn">
                  Submit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Upload Modal */}
      {showBulkModal && (
        <div className="modal-overlay" onClick={() => setShowBulkModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Bulk Upload Projects (Excel)</h2>
              <button className="close-btn" onClick={() => setShowBulkModal(false)}>×</button>
            </div>
            <div style={{ marginBottom: 12 }}>
              <p>Please upload an .xlsx file with columns: <b>group_id, name, srn, mentor, project_title, project_description, year, report, poster</b>.</p>
            </div>
            <input
              type="file"
              accept=".xlsx"
              onChange={(e) => setBulkFile(e.target.files?.[0] || null)}
            />
            <div className="form-actions" style={{ marginTop: 16 }}>
              <button className="cancel-btn" onClick={() => { setShowBulkModal(false); setBulkFile(null); setBulkPreview([]); }}>Cancel</button>
              <button className="submit-btn" disabled={!bulkFile || bulkUploading} onClick={async () => {
                if (!bulkFile) return;
                try {
                  setBulkUploading(true);
                  const formData = new FormData();
                  formData.append('file', bulkFile);
                  const API_BASE = process.env.REACT_APP_API_URL || '';
                  const resp = await axios.post(`${API_BASE}/api/yearly-projects/bulk`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                  });
                  if (resp.data && resp.data.success) {
                    setBulkPreview(resp.data.preview || []);
                    // Refresh list
                    fetchProjects();
                    // Expand all years found
                    const years = new Set([ ...expandedYears, ...((resp.data.preview || []).map(p => p.year)) ]);
                    setExpandedYears(years);
                    const skipped = (resp.data.skipped || []).length;
                    const inserted = (resp.data.inserted || []).length;
                    alert(`Imported ${inserted} group(s). Skipped ${skipped} duplicate group(s).`);
                  } else {
                    alert('Import failed');
                  }
                } catch (e) {
                  alert(e?.response?.data?.error || e.message || 'Import failed');
                } finally {
                  setBulkUploading(false);
                }
              }}>{bulkUploading ? 'Uploading...' : 'Upload'}</button>
            </div>

            {bulkPreview.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <h3>Preview</h3>
                {bulkPreview.map((item, idx) => (
                  <div key={idx} className="project-card" style={{ marginBottom: 8 }}>
                    <div className="project-header">
                      <h4 className="project-title">{item.projectName}</h4>
                      <span className="project-teacher">{item.teacherName}</span>
                    </div>
                    <p className="project-description">{item.projectDescription}</p>
                    {Array.isArray(item.students) && item.students.length > 0 && (
                      <div className="project-students">
                        <strong>Students:</strong> {item.students.map(s => `${s.name} (${s.srn})`).join(', ')}
                      </div>
                    )}
                    {/* Do not show report/poster links in preview */}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Projects Display */}
      <div className="projects-section">
        <h2>Projects by Year</h2>
        
        {projects.length === 0 ? (
          <div className="no-projects">
            <p>No projects found. Click "Add Project" to get started.</p>
          </div>
        ) : (
          <div className="yearly-projects">
            {getAvailableYears().map(year => (
              <div key={year} className="year-section">
                <div 
                  className="year-header"
                  onClick={() => toggleYearExpansion(year)}
                >
                  <h3>{year}</h3>
                  <span className="project-count">
                    {getProjectsByYear(year).length} project{getProjectsByYear(year).length !== 1 ? 's' : ''}
                  </span>
                  <span className={`expand-icon ${expandedYears.has(year) ? 'expanded' : ''}`}>
                    ▼
                  </span>
                </div>
                
                {expandedYears.has(year) && (
                  <div className="projects-list">
                    {getProjectsByYear(year).map((project, index) => (
                      <div key={index} className="project-card">
                        <div className="project-header">
                          <h4 className="project-title">{project.projectName}</h4>
                          <span className="project-teacher">{project.teacherName}</span>
                        </div>
                        <p className="project-description">{project.projectDescription}</p>
                        {project.students && (
                          <div className="project-students">
                            <strong>Students:</strong>{' '}
                            {Array.isArray(project.students)
                              ? project.students
                                  .filter(s => s && (s.name || s.srn))
                                  .map(s => `${s.name || ''}${s.srn ? ` (${s.srn})` : ''}`)
                                  .join(', ')
                              : project.students}
                          </div>
                        )}
                        {(project.report || project.poster) && (
                          <div className="project-students" style={{ marginTop: 6 }}>
                            {project.report && (
                              <a href={project.report} target="_blank" rel="noreferrer" style={{ textDecoration: 'underline', marginRight: 12 }}>report</a>
                            )}
                            {project.poster && (
                              <a href={project.poster} target="_blank" rel="noreferrer" style={{ textDecoration: 'underline' }}>poster</a>
                            )}
                          </div>
                        )}
                        <div className="project-meta">
                          <span className="project-date">
                            Added: {new Date(project.createdAt).toLocaleDateString()}
                          </span>
                          {isAdmin && (
                            <button 
                              className="delete-project-btn"
                              onClick={() => openDeleteModal(project)}
                              title="Delete Project"
                            >
                              🗑️ Delete
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Project Modal */}
      <ProjectDeleteModal
        isOpen={showDeleteModal}
        onClose={closeDeleteModal}
        project={projectToDelete}
        onDeleteProject={handleDeleteProject}
        isLoading={isDeleting}
      />
      {/* Award add moved to Admin page */}
    </div>
  );
};

export default ProjectRepository;
