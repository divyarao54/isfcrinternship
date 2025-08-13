import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import PatentForm from "../components/PatentForm";
//import PatentList from "../components/PatentList";
import "../styles/individualTeacher.css";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { BarChart, Bar, Cell } from 'recharts';
import PublicationTypeSelector from '../components/PublicationTypeSelector';
import PublicationForm from '../components/PatentForm';

const IndividualTeacherPage = () => {
    const { teacherId } = useParams();
    const navigate = useNavigate();
    const [teacher, setTeacher] = useState(null);
    const [publications, setPublications] = useState([]);
    const [displayCount, setDisplayCount] = useState(5);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [citationsLoading, setCitationsLoading] = useState(true);
    const [citationsError, setCitationsError] = useState("");
    const [citationsData, setCitationsData] = useState([]);
    const [citationsInfo, setCitationsInfo] = useState(null);
    const [stats, setStats] = useState(null);
    const [statsLoading, setStatsLoading] = useState(true);
    const [statsError, setStatsError] = useState("");
    const [drillDownView, setDrillDownView] = useState(null); // 'books', 'patents', 'journals', 'conferences'
    const [showPatentForm, setShowPatentForm] = useState(false);
    const [showTypeSelector, setShowTypeSelector] = useState(false);
    const [selectedType, setSelectedType] = useState(null);
    const handlePatentSuccess = () => {
        setShowPatentForm(false);
        alert('Publication added successfully!');
        fetchTeacherData(); // Refresh publications
    };

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

    useEffect(() => {
        const fetchCitations = async () => {
            setCitationsLoading(true);
            setCitationsError("");
            try {
                // Only fetch the already scraped data
                const res = await axios.get(`http://localhost:5000/teachers/${teacherId}/citations/scraped`);
                const perYear = res.data.citationsPerYear || {};
                // Convert to array for recharts: [{ year, citations }]
                const arr = Object.entries(perYear)
                    .map(([year, citations]) => ({ year: parseInt(year), citations: Number(citations) }))
                    .sort((a, b) => a.year - b.year);
                setCitationsData(arr);
                setCitationsInfo({
                    totalCitations: res.data.totalCitations,
                    lastUpdated: res.data.lastUpdated,
                    hIndex: res.data.hIndex,
                    i10Index: res.data.i10Index
                });
                if (Object.keys(perYear).length === 0) {
                    setCitationsError("No citation data available. Citations may not have been scraped yet.");
                }
            } catch (err) {
                console.error("Error fetching citations:", err);
                setCitationsError("Failed to load citation data. Citations may not have been scraped yet.");
            } finally {
                setCitationsLoading(false);
            }
        };
        fetchCitations();
    }, [teacherId]);

    useEffect(() => {
        const fetchStats = async () => {
            setStatsLoading(true);
            setStatsError("");
            try {
                const res = await axios.get(`http://localhost:5000/teachers/${teacherId}/stats`);
                setStats(res.data);
            } catch (err) {
                setStatsError("Failed to load stats.");
            } finally {
                setStatsLoading(false);
            }
        };
        fetchStats();
    }, [teacherId]);

    const handleShowMore = () => {
        setDisplayCount(prev => prev + 20);
    };

    const handleShowLess = () => {
        setDisplayCount(5);
    };

    // Filter publications for graphs and drilldowns to only those from 2018 and after
    const filteredPublications = publications.filter(pub => {
        const yearNum = parseInt(pub.year);
        return !isNaN(yearNum) && yearNum >= 2018;
    });

    // Recalculate stats based on filtered publications (2018 onwards only)
    const recalculatedStats = {
        journal_count: filteredPublications.filter(pub => pub.journal || pub.source).length,
        conference_count: filteredPublications.filter(pub => pub.conference).length,
        book_count: filteredPublications.filter(pub => pub.book && pub.book.trim() !== '').length,
        patent_count: filteredPublications.filter(pub => pub.patent).length
    };

    // Use the full publications array for the main list
    const displayedPublications = publications.slice(0, displayCount);
    const hasMorePublications = displayCount < publications.length;
    const hasShownMore = displayCount > 5;

    // Filter citationsData for the graph to only years >= 2018
    const filteredCitationsData = citationsData.filter(item => {
        const yearNum = parseInt(item.year);
        return !isNaN(yearNum) && yearNum >= 2018;
    });

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

    return (
        <div className="individual-teacher-container">
            <div className="teacher-profile-grid">
                <div className="teacher-profile-center">
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
                <div className="teacher-profile-right">
                    
                </div>
            </div>

            {/* Publications and Stats Section */}
            <div className="teacher-publications-stats-row">
                <div className="teacher-publications edge-to-edge compact">
                    <h2>Top Publications</h2>
                    {publications.length === 0 ? (
                        <div className="no-publications">No publications found.</div>
                    ) : (
                        <>
                        <ul className="publications-list compact">
                            {displayedPublications.map((pub, idx) => (
                                <li 
                                    key={idx} 
                                    className="publication-item compact"
                                    onClick={() => {
                                        const publicationId = encodeURIComponent(pub.title);
                                        navigate(`/teachers/${teacherId}/publications/${publicationId}`);
                                    }}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <span className="pub-title multi-line">{pub.title}</span>
                                    <div className="pub-meta-row">
                                        <span className="pub-citations">Citations: {pub.citationCount ?? 0}</span>
                                        <span className="pub-year">Year: {pub.year ?? 'N/A'}</span>
                                    </div>
                                </li>
                            ))}
                        </ul>
                        <div className="publication-controls">
                            {hasMorePublications && (
                                <button className="show-more-btn" onClick={handleShowMore}>
                                    Show More 
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
                <div className="teacher-stats-graphs">
                    {/* Show drill-down view if active */}
                    {drillDownView ? (
                        <div className="drilldown-overlay">
                          <div className="drilldown-publication-section">
                            <button onClick={() => setDrillDownView(null)} className="back-button" style={{
                                background: '#1976d2',
                                color: 'white',
                                border: 'none',
                                padding: '8px 16px',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                marginBottom: '10px'
                            }}>← Back to Overview</button>
                            <h2 className="chart-title">{drillDownView.charAt(0).toUpperCase() + drillDownView.slice(1)} Publications</h2>
                            {(() => {
                                // Filter publications for the selected category in drilldown (graphs)
                                const filteredPubs = filteredPublications.filter(pub => {
                                    if (drillDownView === 'conferences' && pub.conference) return true;
                                    if (drillDownView === 'journals' && (pub.journal || pub.source)) return true;
                                    if (drillDownView === 'books' && pub.book) return true;
                                    if (drillDownView === 'patents' && pub.patent) return true;
                                    return false;
                                });

                                if (filteredPubs.length === 0) {
                                    return <div style={{ padding: '20px', color: '#888' }}>No {drillDownView} found.</div>;
                                }

                                // Handle publication click
                                const handlePublicationClick = (pub) => {
                                    // Encode the publication title for the URL
                                    const publicationId = encodeURIComponent(pub.title);
                                    // Navigate to the publication details page
                                    navigate(`/teachers/${teacherId}/publications/${publicationId}`);
                                };

                                return (
                                    <ul style={{ padding: 0, listStyle: 'none' }}>
                                        {filteredPubs.map((pub, idx) => (
                                            <li 
                                                key={idx} 
                                                style={{
                                                    background: '#fff',
                                                    marginBottom: '12px',
                                                    padding: '12px',
                                                    borderRadius: '6px',
                                                    border: '1px solid #eee',
                                                    boxShadow: '0 1px 2px rgba(0,0,0,0.07)',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s ease'
                                                }}
                                                onClick={() => handlePublicationClick(pub)}
                                                onMouseEnter={(e) => {
                                                    e.target.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                                                    e.target.style.transform = 'translateY(-1px)';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.target.style.boxShadow = '0 1px 2px rgba(0,0,0,0.07)';
                                                    e.target.style.transform = 'translateY(0)';
                                                }}
                                            >
                                                <div><strong>Title:</strong> {pub.title}</div>
                                                {drillDownView === 'patents' && pub.inventors && <div><strong>Inventors:</strong> {pub.inventors}</div>}
                                                {drillDownView === 'patents' && pub.patentOffice && <div><strong>Patent Office:</strong> {pub.patentOffice}</div>}
                                                {drillDownView !== 'patents' && pub.authors && <div><strong>Authors:</strong> {pub.authors}</div>}
                                                {drillDownView !== 'patents' && pub.journal && <div><strong>Journal:</strong> {pub.journal}</div>}
                                                {drillDownView !== 'patents' && pub.source && <div><strong>Source:</strong> {pub.source}</div>}
                                                {drillDownView !== 'patents' && pub.conference && <div><strong>Conference:</strong> {pub.conference}</div>}
                                                {drillDownView !== 'patents' && pub.book && <div><strong>Book:</strong> {pub.book}</div>}
                                                {pub.year && <div><strong>Year:</strong> {pub.year}</div>}
                                                <div style={{ fontSize: '0.9em', color: '#666', marginTop: '8px' }}>
                                                    Click to view details
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                );
                            })()}
                          </div>
                        </div>
                    ) : (
                        <>
                            {/* Publication Types Graph (Journals, Conferences, Books, Patents) */}
                            <div className="stats-graph-container">
                                <h2>Publication Types (2018 onwards)</h2>
                                {statsLoading ? (
                                    <div className="loading">Loading stats...</div>
                                ) : statsError ? (
                                    <div className="error">{statsError}</div>
                                ) : stats ? (
                                    <>
                                        <ResponsiveContainer width="100%" height={300}>
                                            <BarChart data={[
                                                { type: 'Journals', count: recalculatedStats.journal_count || 0, fill: '#800080' },
                                                { type: 'Conferences', count: recalculatedStats.conference_count || 0, fill: '#FFA500' },
                                                { type: 'Books', count: recalculatedStats.book_count || 0, fill: '#4CAF50' },
                                                { type: 'Patents', count: recalculatedStats.patent_count || 0, fill: '#FFBB28' }
                                            ]} layout="vertical" margin={{ left: 20, right: 20, top: 20, bottom: 20 }}>
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis type="number" allowDecimals={false} />
                                                <YAxis dataKey="type" type="category" width={110} />
                                                <Tooltip cursor={{ fill: '#f5f5f5' }} />
                                                <Bar 
                                                    dataKey="count" 
                                                    barSize={50} 
                                                    onClick={(d) => setDrillDownView(d.type.toLowerCase())}
                                                    cursor="pointer"
                                                >
                                                    {[
                                                        { type: 'Journals', count: recalculatedStats.journal_count || 0, fill: '#800080' },
                                                        { type: 'Conferences', count: recalculatedStats.conference_count || 0, fill: '#FFA500' },
                                                        { type: 'Books', count: recalculatedStats.book_count || 0, fill: '#4CAF50' },
                                                        { type: 'Patents', count: recalculatedStats.patent_count || 0, fill: '#FFBB28' }
                                                    ].map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                        <div style={{ textAlign: 'center', marginTop: '10px', fontSize: '0.9rem', color: '#666' }}>
                                            Click on any bar to see publications
                                        </div>
                                    </>
                                ) : null}
                            </div>

                            {/* Citations by Year Graph */}
                            <div className="stats-graph-container">
                                <h2>Citations by Year</h2>
                                {citationsLoading ? (
                                    <div className="loading">Loading citations...</div>
                                ) : citationsError ? (
                                    <div className="error">{citationsError}</div>
                                ) : filteredCitationsData.length > 0 ? (
                                    <>
                                        <ResponsiveContainer width="100%" height={200}>
                                            <LineChart data={filteredCitationsData}>
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis 
                                                    dataKey="year" 
                                                    type="number"
                                                    domain={['dataMin', 'dataMax']}
                                                    tickFormatter={(value) => Math.round(value).toString()}
                                                    allowDecimals={false}
                                                />
                                                <YAxis allowDecimals={false} />
                                                <Tooltip 
                                                    formatter={(value, name) => [value, 'Citations']}
                                                    labelFormatter={(label) => `Year: ${Math.round(label)}`}
                                                />
                                                <Legend />
                                                <Line 
                                                    type="monotone" 
                                                    dataKey="citations" 
                                                    stroke="#1976d2" 
                                                    strokeWidth={3}
                                                    dot={{ fill: '#1976d2', strokeWidth: 2, r: 4 }}
                                                    activeDot={{ r: 6 }}
                                                    name="Citations"
                                                />
                                            </LineChart>
                                        </ResponsiveContainer>
                                        {citationsInfo && (
                                            <div style={{ textAlign: 'center', marginTop: '10px', fontSize: '0.9rem', color: '#666' }}>
                                                <div>Total Citations: {citationsInfo.totalCitations}</div>
                                                {citationsInfo.lastUpdated && (
                                                    <div>Last Updated: {new Date(citationsInfo.lastUpdated).toLocaleDateString()}</div>
                                                )}
                                                <table style={{ margin: '10px auto', borderCollapse: 'collapse', fontSize: '1rem' }}>
                                                    <tbody>
                                                        <tr>
                                                            <td style={{ padding: '4px 12px', fontWeight: 'bold' }}>h-index</td>
                                                            <td style={{ padding: '4px 12px' }}>{citationsInfo.hIndex ?? 'N/A'}</td>
                                                        </tr>
                                                        <tr>
                                                            <td style={{ padding: '4px 12px', fontWeight: 'bold' }}>i10-index</td>
                                                            <td style={{ padding: '4px 12px' }}>{citationsInfo.i10Index ?? 'N/A'}</td>
                                                        </tr>
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className="no-citations">
                                        <p>No citation data available</p>
                                        <p>Citations may not have been scraped yet. Contact an administrator to trigger citation scraping.</p>
                                    </div>
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