import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../auth/AuthContext';

const NAV = [
  { section: 'Student' },
  { to: '/', label: '🏠  Dashboard', end: true },
  { to: '/profile', label: '👤  Profile & Skills' },
  { to: '/internships', label: '🔎  Browse Internships' },
  { to: '/applications', label: '📮  My Applications' },
  { to: '/certificates', label: '📜  Certificates' },
  { section: 'Department Admin', adminOnly: true },
  { to: '/admin/applications', label: '🗂  Applications', adminOnly: true },
  { to: '/admin/companies', label: '🏢  Companies', adminOnly: true },
  { to: '/admin/internships', label: '💼  Internships', adminOnly: true },
];

export default function Layout() {
  const { user, student, studentId, logout, authEnabled, isAdmin } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();
  const pinged = useRef(false); // one visit ping per session (StrictMode-safe)

  // close the mobile drawer on navigation
  useEffect(() => { setMenuOpen(false); }, [pathname]);

  useEffect(() => {
    if (pinged.current || authEnabled === null) return;
    pinged.current = true;
    api.post('/visits/ping', { source: 'user' }).catch(() => {});
  }, [authEnabled]);

  const title = NAV.find((n) => n.to === pathname)?.label?.replace(/^\S+\s+/, '') || 'Internship Portal';
  const isAdminUser = authEnabled === false || isAdmin; // demo mode → show admin nav

  return (
    <div className="app">
      <aside className={`sidebar ${menuOpen ? 'open' : ''}`}>
        <div className="brand">Intern<span>Portal</span></div>
        {NAV.map((item) =>
          item.section ? (
            (isAdminUser || !item.adminOnly) &&
            <div className="section" key={item.section}>{item.section}</div>
          ) : (
            (!item.adminOnly || isAdminUser) && (
              <NavLink key={item.to} to={item.to} end={item.end} className="nav-link">
                {item.label}
              </NavLink>
            )
          )
        )}
      </aside>
      <div
        className={`scrim ${menuOpen ? 'show' : ''}`}
        onClick={() => setMenuOpen(false)}
      />

      <div className="main">
        <header className="topbar">
          <div className="tb-left">
            <button className="hamburger" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu">
              <span /><span /><span />
            </button>
            <h1>{title}</h1>
          </div>
          <div className="tb-right">
            {authEnabled && user ? (
              <button
                className="user-chip"
                onClick={logout}
                title="Sign out"
              >
                <img src={user.avatar_url} alt="" />
                {user.name?.split(' ')[0] || user.login} · Sign out
              </button>
            ) : (
              student && (
                <div className="user">
                  <div className="name">{student.name}</div>
                  <div className="meta">{student.department} · Year {student.year}</div>
                </div>
              )
            )}
          </div>
        </header>
        <main className="content">
          <Outlet context={{ studentId }} />
        </main>
      </div>
    </div>
  );
}
