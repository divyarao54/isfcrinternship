import React, { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import axios from "axios";
import "../styles/searchResults.css";

const SearchResultsPage = () => {
  const [searchParams] = useSearchParams();
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalResults, setTotalResults] = useState(0);

  const query = searchParams.get("q");

  useEffect(() => {
    const performSearch = async () => {
      if (!query) {
        setError("No search query provided");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        const response = await axios.get(`http://localhost:5000/search?q=${encodeURIComponent(query)}`);
        
        setSearchResults(response.data.results || []);
        setTotalResults(response.data.total_results || 0);
      } catch (err) {
        console.error("Search error:", err);
        setError(err.response?.data?.error || "Failed to perform search");
      } finally {
        setLoading(false);
      }
    };

    performSearch();
  }, [query]);

  const formatYear = (year) => {
    if (!year) return "";
    return typeof year === "number" ? year.toString() : year;
  };

  const truncateText = (text, maxLength = 200) => {
    if (!text) return "";
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  const getSourceInfo = (paper) => {
    if (paper.journal) return paper.journal;
    if (paper.conference) return paper.conference;
    if (paper.book) return paper.book;
    if (paper.source) return paper.source;
    return "";
  };

  if (loading) {
    return (
      <div>
        <div className="search-results-container">
          <div className="loading">
            <div className="spinner"></div>
            <p>Searching for "{query}"...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <div className="search-results-container">
          <div className="error-message">
            <h2>Search Error</h2>
            <p>{error}</p>
            <Link to="/home" className="back-link">← Back to Home</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="search-results-container">
        <div className="search-header">
          <h1>Search Results</h1>
          <p className="search-query">"{query}"</p>
          <p className="results-count">
            {totalResults} result{totalResults !== 1 ? "s" : ""} found
          </p>
        </div>

        {searchResults.length === 0 ? (
          <div className="no-results">
            <h2>No results found</h2>
            <p>Try different keywords or check your spelling.</p>
            <Link to="/home" className="back-link">← Back to Home</Link>
          </div>
        ) : (
          <div className="results-list">
            {searchResults.map((paper, index) => (
              <div key={index} className="result-item">
                <div className="result-header">
                  <h3 className="paper-title">
                    <Link
                      to={`/teachers/${encodeURIComponent(paper.teacherName)}/publications/${encodeURIComponent(paper.title)}`}
                      className="title-link"
                    >
                      {paper.title}
                    </Link>
                  </h3>
                  {paper.pdfLink && (
                    <a 
                      href={paper.pdfLink} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="pdf-link"
                    >
                      [PDF]
                    </a>
                  )}
                </div>
                
                <div className="result-meta">
                  <span className="authors">{paper.authors}</span>
                  {paper.year && (
                    <span className="year">• {formatYear(paper.year)}</span>
                  )}
                  {paper.citationCount > 0 && (
                    <span className="citations">• {paper.citationCount} citation{paper.citationCount !== 1 ? "s" : ""}</span>
                  )}
                  <span className="teacher">• {paper.teacherName}</span>
                </div>

                {getSourceInfo(paper) && (
                  <div className="source-info">
                    <span className="source">{getSourceInfo(paper)}</span>
                  </div>
                )}

                {(paper.description || paper.summary) && (
                  <div className="result-snippet">
                    {truncateText(paper.description || paper.summary)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchResultsPage; 