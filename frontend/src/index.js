import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import axios from 'axios';

// Configure Axios base URL via environment variable for Netlify deployments
// Define REACT_APP_API_URL in Netlify (e.g., https://your-backend.onrender.com or Railway URL)
const apiBaseUrl = process.env.REACT_APP_API_URL;
if (apiBaseUrl) {
  axios.defaults.baseURL = apiBaseUrl;
}

// Rewrite hardcoded localhost API calls to deployed backend if base URL is set
axios.interceptors.request.use((config) => {
  if (apiBaseUrl && typeof config.url === 'string') {
    if (config.url.startsWith('http://localhost:5000')) {
      const path = config.url.replace('http://localhost:5000', '');
      config.url = path.startsWith('/') ? path : `/${path}`;
    }
    // If request URL is relative, Axios will prepend defaults.baseURL
  }
  return config;
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
