import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './ProjectRepository.css';
import ProjectDeleteModal from '../components/ProjectDeleteModal';
import AwardModal from '../components/AwardModal';

const ProjectRepository = () => {
  const [projects, setProjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showAwardModal, setShowAwardModal] = useState(false);
  const [isUploadingAward, setIsUploadingAward] = useState(false);
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
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:5000/api/yearly-projects');
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
      const response = await axios.get('http://localhost:5000/teachers');
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

      const response = await axios.post('http://localhost:5000/api/yearly-projects', projectData);
      
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

  const openAddMenu = () => setShowAddMenu(prev => !prev);
  const openAddProject = () => { setShowAddMenu(false); setShowAddForm(true); };
  const openAddAward = () => { setShowAddMenu(false); setShowAwardModal(true); };
  const closeAwardModal = () => setShowAwardModal(false);

  const handleAddAward = async (awardName, file) => {
    try {
      setIsUploadingAward(true);
      const formData = new FormData();
      formData.append('awardName', awardName);
      formData.append('image', file);
      // Let axios set the proper multipart boundary automatically
      const resp = await axios.post('http://localhost:5000/api/awards', formData);
      if (resp.data && resp.data.success) {
        alert('Award uploaded successfully');
        setShowAwardModal(false);
      }
    } catch (e) {
      console.error('Failed to upload award', e);
      alert('Failed to upload award');
    } finally {
      setIsUploadingAward(false);
    }
  };

  const handleDeleteProject = async (project) => {
    try {
      setIsDeleting(true);
      console.log('Attempting to delete project:', project);
      console.log('Project ID:', project._id);
      
      if (!project._id) {
        setError('Project ID is missing');
        return;
      }
      
      const response = await axios.delete(`http://localhost:5000/api/yearly-projects/${project._id}`);
      
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
        <div className="add-actions">
          <button className="add-main-btn" onClick={openAddMenu}>+ Add</button>
          {showAddMenu && (
            <div className="add-menu">
              <button onClick={openAddProject}>+ Add Project</button>
              <button onClick={openAddAward}>+ Add Award</button>
            </div>
          )}
        </div>
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
                            <strong>Students:</strong> {project.students}
                          </div>
                        )}
                        <div className="project-meta">
                          <span className="project-date">
                            Added: {new Date(project.createdAt).toLocaleDateString()}
                          </span>
                          <button 
                            className="delete-project-btn"
                            onClick={() => openDeleteModal(project)}
                            title="Delete Project"
                          >
                            🗑️ Delete
                          </button>
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
      {/* Award Modal */}
      <AwardModal isOpen={showAwardModal} onClose={closeAwardModal} onSubmit={handleAddAward} isUploading={isUploadingAward} />
    </div>
  );
};

export default ProjectRepository;
