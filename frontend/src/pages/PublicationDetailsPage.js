import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import "../styles/publicationDetails.css";

const PublicationDetailsPage = () => {
    const { teacherId, publicationId } = useParams();
    const navigate = useNavigate();
    const [publication, setPublication] = useState(null);
    const [teacher, setTeacher] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const fetchPublicationData = useCallback(async () => {
        try {
            setLoading(true);
            
            // Fetch teacher details
            const teacherResponse = await axios.get(`http://localhost:5000/teachers/${teacherId}`);
            setTeacher(teacherResponse.data.teacher);
            
            // Fetch publication details
            const publicationResponse = await axios.get(`http://localhost:5000/teachers/${teacherId}/publications/${publicationId}`);
            setPublication(publicationResponse.data.publication);
            
            setError("");
        } catch (error) {
            console.error("Error fetching publication data:", error);
            setError("Failed to load publication information. Please try again later.");
        } finally {
            setLoading(false);
        }
    }, [teacherId, publicationId]);

    useEffect(() => {
        fetchPublicationData();
    }, [fetchPublicationData]);

    if (loading) {
        return (
            <div className="publication-details-container">
                <div className="loading">Loading publication details...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="publication-details-container">
                <div className="error">{error}</div>
                <button onClick={() => navigate(`/teachers/${teacherId}`)} className="back-btn">
                    Back to Teacher
                </button>
            </div>
        );
    }

    if (!publication) {
        return (
            <div className="publication-details-container">
                <div className="error">Publication not found</div>
                <button onClick={() => navigate(`/teachers/${teacherId}`)} className="back-btn">
                    Back to Teacher
                </button>
            </div>
        );
    }

    const getPublicationType = () => {
        if (publication.conference) return `Conference: ${publication.conference}`;
        if (publication.journal) return `Journal: ${publication.journal}`;
        if (publication.source) return `Source: ${publication.source}`;
        return "Publication type not specified";
    };

    return (
        <div className="publication-details-container">
            <button onClick={() => navigate(`/teachers/${teacherId}`)} className="back-btn">
                ← Back to {teacher?.name || 'Teacher'}
            </button>
            
            <div className="publication-details">
                <div className="publication-header">
                    <h1>{publication.title}</h1>
                    <p className="teacher-name">by {teacher?.name}</p>
                </div>

                <div className="publication-info">
                    <div className="info-section">
                        <h3>Authors</h3>
                        <p>{publication.authors || 'Not specified'}</p>
                    </div>

                    <div className="info-section">
                        <h3>Publication Date</h3>
                        <p>{publication.year || 'Not specified'}</p>
                    </div>

                    <div className="info-section">
                        <h3>Publication Type</h3>
                        <p>{getPublicationType()}</p>
                    </div>

                    {publication.volume && (
                        <div className="info-section">
                            <h3>Volume</h3>
                            <p>{publication.volume}</p>
                        </div>
                    )}

                    {publication.issue && (
                        <div className="info-section">
                            <h3>Issue</h3>
                            <p>{publication.issue}</p>
                        </div>
                    )}

                    {publication.pages && (
                        <div className="info-section">
                            <h3>Pages</h3>
                            <p>{publication.pages}</p>
                        </div>
                    )}

                    {publication.publisher && (
                        <div className="info-section">
                            <h3>Publisher</h3>
                            <p>{publication.publisher}</p>
                        </div>
                    )}

                    <div className="info-section">
                        <h3>Total Citations</h3>
                        <p className="citation-count">{publication.citationCount || 0}</p>
                    </div>

                    {publication.pdfLink && (
                        <div className="info-section">
                            <h3>PDF Link</h3>
                            <a 
                                href={publication.pdfLink} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="pdf-link"
                            >
                                View PDF
                            </a>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PublicationDetailsPage; 