import { useEffect, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import api from '../../api/client';
import StatusBadge from '../../components/StatusBadge';
import Loader from '../../components/Loader';
import EmptyState from '../../components/EmptyState';

const STATUS_ORDER = ['Applied', 'Under Review', 'Selected', 'Rejected', 'Completed'];

export default function Dashboard() {
  const { studentId } = useOutletContext();
  const [student, setStudent] = useState(null);
  const [applications, setApplications] = useState([]);
  const [certCount, setCertCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get(`/students/${studentId}`),
      api.get(`/students/${studentId}/applications`),
      api.get(`/students/${studentId}/certificates`),
    ])
      .then(([s, a, c]) => {
        setStudent(s.data.data);
        setApplications(a.data.data);
        setCertCount(c.data.data.length);
      })
      .finally(() => setLoading(false));
  }, [studentId]);

  if (loading) return <Loader />;

  const stats = student.stats || {};
  const total = applications.length;
  const activeCount = applications.filter((a) =>
    ['Applied', 'Under Review', 'Selected'].includes(a.status)
  ).length;

  return (
    <div className="stack">
      {/* Profile summary */}
      <div className="card row">
        <div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{student.name}</div>
          <div className="muted small">
            {student.email} · {student.phone || '—'}
          </div>
          {student.bio && <div className="small mt" style={{ maxWidth: 560 }}>{student.bio}</div>}
        </div>
        <div className="stack" style={{ textAlign: 'right' }}>
          <span className="pill">{student.department}</span>
          <span className="muted small">CGPA {student.cgpa ?? '—'} · Year {student.year}</span>
        </div>
      </div>

      {/* Stat cards — map() over status data */}
      <div className="grid cols-4">
        <div className="card stat">
          <div className="label">Applications</div>
          <div className="value">{total}</div>
        </div>
        <div className="card stat">
          <div className="label">Active</div>
          <div className="value primary">{activeCount}</div>
        </div>
        <div className="card stat">
          <div className="label">Skills</div>
          <div className="value">{student.skills.length}</div>
        </div>
        <div className="card stat">
          <div className="label">Certificates</div>
          <div className="value">{certCount}</div>
        </div>
      </div>

      {/* Status breakdown */}
      <div className="card">
        <h3>Application status</h3>
        <div className="grid cols-4" style={{ gridTemplateColumns: `repeat(${STATUS_ORDER.length}, 1fr)` }}>
          {STATUS_ORDER.map((s) => (
            <div key={s}>
              <div className="small muted" style={{ marginBottom: 6 }}>{s}</div>
              <div style={{ fontWeight: 700, fontSize: 18 }}>
                {stats[s] ?? 0}
              </div>
              <div className="tracker mt" style={{ marginTop: 6 }}>
                <div className={`step ${stats[s] ? 'done' : ''}`} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent applications */}
      <div className="card">
        <div className="row mb">
          <h3 style={{ margin: 0 }}>Recent applications</h3>
          <Link to="/applications" className="btn ghost sm">View all →</Link>
        </div>
        {applications.length === 0 ? (
          <EmptyState icon="📮" text="No applications yet — browse internships to get started" />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Internship</th><th>Company</th><th>Domain</th><th>Applied</th><th>Status</th>
                </tr>
              </thead>
              <tbody>
                {applications.slice(0, 5).map((a) => (
                  <tr key={a.id}>
                    <td style={{ fontWeight: 600 }}>{a.internship_title}</td>
                    <td>{a.company_name}</td>
                    <td><span className="pill">{a.domain}</span></td>
                    <td className="muted small">{a.applied_at?.slice(0, 10)}</td>
                    <td><StatusBadge status={a.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
