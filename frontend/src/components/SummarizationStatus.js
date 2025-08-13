import React, { useState, useEffect } from 'react';
import axios from 'axios';

const SummarizationStatus = () => {
    const [ongoingSummarization, setOngoingSummarization] = useState(null);
    const [status, setStatus] = useState(null);

    // Check for ongoing summarization on mount
    useEffect(() => {
        const checkOngoingSummarization = () => {
            const stored = localStorage.getItem('ongoingSummarization');
            if (stored) {
                const summaryData = JSON.parse(stored);
                setOngoingSummarization(summaryData);
            }
        };

        checkOngoingSummarization();
        
        // Listen for storage changes (when summarization starts on other pages)
        const handleStorageChange = (e) => {
            if (e.key === 'ongoingSummarization') {
                if (e.newValue) {
                    setOngoingSummarization(JSON.parse(e.newValue));
                } else {
                    setOngoingSummarization(null);
                }
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    // Check summarization status periodically
    useEffect(() => {
        if (ongoingSummarization && ongoingSummarization.taskId) {
            const checkStatus = async () => {
                try {
                    const response = await axios.get(`http://localhost:5000/api/summarization_status/${ongoingSummarization.taskId}`);
                    
                    if (response.data.status === 'completed') {
                        // Summarization completed
                        setStatus('completed');
                        setOngoingSummarization(null);
                        localStorage.removeItem('ongoingSummarization');
                        
                        // Show success message
                        alert('Summarization completed! You can view the summary on the publication details page.');
                    } else if (response.data.status === 'failed') {
                        // Summarization failed
                        setStatus('failed');
                        setOngoingSummarization(null);
                        localStorage.removeItem('ongoingSummarization');
                        
                        // Show error message
                        alert(`Summarization failed: ${response.data.error}`);
                    } else {
                        // Still running
                        setStatus('running');
                    }
                } catch (error) {
                    console.error('Error checking summarization status:', error);
                }
            };

            const interval = setInterval(checkStatus, 3000); // Check every 3 seconds
            return () => clearInterval(interval);
        }
    }, [ongoingSummarization]);

    if (!ongoingSummarization) {
        return null;
    }

    return (
        <div style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            background: '#1976d2',
            color: 'white',
            padding: '12px 16px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            zIndex: 1000,
            maxWidth: '300px',
            fontSize: '0.9rem'
        }}>
            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                📄 Summarizing Paper
            </div>
            <div style={{ fontSize: '0.8rem', opacity: 0.9 }}>
                {status === 'running' ? 'Processing...' : 
                 status === 'completed' ? 'Completed!' : 
                 status === 'failed' ? 'Failed' : 'Starting...'}
            </div>
            {ongoingSummarization.startTime && (
                <div style={{ fontSize: '0.7rem', opacity: 0.7, marginTop: '4px' }}>
                    Started: {new Date(ongoingSummarization.startTime).toLocaleTimeString()}
                </div>
            )}
        </div>
    );
};

export default SummarizationStatus; 