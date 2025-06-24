import './App.css';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// ✅ Import your components
import Navbar from './components/navbar';
import HomePage from './pages/home';
import AdminPage from './pages/AdminPage'; // <== Add this import
import TeacherPage from './pages/TeacherPage';
import IndividualTeacherPage from './pages/IndividualTeacherPage';
import PublicationDetailsPage from './pages/PublicationDetailsPage';
import SearchResultsPage from './pages/SearchResultsPage';

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Navbar />
        <Routes>
          <Route path='/' element={<Navigate to="/home" />} />
          <Route exact path='/home' element={<HomePage />} />
          <Route path='/admin' element={<AdminPage />} />
          <Route path='/teachers' element={<TeacherPage />} />
          <Route path='/teachers/:teacherId' element={<IndividualTeacherPage />} />
          <Route path='/teachers/:teacherId/publications/:publicationId' element={<PublicationDetailsPage />} />
          <Route path='/search' element={<SearchResultsPage />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
