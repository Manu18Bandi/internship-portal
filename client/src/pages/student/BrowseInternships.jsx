import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { getErr } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { useToast } from '../../components/Toast';
import Loader from '../../components/Loader';
import EmptyState from '../../components/EmptyState';

export default function BrowseInternships() {
  const toast = useToast();
  const { studentId } = useAuth();
  const navigate = useNavigate();
  const [internships, setInternships] = useState([]);
  const [domains, setDomains] = useState([]);
  const [appliedIds, setAppliedIds] = useState(new Set());
  const [domain, setDomain] = useState('All');   // filter state
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!studentId) return;
    Promise.all([
      api.get('/internships', { params: { domain, search, open: 'true' } }),
      api.get('/internships/domains'),
      api.get(`/students/${studentId}/applications`),
    ])
      .then(([list, d, apps]) => {
        setInternships(list.data.data);
        setDomains(d.data.data);
        setAppliedIds(new Set(apps.data.data.map((a) => a.internship_id)));
      })
      .catch((e) => toast(getErr(e, 'Could not load internships'), 'error'))
      .finally(() => setLoading(false));
  }, [domain, search, studentId]);

  const apply = async (internshipId) => {
    try {
      await api.post('/applications', { internship_id: internshipId });
      setAppliedIds(new Set([...appliedIds, internshipId]));
      toast('Application submitted ✔');
    } catch (err) {
      const msg = getErr(err);
      if (err?.response?.status === 401) navigate('/');
      toast(msg, 'error');
    }
  };

  return (
    <div>
      {/* filter bar — search + open-only are handled by re-fetch via useEffect */}
      <div className="card">
        <div className="filter-bar">
          <input
            placeholder="Search title, company or domain…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="chip-row">
          {/* conditional rendering: 'All' chip + one chip per domain */}
          <button className={`chip ${domain === 'All' ? 'active' : ''}`} onClick={() => setDomain('All')}>
            All
          </button>
          {domains.map((d) => (
            <button key={d} className={`chip ${domain === d ? 'active' : ''}`} onClick={() => setDomain(d)}>
              {d}
            </button>
          ))}
        </div>
      </div>

      <div className="mt">
        {loading ? <Loader /> : internships.length === 0 ? (
          <div className="card"><EmptyState icon="🔎" text="No internships match your filters" /></div>
        ) : (
          <div className="grid cols-2">
            {internships.map((i) => (
              <div className="card" key={i.id}>
                <div className="row">
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{i.title}</div>
                  <span className="pill">{i.domain}</span>
                </div>
                <div className="muted small mt" style={{ marginTop: 6 }}>
                  🏢 {i.company_name} · {i.company_location}
                </div>
                {i.description && <p className="small" style={{ marginTop: 10 }}>{i.description}</p>}
                <div className="muted small" style={{ marginTop: 10 }}>
                  ⏱ {i.duration_weeks} weeks · 💰 ₹{Number(i.stipend).toLocaleString('en-IN')}/mo ·
                  🪑 {i.seats} seats · 📅 apply by <b>{i.deadline}</b>
                </div>
                <div className="row" style={{ marginTop: 14 }}>
                  <span className="muted small">{i.applicant_count} applicant{i.applicant_count === 1 ? '' : 's'}</span>
                  {appliedIds.has(i.id) ? (
                    <button className="btn ghost sm" disabled>Applied ✓</button>
                  ) : (
                    <button className="btn primary sm" onClick={() => apply(i.id)}>Apply</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
