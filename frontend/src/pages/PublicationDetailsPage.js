import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import "../styles/publicationDetails.css";

const PublicationDetailsPage = () => {
    const { teacherId, publicationId } = useParams();
    const [publication, setPublication] = useState(null);
    const [teacher, setTeacher] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    // Summarization UI removed

    // Summarization removed

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

    // Summarization removed

    // Summarization removed

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
            </div>
        );
    }

    if (!publication) {
        return (
            <div className="publication-details-container">
                <div className="error">Publication not found</div>
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
            <div className="publication-details">
                <div className="publication-header">
                    <h1>{publication.title}</h1>
                    <p className="teacher-name">by {teacher?.name}</p>
                </div>

                <div className="publication-info">
                    {publication.patent ? (
                        <>
                            <div className="info-section">
                                <h3>Inventors</h3>
                                <p>{publication.inventors || 'Not specified'}</p>
                            </div>
                            <div className="info-section">
                                <h3>Publication Type</h3>
                                <p>Patent</p>
                            </div>
                            {publication.patentOffice && (
                                <div className="info-section">
                                    <h3>Patent Office</h3>
                                    <p>{publication.patentOffice}</p>
                                </div>
                            )}
                            {publication.patentNumber && (
                                <div className="info-section">
                                    <h3>Patent Number</h3>
                                    <p>{publication.patentNumber}</p>
                                </div>
                            )}
                            {publication.applicationNumber && (
                                <div className="info-section">
                                    <h3>Application Number</h3>
                                    <p>{publication.applicationNumber}</p>
                                </div>
                            )}
                        </>
                    ) : (
                        <>
                    <div className="info-section">
                        <h3>Authors</h3>
                        <p>{publication.authors || 'Not specified'}</p>
                    </div>
                    <div className="info-section">
                        <h3>Publication Type</h3>
                        <p>{getPublicationType()}</p>
                    </div>
                        </>
                    )}

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
                            {/*<button 
                                onClick={handleSummarize}
                                disabled={summarizing}
                                className="summarize-btn"
                            >
                                {summarizing ? "Summarizing..." : "Summarize Paper"}
                            </button>*/}
                        </div>
                    )}

                    {/* Always show file upload option */}
                    {/*<div className="info-section">
                        <h3>Upload PDF for Summarization</h3>
                        <p>If the PDF link doesn't work or you have a local copy, you can upload it directly:</p>
                        <input
                            type="file"
                            accept=".pdf"
                            onChange={handleFileUpload}
                            disabled={uploading}
                            className="file-input"
                        />
                        {uploading && <p className="uploading-text">Uploading and summarizing...</p>}
                    </div>

                    {summaryError && (
                        <div className="info-section">
                            <h3>Summarization Error</h3>
                            <p className="error-message">{summaryError}</p>
                        </div>
                    )}

                    {summary && (
                        <div className="info-section">
                            <h3>AI Summary</h3>
                            <div className="summary-content">
                                <pre>{summary}</pre>
                            </div>
                        </div>
                    )}*/}
                </div>
            </div>
        </div>
    );
};

export default PublicationDetailsPage; 