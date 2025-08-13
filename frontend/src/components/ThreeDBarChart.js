import React, { useEffect, useRef } from 'react';
import Plotly from 'plotly.js/dist/plotly';

// Expects data: [{ name, publications, hIndex, i10Index }]
const ThreeDBarChart = ({ data }) => {
  const chartRef = useRef(null);

  useEffect(() => {
    if (!data || data.length === 0) return;
    const teacherNames = data.map(d => d.name);
    const metrics = ['Publications', 'h-index', 'i10-index'];
    const colors = ['#1976d2', '#fbc02d', '#388e3c'];

    // Prepare 3D bar data: for each teacher and each metric, plot a vertical bar
    const traces = metrics.map((metric, metricIdx) => {
      const z = data.map(d => {
        if (metric === 'Publications') return d.publications;
        if (metric === 'h-index') return d.hIndex;
        if (metric === 'i10-index') return d.i10Index;
        return 0;
      });
      // For each teacher, plot a vertical line from z=0 to z=value at (x, y)
      return {
        x: teacherNames,
        y: Array(teacherNames.length).fill(metric),
        z: z,
        mode: 'lines',
        type: 'scatter3d',
        name: metric,
        line: {
          color: colors[metricIdx],
          width: 20
        },
        marker: {
          color: colors[metricIdx],
        },
        // Each bar is a line from (x, y, 0) to (x, y, z)
        customdata: z,
        hovertemplate: '<b>%{x}</b><br>' + metric + ': %{z}<extra></extra>',
        // For each teacher, plot a line from (x, y, 0) to (x, y, z)
        x0: teacherNames,
        y0: Array(teacherNames.length).fill(metric),
        z0: Array(teacherNames.length).fill(0),
      };
    });

    // For each trace, we need to plot a set of lines from (x, y, 0) to (x, y, z)
    // Plotly does not support this natively, so we flatten all lines into one trace per metric
    const allTraces = [];
    metrics.forEach((metric, metricIdx) => {
      data.forEach((d, i) => {
        allTraces.push({
          x: [teacherNames[i], teacherNames[i]],
          y: [metric, metric],
          z: [0, metric === 'Publications' ? d.publications : metric === 'h-index' ? d.hIndex : d.i10Index],
          mode: 'lines+markers',
          type: 'scatter3d',
          name: metric,
          line: {
            color: colors[metricIdx],
            width: 16
          },
          marker: {
            color: colors[metricIdx],
            size: 6
          },
          showlegend: i === 0,
          hovertemplate: `<b>${teacherNames[i]}</b><br>${metric}: %{z}<extra></extra>`
        });
      });
    });

    const layout = {
      title: 'Teacher Metrics (3D Bar Chart)',
      scene: {
        xaxis: {
          title: 'Teacher',
          tickvals: teacherNames,
          ticktext: teacherNames,
          range: [ -0.5, teacherNames.length - 0.5 ], // Fit data exactly
          fixedrange: true, // Prevent zooming out, allow zooming in
        },
        yaxis: {
          title: 'Metric',
          tickvals: metrics,
          ticktext: metrics,
          range: [ -0.5, metrics.length - 0.5 ], // Fit data exactly
          fixedrange: true, // Prevent zooming out, allow zooming in
        },
        zaxis: {
          title: 'Value',
          autorange: true,
        },
        camera: {
          eye: { x: 1.5, y: 1.5, z: 1.2 },
        },
        aspectmode: 'auto',
      },
      height: 600,
      margin: { t: 50, l: 0, r: 0, b: 0 },
      legend: { orientation: 'h', y: -0.1 },
      dragmode: 'orbit',
    };

    Plotly.newPlot(chartRef.current, allTraces, layout, { responsive: true });
    return () => {
      if (chartRef.current) {
        Plotly.purge(chartRef.current);
      }
    };
  }, [data]);

  // Dynamically set width based on number of teachers
  const teacherCount = data ? data.length : 0;
  const chartWidth = Math.max(900, teacherCount * 70);

  return <div ref={chartRef} style={{ width: chartWidth, height: 600, minWidth: 900, minHeight: 600, maxHeight: 600, margin: '0 auto', overflowX: 'auto' }} />;
};

export default ThreeDBarChart; 