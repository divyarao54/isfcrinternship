import React, { useState } from "react";
import { Link } from "react-router-dom";
import "./navbar.css";

const Navbar = () => {
  const [isMenuActive, setIsMenuActive] = useState(false);

  const toggleMenu = () => {
    setIsMenuActive(!isMenuActive);
  };

  const closeMenu = () => {
    setIsMenuActive(false);
  };

  return (
    <header className="header">
      <nav className="navbar">
        <div className="nav-left">
          <div className="nav-logo">
            <Link to="/home">
              <img src="/ISFCR_logo.png" alt="Logo" className="logo-img" />
            </Link>
          </div>
          <input
            type="text"
            placeholder="Search papers..."
            className="search-bar"
            // onChange or onKeyDown can be added here for search functionality
          />
        </div>

        <ul className={`nav-menu ${isMenuActive ? "active" : ""}`}>
          <li className="nav-item">
            <Link to="/home" className="nav-link" onClick={closeMenu}>
              Dashboard
            </Link>
          </li>
          <li className="nav-item">
            <Link to="/teachers" className="nav-link" onClick={closeMenu}>
              Teachers' Overview
            </Link>
          </li>
          <li className="nav-item">
            <Link to="/admin" className="nav-link" onClick={closeMenu}>
              Admin
            </Link>
          </li>
          <li className="nav-item">
            <Link to="/faq" className="nav-link" onClick={closeMenu}>
              FAQs
            </Link>
          </li>
        </ul>

        <div
          className={`hamburger ${isMenuActive ? "active" : ""}`}
          onClick={toggleMenu}
        >
          <span className="bar"></span>
          <span className="bar"></span>
          <span className="bar"></span>
        </div>
      </nav>
    </header>
  );
};

export default Navbar;
