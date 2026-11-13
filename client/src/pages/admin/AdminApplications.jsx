import { useEffect, useState } from 'react';
import api, { getErr } from '../../api/client';
import { useToast } from '../../components/Toast';
import StatusBadge from '../../components/StatusBadge';
import Loader from '../../components/Loader';
import EmptyState from '../../components/EmptyState';

const STATUSES = ['Applied', 'Under Review', 'Selected', 'Rejected', 'Completed'];

export default function AdminApplications() {
  const toast = useToast();
  const [applications, setApplications] = useState([]);
  const [statusFilter, setStatusFilter] = useState('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/applications', {
      params: statusFilter !== 'All' ? { status: statusFilter } : {},
    })
      .then((r) => setApplications(r.data.data))
      .catch((e) => toast(getErr(e), 'error'))
      .finally(() => setLoading(false));
  }, [statusFilter]);

  const updateStatus = async (id, status) => {
    try {
      await api.patch(`/applications/${id}/status`, { status });
      setApplications(applications.map((a) => (a.id === id ? { ...a, status } : a)));
      toast(`Status updated to "${status}" ✔`);
    } catch (err) {
      toast(getErr(err), 'error');
    }
  };

  if (loading) return <Loader />;

  return (
    <div className="card">
      <div className="row mb">
        <h3 style={{ margin: 0 }}>All applications ({applications.length})</h3>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option>All</option>
          {STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>
      {applications.length === 0 ? (
        <EmptyState icon="🗂" text="No applications found" />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th><th>Student</th><th>Internship</th><th>Company</th>
                <th>Domain</th><th>Applied</th><th>Status</th><th>Change status</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((a) => (
                <tr key={a.id}>
                  <td className="muted small">{a.id}</td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{a.student_name}</div>
                    <div className="muted small">{a.student_email}</div>
                  </td>
                  <td style={{ fontWeight: 600 }}>{a.internship_title}</td>
                  <td>{a.company_name}</td>
                  <td><span className="pill">{a.domain}</span></td>
                  <td className="muted small">{a.applied_at?.slice(0, 10)}</td>
                  <td><StatusBadge status={a.status} /></td>
                  <td>
                    <select value={a.status} onChange={(e) => updateStatus(a.id, e.target.value)}>
                      {STATUSES.map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
