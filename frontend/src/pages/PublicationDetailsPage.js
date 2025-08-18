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
    const [summary, setSummary] = useState(null);
    const [summarizing, setSummarizing] = useState(false);
    const [summaryError, setSummaryError] = useState("");
    const [showUploadOption, setShowUploadOption] = useState(false);
    const [uploading, setUploading] = useState(false);

    // Check for ongoing summarization on component mount
    useEffect(() => {
        const ongoingSummarization = localStorage.getItem('ongoingSummarization');
        if (ongoingSummarization) {
            const summaryData = JSON.parse(ongoingSummarization);
            if (summaryData.teacherId === teacherId && summaryData.publicationId === publicationId) {
                setSummarizing(true);
                setSummaryError("");
                setSummary(null);
            }
        }
    }, [teacherId, publicationId]);

    // Check summarization status periodically
    useEffect(() => {
        if (summarizing) {
            const checkSummarizationStatus = async () => {
                try {
                    const ongoingSummarization = localStorage.getItem('ongoingSummarization');
                    if (ongoingSummarization) {
                        const summaryData = JSON.parse(ongoingSummarization);
                        if (summaryData.teacherId === teacherId && summaryData.publicationId === publicationId) {
                            // Check if summarization is complete
                            const response = await axios.get(`http://localhost:5000/api/summarization_status/${summaryData.taskId}`);
                            if (response.data.status === 'completed') {
                                setSummary(response.data.summary);
                                setSummarizing(false);
                                localStorage.removeItem('ongoingSummarization');
                            } else if (response.data.status === 'failed') {
                                setSummaryError(response.data.error || 'Summarization failed');
                                setSummarizing(false);
                                localStorage.removeItem('ongoingSummarization');
                            }
                            // If still running, continue checking
                        }
                    }
                } catch (error) {
                    console.error("Error checking summarization status:", error);
                }
            };

            const interval = setInterval(checkSummarizationStatus, 2000); // Check every 2 seconds
            return () => clearInterval(interval);
        }
    }, [summarizing, teacherId, publicationId]);

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

    const handleSummarize = async () => {
        if (!publication.pdfLink) {
            setSummaryError("No PDF link available for summarization");
            return;
        }

        try {
            setSummarizing(true);
            setSummaryError("");
            setSummary(null);
            setShowUploadOption(false);

            // Store summarization state in localStorage
            const summaryData = {
                teacherId,
                publicationId,
                pdfUrl: publication.pdfLink,
                startTime: new Date().toISOString()
            };
            localStorage.setItem('ongoingSummarization', JSON.stringify(summaryData));

            const response = await axios.post('http://localhost:5000/api/summarize_pdf', {
                pdf_url: publication.pdfLink
            });

            // If summarization completes immediately
            if (response.data.summary) {
                setSummary(response.data.summary);
                setSummarizing(false);
                localStorage.removeItem('ongoingSummarization');
            } else if (response.data.taskId) {
                // Update localStorage with taskId for background processing
                summaryData.taskId = response.data.taskId;
                localStorage.setItem('ongoingSummarization', JSON.stringify(summaryData));
            }
        } catch (error) {
            console.error("Error summarizing PDF:", error);
            const errorData = error.response?.data;
            const errorMessage = errorData?.error || "Failed to summarize PDF. Please try again.";
            const errorDetails = errorData?.details || "";
            
            setSummaryError(errorMessage + (errorDetails ? `\n\n${errorDetails}` : ""));
            setSummarizing(false);
            localStorage.removeItem('ongoingSummarization');
            
            // Show upload option for certain errors
            if (errorData?.suggestion === 'upload' || 
                errorMessage.includes('IEEE Explore') || 
                errorMessage.includes('authentication') || 
                errorMessage.includes('protected') ||
                errorMessage.includes('login page')) {
                setShowUploadOption(true);
            }
        }
    };

    const handleFileUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        if (!file.name.toLowerCase().endsWith('.pdf')) {
            setSummaryError("Please select a PDF file");
            return;
        }

        try {
            setUploading(true);
            setSummaryError("");
            setSummary(null);

            // Store upload summarization state
            const summaryData = {
                teacherId,
                publicationId,
                fileName: file.name,
                startTime: new Date().toISOString()
            };
            localStorage.setItem('ongoingSummarization', JSON.stringify(summaryData));

            const formData = new FormData();
            formData.append('file', file);

            const response = await axios.post('http://localhost:5000/api/summarize_pdf_upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            setSummary(response.data.summary);
            setShowUploadOption(false);
            setUploading(false);
            localStorage.removeItem('ongoingSummarization');
        } catch (error) {
            console.error("Error uploading and summarizing PDF:", error);
            setSummaryError(error.response?.data?.error || "Failed to summarize uploaded PDF. Please try again.");
            setUploading(false);
            localStorage.removeItem('ongoingSummarization');
        }
    };

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