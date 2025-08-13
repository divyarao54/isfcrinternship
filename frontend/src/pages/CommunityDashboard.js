import React, { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';

const COLORS = ['#0088FE', '#FF8042'];

const CommunityDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/community/stats')
      .then(res => res.json())
      .then(data => {
        setStats(data);
        setLoading(false);
      })
      .catch(err => {
        setError('Failed to fetch stats');
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Loading community stats...</div>;
  if (error) return <div>{error}</div>;
  if (!stats) return <div>No data available.</div>;

  // Pie chart data
  const pieData = [
    { name: 'Journals', value: stats.total_journal_papers },
    { name: 'Conferences', value: stats.total_conference_papers }
  ];

  // Bar chart data
  const barData = stats.teacher_stats.map(t => ({
    name: t.teacherName,
    Journals: t.num_journal_papers,
    Conferences: t.num_conference_papers
  }));

  return (
    <div style={{ padding: 24 }}>
      <h2>Community Publication Statistics</h2>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 40 }}>
        <div>
          <h3>Total Journals vs. Conferences</h3>
          <PieChart width={320} height={320}>
            <Pie
              data={pieData}
              cx={160}
              cy={160}
              innerRadius={60}
              outerRadius={100}
              fill="#8884d8"
              paddingAngle={5}
              dataKey="value"
              label
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </div>
        <div style={{ flex: 1, minWidth: 400 }}>
          <h3>Publications by Teacher</h3>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={barData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-20} textAnchor="end" interval={0} height={80} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="Journals" fill="#0088FE" />
              <Bar dataKey="Conferences" fill="#FF8042" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default CommunityDashboard; 