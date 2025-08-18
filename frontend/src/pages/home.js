import React, { useState, useEffect } from "react";
import YearlyCommunityDashboard from "../pages/YearlyCommunityDashboard";
// import Navbar from "../components/navbar";
import "../styles/home.css";
// import ThreeDBarChart from "../components/ThreeDBarChart";
import axios from "axios";
// import PatentForm from '../components/PatentForm';
// import PublicationTypeSelector from '../components/PublicationTypeSelector';
// import PublicationForm from '../components/PatentForm';

const Home = () => {
    // Removed unused states to satisfy linter
    // const [teacherMetrics, setTeacherMetrics] = useState([]);

    useEffect(() => {
        // Fetch teacher metrics for 3D chart
        const fetchMetrics = async () => {
            try {
                const teachersResp = await axios.get('http://localhost:5000/teachers');
                const teachers = teachersResp.data.teachers || [];
                await Promise.all(teachers.map(async (teacher) => {
                    let hIndex = 0, i10Index = 0, publications = 0;
                    try {
                        const citRes = await axios.get(`http://localhost:5000/teachers/${encodeURIComponent(teacher.name)}/citations/scraped`);
                        hIndex = citRes.data.hIndex || 0;
                        i10Index = citRes.data.i10Index || 0;
                    } catch {}
                    try {
                        const pubRes = await axios.get(`http://localhost:5000/teachers/${encodeURIComponent(teacher.name)}/publications`);
                        publications = Array.isArray(pubRes.data.publications) ? pubRes.data.publications.length : 0;
                    } catch {}
                    return {
                        name: teacher.name,
                        hIndex,
                        i10Index,
                        publications
                    };
                }));
                // setTeacherMetrics(metrics);
            } catch (err) {
                // ignore
            }
        };
        fetchMetrics();
    }, []);

    // Removed unused handlers for patent UI

    return (
        <div className="home-container" style={{backgroundColor: '#f4f6f8', width: '1500px', marginLeft: '-10px', overflow: 'hidden'}}>
            {/*<Navbar />*/}
            {/* Dashboard at the top */}
            <div className="dashboard-container" style={{display: 'flex', flexDirection: 'row'}}>
                <div className="dashboard-item">
                    <YearlyCommunityDashboard />
                </div>
            </div>
            {/* 3D Bar Chart below Donut Chart */}
            {/*<div style={{ marginTop: 40, marginBottom: 40 }}>
                <h2 style={{ textAlign: 'center', marginBottom: 20 }}>Teacher Metrics 3D Bar Chart</h2>
                <ThreeDBarChart data={teacherMetrics} />
            </div>*/}
        </div>
    );
};

export default Home;