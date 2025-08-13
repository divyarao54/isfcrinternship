import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './PatentList.css';

const PatentList = ({ teacherName, onClose, onEditPatent }) => {
    const [patents, setPatents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchPatents();
    }, [teacherName]);

    const fetchPatents = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`http://localhost:5000/teachers/${encodeURIComponent(teacherName)}/patents`);
            setPatents(response.data.patents || []);
            setError('');
        } catch (error) {
            console.error('Error fetching patents:', error);
            setError('Failed to load patents. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (patent) => {
        onEditPatent(patent);
    };

    const handleDelete = async (patentId) => {
        if (window.confirm('Are you sure you want to delete this patent?')) {
            try {
                await axios.delete(`http://localhost:5000/patents/${patentId}`);
                alert('Patent deleted successfully!');
                fetchPatents(); // Refresh the list
            } catch (error) {
                console.error('Error deleting patent:', error);
                alert('Failed to delete patent. Please try again.');
            }
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        try {
            return new Date(dateString).toLocaleDateString();
        } catch {
            return 'N/A';
        }
    };

    return (
        <div className="patent-list-overlay">
            <div className="patent-list-modal">
                <div className="patent-list-header">
                    <h2>Patents for {teacherName}</h2>
                    <button className="close-btn" onClick={onClose}>×</button>
                </div>

                {error && <div className="error-message">{error}</div>}

                {loading ? (
                    <div className="loading">Loading patents...</div>
                ) : patents.length === 0 ? (
                    <div className="no-patents">
                        <p>No patents found for this teacher.</p>
                    </div>
                ) : (
                    <div className="patents-container">
                        <ul className="patents-list-titles">
                            {patents.map((patent, index) => (
                                <li key={patent._id || index} className="patent-title-item">
                                    <span className="patent-title-text">{patent.patentTitle}</span>
                                    <span className="patent-title-actions">
                                        <button 
                                            className="edit-btn"
                                            onClick={() => handleEdit(patent)}
                                            title="Edit Patent"
                                        >
                                            ✏️ Edit
                                        </button>
                                        <button 
                                            className="delete-btn"
                                            onClick={() => handleDelete(patent._id)}
                                            title="Delete Patent"
                                        >
                                            🗑️ Delete
                                        </button>
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PatentList; 