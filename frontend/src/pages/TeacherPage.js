import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "../styles/teacher.css";

const TeacherPage = () => {
    const [teachers, setTeachers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const navigate = useNavigate();

    useEffect(() => {
        fetchTeachers();
    }, []);

    const fetchTeachers = async () => {
        try {
            setLoading(true);
            const response = await axios.get("http://localhost:5000/teachers");
            setTeachers(response.data.teachers || []);
            setError("");
        } catch (error) {
            console.error("Error fetching teachers:", error);
            setError("Failed to load teachers. Please try again later.");
        } finally {
            setLoading(false);
        }
    };

    const handleTeacherClick = (teacher) => {
        // Use teacher's name as the ID for routing (more reliable than URL encoding)
        const teacherId = encodeURIComponent(teacher.name);
        navigate(`/teachers/${teacherId}`);
    };

    if (loading) {
        return (
            <div className="teacher-container">
                <h2>Our Teachers</h2>
                <div className="loading">Loading teachers...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="teacher-container">
                <h2>Our Teachers</h2>
                <div className="error">{error}</div>
                <button onClick={fetchTeachers} className="retry-btn">Retry</button>
            </div>
        );
    }

    return (
        <div className="teacher-container">
            <h2>Our Teachers</h2>
            {teachers.length === 0 ? (
                <div className="no-teachers">No teachers found in the database.</div>
            ) : (
                <div className="teachers-grid">
                    {teachers.map((teacher, index) => (
                        <div 
                            key={index} 
                            className="teacher-card"
                            onClick={() => handleTeacherClick(teacher)}
                            style={{ cursor: 'pointer' }}
                        >
                            <div className="teacher-image">
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
                                <h3>{teacher.name}</h3>
                                <p className="last-updated">
                                    Last updated: {new Date(teacher.lastUpdated).toLocaleDateString()}
                                </p>
                                <a 
                                    href={teacher.profileUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="profile-link"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    View Google Scholar Profile
                                </a>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default TeacherPage;