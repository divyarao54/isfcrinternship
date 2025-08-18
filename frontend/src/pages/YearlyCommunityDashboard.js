import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import '../styles/yearlyCommunityDashboard.css';
import DonutChart from '../components/DonutChart';
import AwardsGallery from '../components/AwardsGallery';
import DomainTiles from '../components/DomainTiles';
import { useNavigate } from 'react-router-dom';

// Helper to derive year from publication object
const getPublicationYear = (pub) => {
    // Prefer explicit numeric year
    const y = pub && pub.year;
    if (y !== undefined && y !== null) {
        const yi = parseInt(y);
        if (!Number.isNaN(yi)) return yi;
    }
    // Fall back to date-like fields
    const candidates = [pub?.publicationDate, pub?.grantedOn, pub?.filedOn];
    for (const d of candidates) {
        if (typeof d === 'string' && d.length >= 4) {
            const yy = parseInt(d.slice(0, 4));
            if (!Number.isNaN(yy)) return yy;
        }
    }
    return null;
};

// A simple component for the main summary bar chart
const SummaryChart = ({ data, onBarClick }) => {
    const chartData = [
        { name: 'Conferences', count: data.total_conferences, fill: '#FFA500' },
        { name: 'Journals', count: data.total_journals, fill: '#800080' },
        { name: 'Books', count: data.total_books, fill: '#4CAF50' },
        { name: 'Patents', count: data.total_patents, fill: '#FFBB28' },
    ];

    return (
        <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 20, top: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" allowDecimals={false} />
                <YAxis dataKey="name" type="category" width={110} />
                <Tooltip cursor={{ fill: '#f5f5f5' }} />
                <Bar dataKey="count" barSize={50} onClick={(d) => onBarClick(d.name.toLowerCase())}>
                    {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
};

// A component for the detailed year-wise drill-down chart
const DrillDownChart = ({ data, category, onBack, publications, onClose }) => {
    const [selectedYear, setSelectedYear] = useState(null);
    const navigate = useNavigate();

    // Helper function to check if two titles are similar
    // Removed unused similarity helper to satisfy linter
    const areTitlesSimilar = (title1, title2) => {
        // Remove common words that might cause false positives
        const commonWords = ['a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
        
        // Clean titles by removing common words and extra spaces
        const cleanTitle1 = title1.split(' ')
            .filter(word => !commonWords.includes(word.toLowerCase()))
            .join(' ')
            .replace(/\s+/g, ' ')
            .trim();
            
        const cleanTitle2 = title2.split(' ')
            .filter(word => !commonWords.includes(word.toLowerCase()))
            .join(' ')
            .replace(/\s+/g, ' ')
            .trim();
        
        // If cleaned titles are identical, they're similar
        if (cleanTitle1 === cleanTitle2) {
            return true;
        }
        
        // Check if one title is contained within the other (with some tolerance)
        if (cleanTitle1.includes(cleanTitle2) || cleanTitle2.includes(cleanTitle1)) {
            const lengthDiff = Math.abs(cleanTitle1.length - cleanTitle2.length);
            const maxLength = Math.max(cleanTitle1.length, cleanTitle2.length);
            // If the difference is less than 20% of the longer title, consider them similar
            if (lengthDiff / maxLength < 0.2) {
                return true;
            }
        }
        
        return false;
    };

    // Prepare chart data - only include years that have data for the selected category
    const chartData = data
        .filter(item => (item[category] || 0) > 0)
        .map(item => ({
            year: item.year,
            count: item[category] || 0
        }));

    const categoryColors = {
        conferences: '#FFA500',
        journals: '#800080',
        books: '#4CAF50',
        patents: '#FFBB28',
    };

    // Filter publications for the selected year and category (publications are already deduplicated)
    let filteredPubs = [];
    if (selectedYear && publications) {
        filteredPubs = publications.filter(pub => {
            const pubYear = getPublicationYear(pub);
            if (String(pubYear) !== String(selectedYear)) return false;
            if (category === 'conferences' && pub.conference) return true;
            if (category === 'journals' && (pub.journal || pub.source)) return true;
            if (category === 'books' && pub.book && pub.book.trim() !== '') return true;
            if (category === 'patents' && pub.patent) return true;
            return false;
        });
    }

    // Handle publication click
    const handlePublicationClick = (pub) => {
        // Find the teacher name from the publication
        const teacherName = pub.teacherName;
        if (teacherName) {
            // Encode the publication title for the URL
            const publicationId = encodeURIComponent(pub.title);
            // Navigate to the publication details page
            navigate(`/teachers/${encodeURIComponent(teacherName)}/publications/${publicationId}`);
        }
    };

    return (
        <div className="drilldown-overlay" onClick={onClose}>
            <div className="drilldown-publication-section" onClick={e => e.stopPropagation()}>
                <button className="back-button" onClick={selectedYear ? () => setSelectedYear(null) : onClose} style={{ position: 'absolute', top: 16, right: 16, zIndex: 1200 }}>
                    {selectedYear ? '← Back to Yearly View' : 'X'}
                </button>
            <h2 className="chart-title">Yearly {category.charAt(0).toUpperCase() + category.slice(1)}</h2>
            <div style={{ minHeight: 400 }}>
                {!selectedYear ? (
                    <ResponsiveContainer width="100%" height={400}>
                        <BarChart data={chartData} onClick={e => {
                            if (e && e.activeLabel) setSelectedYear(e.activeLabel);
                        }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="year" angle={-45} textAnchor="end" height={60} />
                            <YAxis allowDecimals={false} />
                            <Tooltip />
                            <Bar dataKey="count" fill={categoryColors[category]} cursor="pointer" />
                        </BarChart>
                    </ResponsiveContainer>
                    ) : (
                        <>
                            <h3 className="chart-title">Publications in {selectedYear} ({category})</h3>
                            {filteredPubs.length === 0 ? (
                                <div style={{ padding: '20px', color: '#888' }}>No publications found for this year and category.</div>
                            ) : (
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
                                                transition: 'all 0.2s ease',
                                                ':hover': {
                                                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                                    transform: 'translateY(-1px)'
                                                }
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
                                            {category === 'patents' && pub.inventors && <div><strong>Inventors:</strong> {pub.inventors}</div>}
                                            {category !== 'patents' && pub.authors && <div><strong>Authors:</strong> {pub.authors}</div>}
                                            {category !== 'patents' && pub.journal && <div><strong>Journal:</strong> {pub.journal}</div>}
                                            {category !== 'patents' && pub.source && <div><strong>Source:</strong> {pub.source}</div>}
                                            {category !== 'patents' && pub.conference && <div><strong>Conference:</strong> {pub.conference}</div>}
                                            {category !== 'patents' && pub.book && pub.book.trim() !== '' && <div><strong>Book:</strong> {pub.book}</div>}
                                            <div style={{ fontSize: '0.9em', color: '#666', marginTop: '8px' }}>
                                                Click to view details
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </>
                    )}
                    </div>
            </div>
        </div>
    );
};

const MetricBarPopup = ({ open, metric, data, onClose, onBarClick }) => {
    if (!open) return null;
    if (!metric || !data || data.length === 0) return null;
    const metricMap = {
        publications: { label: 'Publications', color: '#1976d2' },
        hIndex: { label: 'h-index', color: '#fbc02d' },
        i10Index: { label: 'i10-index', color: '#388e3c' },
    };
    const barData = data.map(t => ({ name: t.name, value: t[metric] }));
    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
            <div style={{ background: 'white', borderRadius: 16, padding: 32, minWidth: 900, minHeight: 540, maxWidth: '98vw', maxHeight: '90vh', boxShadow: '0 4px 24px rgba(0,0,0,0.15)', position: 'relative', overflow: 'auto' }}>
                <button onClick={onClose} style={{ position: 'absolute', top: 16,color:'black', background:'white', right: 16, fontSize: 18, border: 'none', borderRadius: 4, padding: '4px 12px', cursor: 'pointer' }}>X</button>
                <h2 style={{ textAlign: 'center', marginBottom: 24 }}>{metricMap[metric].label} by Teacher</h2>
                <ResponsiveContainer width="100%" height={420}>
                    <BarChart data={barData} margin={{ left: 40, right: 40, top: 20, bottom: 40 }} onClick={onBarClick}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" angle={-30} textAnchor="end" height={100} interval={0} tick={{ fontSize: 16 }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 16 }} />
                        <Tooltip />
                        <Bar dataKey="value" fill={metricMap[metric].color} barSize={40} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

const YearWisePopup = ({ open, teacher, metric, onClose, yearData }) => {
    if (!open || !teacher || !metric || !yearData) return null;
    const metricMap = {
        publications: { label: 'Year-wise Publications', color: '#1976d2' },
        hIndex: { label: 'Year-wise citations', color: '#fbc02d' },
        i10Index: { label: 'Year-wise i10-index', color: '#388e3c' },
    };
    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            background: 'rgba(0,0,0,0.4)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
            <div style={{ background: 'white', borderRadius: 16, padding: 32, minWidth: 900, minHeight: 540, maxWidth: '98vw', maxHeight: '90vh', boxShadow: '0 4px 24px rgba(0,0,0,0.15)', position: 'relative', overflow: 'auto' }}>
                <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, fontSize: 18, background: 'white',color:'black', border: 'none', borderRadius: 4, padding: '4px 12px', cursor: 'pointer' }}>X</button>
                <h2 style={{ textAlign: 'center', marginBottom: 24 }}>{teacher} - {metricMap[metric].label}</h2>
                <ResponsiveContainer width="100%" height={420}>
                    <BarChart data={yearData} margin={{ left: 40, right: 40, top: 20, bottom: 40 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="year" angle={-30} textAnchor="end" height={100} interval={0} tick={{ fontSize: 16 }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 16 }} />
                        <Tooltip />
                        <Bar dataKey="value" fill={metricMap[metric].color} barSize={40} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

const YearlyCommunityDashboard = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [drillDownView, setDrillDownView] = useState(null); // e.g., 'conferences', 'journals', 'books', 'patents'
    // const [showDebug, setShowDebug] = useState(false);
    const [allPublications, setAllPublications] = useState([]);
    const [donutData, setDonutData] = useState({ teachers: [] });
    const [popupMetric, setPopupMetric] = useState(null);
    const [yearPopup, setYearPopup] = useState({ open: false, teacher: null, metric: null, yearData: null });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await axios.get('http://localhost:5000/api/community/yearly_stats');
                setData(response.data);
                // Fetch all publications for drill-down
                const pubsResp = await axios.get('http://localhost:5000/papers?limit=10000');
                setAllPublications(pubsResp.data.papers || []);

                // Fetch all teachers
                const teachersResp = await axios.get('http://localhost:5000/teachers');
                const teachers = teachersResp.data.teachers || [];
                // For each teacher, fetch h-index, i10-index, and publication count
                const teacherMetrics = await Promise.all(teachers.map(async (teacher) => {
                    // Get h-index and i10-index from citations collection
                    let hIndex = 0, i10Index = 0;
                    try {
                        const citRes = await axios.get(`http://localhost:5000/teachers/${encodeURIComponent(teacher.name)}/citations/scraped`);
                        hIndex = citRes.data.hIndex || 0;
                        i10Index = citRes.data.i10Index || 0;
                    } catch (error) {
                        console.log(`Error fetching citations for ${teacher.name}:`, error.message);
                    }
                    // Get publication count from papers collection
                    let publications = 0;
                    try {
                        const pubRes = await axios.get(`http://localhost:5000/teachers/${encodeURIComponent(teacher.name)}/publications`);
                        publications = Array.isArray(pubRes.data.publications) ? pubRes.data.publications.length : 0;
                    } catch (error) {
                        console.log(`Error fetching publications for ${teacher.name}:`, error.message);
                    }
                    return {
                        name: teacher.name,
                        hIndex,
                        i10Index,
                        publications
                    };
                }));
                setDonutData({ teachers: teacherMetrics });
            } catch (err) {
                setError('Failed to fetch yearly statistics.');
                console.error('API Error:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) return <div className="loading-container">Loading dashboard...</div>;
    if (error) return <div className="error-container">{error}</div>;
    if (!data) return null;

    // Filter allPublications to only those from 2018 and after for graph display
    const filteredPublications = allPublications.filter(pub => {
        const yearNum = getPublicationYear(pub);
        return yearNum !== null && yearNum >= 2018;
    });

    // Helper function to check if two titles are similar (same as in DrillDownChart)
    const areTitlesSimilar = (title1, title2) => {
        // Remove common words that might cause false positives
        const commonWords = ['a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
        
        // Clean titles by removing common words and extra spaces
        const cleanTitle1 = title1.split(' ')
            .filter(word => !commonWords.includes(word.toLowerCase()))
            .join(' ')
            .replace(/\s+/g, ' ')
            .trim();
            
        const cleanTitle2 = title2.split(' ')
            .filter(word => !commonWords.includes(word.toLowerCase()))
            .join(' ')
            .replace(/\s+/g, ' ')
            .trim();
        
        // If cleaned titles are identical, they're similar
        if (cleanTitle1 === cleanTitle2) {
            return true;
        }
        
        // Check if one title is contained within the other (with some tolerance)
        if (cleanTitle1.includes(cleanTitle2) || cleanTitle2.includes(cleanTitle1)) {
            const lengthDiff = Math.abs(cleanTitle1.length - cleanTitle2.length);
            const maxLength = Math.max(cleanTitle1.length, cleanTitle2.length);
            // If the difference is less than 20% of the longer title, consider them similar
            if (lengthDiff / maxLength < 0.2) {
                return true;
            }
        }
        
        return false;
    };

    // Remove duplicates from filtered publications (same logic as drill-down)
    const seenTitles = new Set();
    const deduplicatedPublications = filteredPublications.filter(pub => {
        const normalizedTitle = pub.title ? pub.title.toLowerCase().trim() : '';
        if (!normalizedTitle) return false;
        
        // Check for exact match first
        if (seenTitles.has(normalizedTitle)) {
            return false;
        }
        
        // Check for similar titles (handle minor variations)
        for (const seenTitle of seenTitles) {
            if (areTitlesSimilar(normalizedTitle, seenTitle)) {
                return false;
            }
        }
        
        seenTitles.add(normalizedTitle);
        return true;
    });

    // Recalculate yearly stats and summary based on deduplicated publications
    const recalculatedYearlyStats = {};
    
    // Process deduplicated publications to create yearly stats
    deduplicatedPublications.forEach(pub => {
        const year = getPublicationYear(pub);
        if (year !== null && year >= 2018) {
            if (!recalculatedYearlyStats[year]) {
                recalculatedYearlyStats[year] = {
                    year: year,
                    papers: 0,
                    conferences: 0,
                    journals: 0,
                    books: 0,
                    patents: 0
                };
            }
            
            recalculatedYearlyStats[year].papers += 1;
            
            // Categorize the publication
            if (pub.book && pub.book.trim() !== '') {
                recalculatedYearlyStats[year].books += 1;
            } else if (pub.conference) {
                recalculatedYearlyStats[year].conferences += 1;
            } else if (pub.patent === true || pub.patent === 'true' || pub.patent === 'True') {
                recalculatedYearlyStats[year].patents += 1;
            } else if (pub.journal || pub.source) {
                recalculatedYearlyStats[year].journals += 1;
            }
        }
    });
    
    // Convert to array and sort by year
    const recalculatedYearlyStatsArray = Object.values(recalculatedYearlyStats).sort((a, b) => a.year - b.year);
    
    // Calculate summary from recalculated yearly stats
    const recalculatedSummary = {
        total_publications: recalculatedYearlyStatsArray.reduce((sum, item) => sum + (item.papers || 0), 0),
        total_conferences: recalculatedYearlyStatsArray.reduce((sum, item) => sum + (item.conferences || 0), 0),
        total_journals: recalculatedYearlyStatsArray.reduce((sum, item) => sum + (item.journals || 0), 0),
        total_books: recalculatedYearlyStatsArray.reduce((sum, item) => sum + (item.books || 0), 0),
        total_patents: recalculatedYearlyStatsArray.reduce((sum, item) => sum + (item.patents || 0), 0)
    };

    // Handler for bar click in popup
    const handleBarClick = async (e) => {
        if (!e || !e.activeLabel || !popupMetric) return;
        const teacherName = e.activeLabel;
        let yearData = [];
        if (popupMetric === 'publications') {
            // Fetch year-wise publications for this teacher
            try {
                const res = await axios.get(`http://localhost:5000/teachers/${encodeURIComponent(teacherName)}/publications`);
                const pubs = Array.isArray(res.data.publications) ? res.data.publications : [];
                const yearMap = {};
                pubs.forEach(pub => {
                    if (pub.year) {
                        yearMap[pub.year] = (yearMap[pub.year] || 0) + 1;
                    }
                });
                yearData = Object.entries(yearMap).map(([year, value]) => ({ year, value }));
                yearData.sort((a, b) => a.year - b.year);
            } catch {}
        } else if (popupMetric === 'hIndex') {
            // Fetch year-wise h-index for this teacher
            try {
                const res = await axios.get(`http://localhost:5000/teachers/${encodeURIComponent(teacherName)}/citations/scraped`);
                const perYear = res.data.citationsPerYear || {};
                yearData = Object.entries(perYear).map(([year, value]) => ({ year, value }));
                yearData.sort((a, b) => a.year - b.year);
            } catch {}
        } else {
            // For i10Index, do nothing
            return;
        }
        setYearPopup({ open: true, teacher: teacherName, metric: popupMetric, yearData });
    };

    return (
        <div className="yearly-dashboard-container">
            <h1 className="dashboard-main-title">Community Research Dashboard</h1>
            

            
            <div className="summary-cards">
                <div className="summary-card">
                    <div className="card-value">{recalculatedSummary.total_publications != null ? recalculatedSummary.total_publications.toLocaleString() : '—'}</div>
                    <div className="card-label">Total Publications</div>
                </div>
            </div>
            <div className="dashboard-charts-row">
                <div className="chart-container dashboard-chart-half">
                    {!drillDownView ? (
                        <>
                            <h2 className="chart-title">Publication Overview</h2>
                            <ResponsiveContainer width="100%" height={320}>
                                <SummaryChart data={recalculatedSummary} onBarClick={setDrillDownView} />
                            </ResponsiveContainer>
                        </>
                    ) : null}
                </div>
            </div>
            {/* Place ISFCR Awards directly above the Teachers Metrics (Donut) */}
            <AwardsGallery />
            {drillDownView && (
                <DrillDownChart
                    data={recalculatedYearlyStatsArray}
                    category={drillDownView}
                    onBack={() => setDrillDownView(null)}
                    publications={deduplicatedPublications}
                    onClose={() => setDrillDownView(null)}
                />
            )}
            {/* New full-width section for DonutChart */}
            <section className="donut-chart-section">
                <DonutChart donutData={donutData} onSegmentClick={setPopupMetric} />
            </section>
            
            {/* Domain Tiles Section */}
            <section className="domain-tiles-section">
                <DomainTiles />
            </section>
            
            <MetricBarPopup open={!!popupMetric} metric={popupMetric} data={donutData.teachers} onClose={() => setPopupMetric(null)} onBarClick={handleBarClick} />
            <YearWisePopup open={yearPopup.open} teacher={yearPopup.teacher} metric={yearPopup.metric} onClose={() => setYearPopup({ open: false, teacher: null, metric: null, yearData: null })} yearData={yearPopup.yearData} />
        </div>
    );
};

export default YearlyCommunityDashboard; 