import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './DomainTiles.css';

const DomainTiles = () => {
  const [domains, setDomains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDomain, setSelectedDomain] = useState(null);
  const [domainTeachers, setDomainTeachers] = useState([]);
  const [showTeachersModal, setShowTeachersModal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDomains();
  }, []);

  const fetchDomains = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:5000/api/domains');
      setDomains(response.data.domains);
      setError(null);
    } catch (err) {
      setError('Failed to fetch domains');
      console.error('Error fetching domains:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDomainClick = async (domainName) => {
    try {
      setSelectedDomain(domainName);
      const response = await axios.get(`http://localhost:5000/api/domains/${encodeURIComponent(domainName)}/teachers`);
      setDomainTeachers(response.data.teachers);
      setShowTeachersModal(true);
    } catch (err) {
      console.error('Error fetching teachers for domain:', err);
      setError('Failed to fetch teachers for this domain');
    }
  };

  const handleTeacherClick = (teacherName) => {
    navigate(`/teachers/${encodeURIComponent(teacherName)}`);
    setShowTeachersModal(false);
  };

  const closeModal = () => {
    setShowTeachersModal(false);
    setSelectedDomain(null);
    setDomainTeachers([]);
  };

  if (loading) {
    return (
      <div className="domain-tiles-container">
        <div className="loading-spinner">Loading domains...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="domain-tiles-container">
        <div className="error-message">{error}</div>
      </div>
    );
  }

  return (
    <div className="domain-tiles-container">
      <h3 className="domain-tiles-title">Research Domains</h3>
      <div className="domain-tiles-grid">
        {domains.map((domain, index) => (
          <div
            key={index}
            className="domain-tile"
            onClick={() => handleDomainClick(domain.domainName)}
          >
            <div className="domain-tile-content">
              <h4 className="domain-name">{domain.domainName}</h4>
            </div>
          </div>
        ))}
      </div>

      {/* Teachers Modal */}
      {showTeachersModal && (
        <div className="teachers-modal-overlay" onClick={closeModal}>
          <div className="teachers-modal" onClick={(e) => e.stopPropagation()}>
            <div className="teachers-modal-header">
              <h3>Teachers in {selectedDomain}</h3>
              <button className="close-button" onClick={closeModal}>×</button>
            </div>
            <div className="teachers-modal-content">
              {domainTeachers.length === 0 ? (
                <p>No teachers found in this domain.</p>
              ) : (
                <div className="teachers-list">
                  {domainTeachers.map((teacher, index) => (
                    <div
                      key={index}
                      className="teacher-item"
                      onClick={() => handleTeacherClick(teacher.teacherName)}
                    >
                      <div className="teacher-name">{teacher.teacherName}</div>
                      <div className="teacher-view-button">
                        <button 
                          className="view-teacher-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTeacherClick(teacher.teacherName);
                          }}
                        >
                          View
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DomainTiles; 