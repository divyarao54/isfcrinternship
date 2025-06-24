import React, { useState } from "react";
import axios from "axios";
import "../styles/admin.css";

const AdminPage = () => {
  const [scholarLink, setScholarLink] = useState("");
  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [elasticsearchStatus, setElasticsearchStatus] = useState(null);

  const checkElasticsearchStatus = async () => {
    try {
      setStatus("🔄 Checking Elasticsearch status...");
      const response = await axios.get("http://localhost:5000/elasticsearch/status");
      setElasticsearchStatus(response.data);
      
      if (response.data.status === 'connected') {
        setStatus(`✅ Elasticsearch connected! Found ${response.data.paper_indices} paper indices.`);
      } else {
        setStatus(`❌ Elasticsearch error: ${response.data.message}`);
      }
    } catch (error) {
      setStatus(`❌ Failed to check Elasticsearch status: ${error.message}`);
    }
  };

  const handleScrape = async () => {
    if (!scholarLink.trim()) {
      setStatus("❌ Please enter a Google Scholar profile link");
      return;
    }

    try {
      setIsLoading(true);
      setStatus("🔄 Starting scraping process...");
      
      const response = await axios.post("http://localhost:5000/admin/scrape", {
        profileUrl: scholarLink,
      });
      
      if (response.data.sync_error) {
        setStatus(`✅ Scraping completed successfully! ⚠️ Elasticsearch sync failed: ${response.data.sync_error}`);
      } else if (response.data.sync_output) {
        setStatus(`✅ Scraping and Elasticsearch sync completed successfully!`);
        // Refresh Elasticsearch status after successful sync
        setTimeout(checkElasticsearchStatus, 1000);
      } else {
        setStatus(`✅ Scraping completed successfully!`);
      }
      
      // Clear the input after successful scraping
      setScholarLink("");
      
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message;
      setStatus(`❌ Error: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!scholarLink.trim()) {
      setStatus("❌ Please enter a Google Scholar profile link");
      return;
    }

    try {
      setIsLoading(true);
      setStatus("🔄 Updating...");
      const response = await axios.put("http://localhost:5000/admin/update", {
        profileUrl: scholarLink,
      });
      setStatus(`🔁 Updated: ${response.data.message}`);
      setScholarLink("");
    } catch (error) {
      setStatus("❌ Update failed: " + (error.response?.data?.error || error.message));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!scholarLink.trim()) {
      setStatus("❌ Please enter a Google Scholar profile link");
      return;
    }

    try {
      setIsLoading(true);
      setStatus("🔄 Deleting...");
      const response = await axios.delete("http://localhost:5000/admin/delete", {
        data: { profileUrl: scholarLink },
      });
      setStatus(`🗑️ Deleted: ${response.data.message}`);
      setScholarLink("");
    } catch (error) {
      setStatus("❌ Deletion failed: " + (error.response?.data?.error || error.message));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="admin-container">
      <h2>Admin Panel</h2>
      <p className="admin-description">
        Enter a Google Scholar profile link to scrape publications. 
        The system will automatically sync the data to Elasticsearch after scraping.
      </p>
      
      <input
        type="text"
        placeholder="Enter Google Scholar profile link"
        value={scholarLink}
        onChange={(e) => setScholarLink(e.target.value)}
        className="admin-input"
        disabled={isLoading}
      />
      
      <div className="admin-buttons">
        <button 
          onClick={handleScrape} 
          disabled={isLoading}
          className={isLoading ? 'loading' : ''}
        >
          {isLoading ? '🔄 Processing...' : 'Scrape & Sync'}
        </button>
        <button 
          onClick={handleUpdate} 
          disabled={isLoading}
        >
          Update
        </button>
        <button 
          onClick={handleDelete} 
          disabled={isLoading}
        >
          Delete
        </button>
        <button 
          onClick={checkElasticsearchStatus}
          disabled={isLoading}
          className="status-btn"
        >
          Check ES Status
        </button>
      </div>
      
      {status && (
        <div className={`status-text ${status.includes('❌') ? 'error' : status.includes('✅') ? 'success' : 'info'}`}>
          {status}
        </div>
      )}

      {elasticsearchStatus && (
        <div className="elasticsearch-status">
          <h3>Elasticsearch Status</h3>
          <div className="status-details">
            <p><strong>Status:</strong> {elasticsearchStatus.status}</p>
            <p><strong>Total Indices:</strong> {elasticsearchStatus.total_indices}</p>
            <p><strong>Paper Indices:</strong> {elasticsearchStatus.paper_indices}</p>
            {elasticsearchStatus.paper_indices_list && elasticsearchStatus.paper_indices_list.length > 0 && (
              <div>
                <p><strong>Paper Collections:</strong></p>
                <ul>
                  {elasticsearchStatus.paper_indices_list.map((index, idx) => (
                    <li key={idx}>{index}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPage;
