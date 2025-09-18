import React, { useEffect, useRef, useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

// Distinct color themes for each layer
const PUBS_COLORS = ['#1976d2', '#1565c0', '#0d47a1', '#42a5f5', '#90caf9', '#1e88e5', '#1565c0', '#0d47a1', '#1976d2', '#42a5f5'];
const I10_COLORS = ['#388e3c', '#2e7d32', '#1b5e20', '#66bb6a', '#a5d6a7', '#43a047', '#388e3c', '#2e7d32', '#1b5e20', '#66bb6a'];
const HINDEX_COLORS = ['#fbc02d', '#f9a825', '#f57f17', '#fff176', '#ffe082', '#ffb300', '#fbc02d', '#f9a825', '#f57f17', '#fff176'];

// Label renderer for each layer, in black, only on arcs (not in center)
const renderSegmentLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, value }) => {
    if (value > 0) {
        // Calculate label position
        const RADIAN = Math.PI / 180;
        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
        const x = cx + radius * Math.cos(-midAngle * RADIAN);
        const y = cy + radius * Math.sin(-midAngle * RADIAN);
        return (
            <text
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="central"
                fill="#111"
                fontSize={16}
                fontWeight={600}
            >
                {value}
            </text>
        );
    }
    return null;
};

// Custom tooltip for each layer
const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length > 0) {
        const entry = payload[0];
        if (!entry || !entry.payload) return null;
        return (
            <div style={{ background: '#fff', border: '1px solid #ccc', padding: 10, borderRadius: 6 }}>
                <div style={{ fontWeight: 600 }}>{entry.payload.name}</div>
            </div>
        );
    }
    return null;
};

const DonutChart = ({ donutData, onSegmentClick }) => {
    if (!donutData || !donutData.teachers || donutData.teachers.length === 0) {
        return <div>No donut chart data available.</div>;
    }

    // Responsive sizing using container width
    const containerRef = useRef(null);
    const [containerWidth, setContainerWidth] = useState(0);
    useEffect(() => {
        const measure = () => {
            if (containerRef.current) {
                setContainerWidth(containerRef.current.clientWidth);
            }
        };
        measure();
        window.addEventListener('resize', measure);
        return () => window.removeEventListener('resize', measure);
    }, []);

    // Fallback width for server-render or first paint
    const width = containerWidth || 600;
    // Chart height proportional to width, capped
    const chartHeight = Math.min(700, Math.max(360, Math.round(width * 0.9)));

    // Prepare data for each layer, tagging with layer info
    const hIndexData = donutData.teachers.map((t, idx) => ({ name: t.name, value: t.hIndex, layer: 'hIndex', fill: HINDEX_COLORS[idx % HINDEX_COLORS.length] }));
    const i10IndexData = donutData.teachers.map((t, idx) => ({ name: t.name, value: t.i10Index, layer: 'i10Index', fill: I10_COLORS[idx % I10_COLORS.length] }));
    const publicationsData = donutData.teachers.map((t, idx) => ({ name: t.name, value: t.publications, layer: 'publications', fill: PUBS_COLORS[idx % PUBS_COLORS.length] }));

    // Chart sizing computed from width
    const maxRadius = Math.floor(Math.min(width, chartHeight) / 2) - 16;
    const outerRadius = Math.max(140, Math.min(320, maxRadius));
    const layerWidth = Math.max(20, Math.round(outerRadius * 0.14));
    const layerGap = Math.max(12, Math.round(outerRadius * 0.08));

    // Custom legend for layers (color theme per metric)
    const customLegend = (
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <div style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: 4 }}>Layers:</div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 32, fontSize: '1rem', alignItems: 'center' }}>
                <span><span style={{ display: 'inline-block', width: 24, height: 24, background: PUBS_COLORS[0], borderRadius: '50%', marginRight: 8, border: '2px solid #1976d2' }}></span>Publications (outermost)</span>
                <span><span style={{ display: 'inline-block', width: 24, height: 24, background: I10_COLORS[0], borderRadius: '50%', marginRight: 8, border: '2px solid #388e3c' }}></span>i10-index (middle)</span>
                <span><span style={{ display: 'inline-block', width: 24, height: 24, background: HINDEX_COLORS[0], borderRadius: '50%', marginRight: 8, border: '2px solid #fbc02d' }}></span>h-index (innermost)</span>
            </div>
        </div>
    );

    // Click handler for each layer
    const handlePieClick = (metric) => {
        if (onSegmentClick) onSegmentClick(metric);
    };

    return (
        <div ref={containerRef} className="donut-chart-container" style={{ width: '100%', height: chartHeight + 100 }}>
            <h2 className="chart-title" style={{ marginBottom: 8 }}>Teacher Metrics</h2>
            {customLegend}
            <ResponsiveContainer width="100%" height={chartHeight}>
                <PieChart>
                    {/* Publications (outermost) */}
                    <Pie
                        data={publicationsData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={outerRadius}
                        innerRadius={outerRadius - layerWidth}
                        label={renderSegmentLabel}
                        labelLine={false}
                        isAnimationActive={false}
                        onClick={() => handlePieClick('publications')}
                    >
                        {publicationsData.map((entry, idx) => (
                            <Cell key={`pub-cell-${idx}`} fill={entry.fill} />
                        ))}
                    </Pie>
                    {/* i10-index (middle) */}
                    <Pie
                        data={i10IndexData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={outerRadius - layerWidth - layerGap}
                        innerRadius={outerRadius - 2 * layerWidth - layerGap}
                        label={renderSegmentLabel}
                        labelLine={false}
                        isAnimationActive={false}
                        onClick={() => handlePieClick('i10Index')}
                    >
                        {i10IndexData.map((entry, idx) => (
                            <Cell key={`i10-cell-${idx}`} fill={entry.fill} />
                        ))}
                    </Pie>
                    {/* h-index (innermost) */}
                    <Pie
                        data={hIndexData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={outerRadius - 2 * layerWidth - 2 * layerGap}
                        innerRadius={outerRadius - 3 * layerWidth - 2 * layerGap}
                        label={renderSegmentLabel}
                        labelLine={false}
                        isAnimationActive={false}
                        onClick={() => handlePieClick('hIndex')}
                    >
                        {hIndexData.map((entry, idx) => (
                            <Cell key={`h-cell-${idx}`} fill={entry.fill} />
                        ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
};

export default DonutChart; 