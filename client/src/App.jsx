import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/student/Dashboard';
import Profile from './pages/student/Profile';
import BrowseInternships from './pages/student/BrowseInternships';
import MyApplications from './pages/student/MyApplications';
import Certificates from './pages/student/Certificates';
import AdminApplications from './pages/admin/AdminApplications';
import AdminCompanies from './pages/admin/AdminCompanies';
import AdminInternships from './pages/admin/AdminInternships';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        {/* Student */}
        <Route path="/" element={<Dashboard />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/internships" element={<BrowseInternships />} />
        <Route path="/applications" element={<MyApplications />} />
        <Route path="/certificates" element={<Certificates />} />
        {/* Admin */}
        <Route path="/admin/applications" element={<AdminApplications />} />
        <Route path="/admin/companies" element={<AdminCompanies />} />
        <Route path="/admin/internships" element={<AdminInternships />} />
        <Route path="*" element={<Dashboard />} />
      </Route>
    </Routes>
  );
}
