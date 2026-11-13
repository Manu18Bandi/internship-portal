import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './auth/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/student/Dashboard';
import Profile from './pages/student/Profile';
import BrowseInternships from './pages/student/BrowseInternships';
import MyApplications from './pages/student/MyApplications';
import Certificates from './pages/student/Certificates';
import AdminApplications from './pages/admin/AdminApplications';
import AdminCompanies from './pages/admin/AdminCompanies';
import AdminInternships from './pages/admin/AdminInternships';

export default function App() {
  const { authEnabled, user, loading, isAdmin } = useAuth();

  if (loading) {
    return <div className="loading" style={{ paddingTop: '30vh' }}>Loading…</div>;
  }

  // OAuth on + not signed in → login screen
  if (authEnabled && !user) {
    return (
      <Routes>
        <Route path="*" element={<Login />} />
      </Routes>
    );
  }

  const guardAdmin = (el) =>
    (authEnabled && !isAdmin) ? <Navigate to="/" replace /> : el;

  return (
    <Routes>
      <Route element={<Layout />}>
        {/* Student */}
        <Route path="/" element={<Dashboard />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/internships" element={<BrowseInternships />} />
        <Route path="/applications" element={<MyApplications />} />
        <Route path="/certificates" element={<Certificates />} />
        {/* Admin (role-guarded when auth is on) */}
        <Route path="/admin/applications" element={guardAdmin(<AdminApplications />)} />
        <Route path="/admin/companies" element={guardAdmin(<AdminCompanies />)} />
        <Route path="/admin/internships" element={guardAdmin(<AdminInternships />)} />
        <Route path="*" element={<Dashboard />} />
      </Route>
    </Routes>
  );
}
