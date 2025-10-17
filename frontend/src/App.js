import './App.css';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';

// ✅ Import your components
import Navbar from './components/navbar';
import HomePage from './pages/home';
import AdminPage from './pages/AdminPage'; // <== Add this import
import TeacherPage from './pages/TeacherPage';
import IndividualTeacherPage from './pages/IndividualTeacherPage';
import PublicationDetailsPage from './pages/PublicationDetailsPage';
import SearchResultsPage from './pages/SearchResultsPage';
import ProjectRepository from './pages/ProjectRepository';
import About from './pages/About';

function AppRoutes() {
  const location = useLocation();

  useEffect(() => {
    const isAdmin = localStorage.getItem('isAdminLoggedIn') === 'true';
    if (isAdmin) {
      localStorage.setItem('adminLastActivity', String(Date.now()));
    }
  }, [location]);

  useEffect(() => {
    const SESSION_TIMEOUT_MS = 2 * 60 * 1000;
    const tick = () => {
      const isAdmin = localStorage.getItem('isAdminLoggedIn') === 'true';
      const last = Number(localStorage.getItem('adminLastActivity') || '0');
      if (isAdmin && last > 0 && Date.now() - last > SESSION_TIMEOUT_MS) {
        localStorage.removeItem('isAdminLoggedIn');
        localStorage.removeItem('adminLoginTime');
        localStorage.removeItem('adminLastActivity');
      }
    };
    const interval = setInterval(tick, 5000);
    const onAnyActivity = () => {
      if (localStorage.getItem('isAdminLoggedIn') === 'true') {
        localStorage.setItem('adminLastActivity', String(Date.now()));
      }
    };
    window.addEventListener('click', onAnyActivity, true);
    window.addEventListener('keydown', onAnyActivity, true);
    window.addEventListener('scroll', onAnyActivity, true);
    window.addEventListener('mousemove', onAnyActivity, true);
    window.addEventListener('touchstart', onAnyActivity, true);
    onAnyActivity();
    return () => {
      clearInterval(interval);
      window.removeEventListener('click', onAnyActivity, true);
      window.removeEventListener('keydown', onAnyActivity, true);
      window.removeEventListener('scroll', onAnyActivity, true);
      window.removeEventListener('mousemove', onAnyActivity, true);
      window.removeEventListener('touchstart', onAnyActivity, true);
    };
  }, []);

  return (
    <>
      <Navbar />
      <Routes>
        <Route path='/' element={<Navigate to="/home" />} />
        <Route exact path='/home' element={<HomePage />} />
        <Route path='/admin' element={<AdminPage />} />
        <Route path='/teachers' element={<TeacherPage />} />
        <Route path='/project-repository' element={<ProjectRepository />} />
        <Route path='/about' element={<About />} />
        <Route path='/teachers/:teacherId' element={<IndividualTeacherPage />} />
        <Route path='/teachers/:teacherId/publications/:publicationId' element={<PublicationDetailsPage />} />
        <Route path='/search' element={<SearchResultsPage />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </div>
  );
}

export default App;
