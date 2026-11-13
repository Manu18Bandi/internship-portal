import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import api from '../api/client';

const STUDENT_ID = 1; // single-student demo mode (no auth)

const NAV = [
  { section: 'Student' },
  { to: '/', label: '🏠  Dashboard', end: true },
  { to: '/profile', label: '👤  Profile & Skills' },
  { to: '/internships', label: '🔎  Browse Internships' },
  { to: '/applications', label: '📮  My Applications' },
  { to: '/certificates', label: '📜  Certificates' },
  { section: 'Department Admin' },
  { to: '/admin/applications', label: '🗂  Applications' },
  { to: '/admin/companies', label: '🏢  Companies' },
  { to: '/admin/internships', label: '💼  Internships' },
];

export default function Layout() {
  const [student, setStudent] = useState(null);
  const { pathname } = useLocation();

  useEffect(() => {
    api.get(`/students/${STUDENT_ID}`)
      .then((r) => setStudent(r.data.data))
      .catch(() => {});
  }, []);

  const title = NAV.find((n) => n.to === pathname)?.label?.replace(/^\S+\s+/, '') || 'Internship Portal';

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">Intern<span>Portal</span></div>
        {NAV.map((item) =>
          item.section ? (
            <div className="section" key={item.section}>{item.section}</div>
          ) : (
            <NavLink key={item.to} to={item.to} end={item.end} className="nav-link">
              {item.label}
            </NavLink>
          )
        )}
      </aside>

      <div className="main">
        <header className="topbar">
          <h1>{title}</h1>
          <div className="user">
            <div className="name">{student?.name || '…'}</div>
            <div className="meta">{student ? `${student.department} · Year ${student.year}` : ''}</div>
          </div>
        </header>
        <main className="content">
          <Outlet context={{ studentId: STUDENT_ID }} />
        </main>
      </div>
    </div>
  );
}

export { STUDENT_ID };
