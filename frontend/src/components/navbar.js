import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./navbar.css";

const Navbar = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery(""); // Clear search input after navigation
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleSearch(e);
    }
  };

  return (
    <header className="header">
      <nav className="navbar">
        <div className="nav-left">
          <div className="nav-logo">
            <Link to="/home">
              <img src="/ISFCR_logo.png" alt="ISFCR Logo" className="logo-img" />
            </Link>
          </div>
          <form onSubmit={handleSearch} className="search-form">
            <input
              type="text"
              placeholder="Search papers..."
              className="search-bar"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleKeyPress}
            />
            <button type="submit" className="search-button">
            <img src="/search.png" alt="Search" />
            </button>
          </form>
        </div>
        <div className="nav-center">
          <img src="/PES-University-Logo.webp" alt="PES University Logo" className="pes-logo-img" />
        </div>
        <ul className="nav-menu">
          <li className="nav-item">
            <Link to="/home" className="nav-link">
              Dashboard
            </Link>
          </li>
          <li className="nav-item">
            <Link to="/admin" className="nav-link">
              Admin
            </Link>
          </li>
          <li className="nav-item">
            <Link to="/teachers" className="nav-link">
              Teachers' Overview
            </Link>
          </li>
          <li className="nav-item">
            <Link to="/project-repository" className="nav-link">
              Project Repository
            </Link>
          </li>
          <li className="nav-item">
            <Link to="/faq" className="nav-link">
              FAQs
            </Link>
          </li>
        </ul>


      </nav>
    </header>
  );
};

export default Navbar;
