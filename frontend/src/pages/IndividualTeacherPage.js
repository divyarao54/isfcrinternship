import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import "../styles/individualTeacher.css";

const IndividualTeacherPage = () => {
    const { teacherId } = useParams();
    const navigate = useNavigate();
    const [teacher, setTeacher] = useState(null);
    const [publications, setPublications] = useState([]);
    const [displayCount, setDisplayCount] = useState(5);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const fetchTeacherData = useCallback(async () => {
        try {
            setLoading(true);
            // Fetch teacher details
            const teacherResponse = await axios.get(`http://localhost:5000/teachers/${teacherId}`);
            setTeacher(teacherResponse.data.teacher);
            // Fetch publications
            const pubsResponse = await axios.get(`http://localhost:5000/teachers/${teacherId}/publications`);
            setPublications(pubsResponse.data.publications || []);
            setError("");
        } catch (error) {
            console.error("Error fetching teacher data:", error);
            setError("Failed to load teacher information. Please try again later.");
        } finally {
            setLoading(false);
        }
    }, [teacherId]);

    useEffect(() => {
        fetchTeacherData();
    }, [fetchTeacherData]);

    const handleShowMore = () => {
        setDisplayCount(prev => prev + 20);
    };

    const handleShowLess = () => {
        setDisplayCount(5);
    };

    if (loading) {
        return (
            <div className="individual-teacher-container">
                <div className="loading">Loading teacher information...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="individual-teacher-container">
                <div className="error">{error}</div>
                <button onClick={fetchTeacherData} className="retry-btn">Retry</button>
            </div>
        );
    }

    if (!teacher) {
        return (
            <div className="individual-teacher-container">
                <div className="error">Teacher not found</div>
                <button onClick={() => navigate('/teachers')} className="back-btn">Back to Teachers</button>
            </div>
        );
    }

    const displayedPublications = publications.slice(0, displayCount);
    const hasMorePublications = displayCount < publications.length;
    const hasShownMore = displayCount > 5;

    return (
        <div className="individual-teacher-container">
            <button onClick={() => navigate('/teachers')} className="back-btn">
                ← Back to Teachers
            </button>
            
            <div className="teacher-profile">
                <div className="teacher-header">
                    <div className="teacher-photo">
                        {teacher.photoUrl ? (
                            <img 
                                src={teacher.photoUrl} 
                                alt={teacher.name}
                                loading="lazy"
                                onError={(e) => {
                                    e.target.src = "https://via.placeholder.com/400x400/1976d2/ffffff?text=No+Photo";
                                }}
                            />
                        ) : (
                            <img 
                                src="https://via.placeholder.com/400x400/1976d2/ffffff?text=No+Photo" 
                                alt={teacher.name}
                                loading="lazy"
                            />
                        )}
                    </div>
                    <div className="teacher-info">
                        <h1>{teacher.name}</h1>
                    </div>
                </div>
                {/* Publications Section */}
                <div className="teacher-publications">
                    <h2>Top Publications</h2>
                    {publications.length === 0 ? (
                        <div className="no-publications">No publications found.</div>
                    ) : (
                        <>
                        <ul className="publications-list">
                            {displayedPublications.map((pub, idx) => (
                                <li 
                                    key={idx} 
                                    className="publication-item"
                                    onClick={() => {
                                        const publicationId = encodeURIComponent(pub.title);
                                        navigate(`/teachers/${teacherId}/publications/${publicationId}`);
                                    }}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <span className="pub-title">{pub.title}</span>
                                    <span className="pub-citations">Citations: {pub.citationCount ?? 0}</span>
                                    <span className="pub-year">Year: {pub.year ?? 'N/A'}</span>
                                </li>
                            ))}
                        </ul>
                        <div className="publication-controls">
                            {hasMorePublications && (
                                <button className="show-more-btn" onClick={handleShowMore}>
                                    Show More ({publications.length - displayCount} remaining)
                                </button>
                            )}
                            {hasShownMore && (
                                <button className="show-less-btn" onClick={handleShowLess}>
                                    Show Less
                                </button>
                            )}
                        </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default IndividualTeacherPage; 