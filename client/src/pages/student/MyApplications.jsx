import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import api, { getErr } from '../../api/client';
import { useToast } from '../../components/Toast';
import StatusBadge from '../../components/StatusBadge';
import Loader from '../../components/Loader';
import EmptyState from '../../components/EmptyState';

const STAGES = ['Applied', 'Under Review', 'Selected'];
const stageIndex = (status) =>
  status === 'Completed' ? 2 : STAGES.indexOf(status);

export default function MyApplications() {
  const { studentId } = useOutletContext();
  const toast = useToast();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () =>
    api.get(`/students/${studentId}/applications`)
      .then((r) => setApplications(r.data.data));

  useEffect(() => {
    load().catch((e) => toast(getErr(e), 'error')).finally(() => setLoading(false));
  }, [studentId]);

  const withdraw = async (id) => {
    if (!window.confirm('Withdraw this application?')) return;
    try {
      await api.delete(`/applications/${id}`);
      setApplications(applications.filter((a) => a.id !== id));
      toast('Application withdrawn');
    } catch (err) {
      toast(getErr(err), 'error');
    }
  };

  if (loading) return <Loader />;

  return (
    <div className="card">
      <h3>My internship applications ({applications.length})</h3>
      {applications.length === 0 ? (
        <EmptyState icon="📮" text="You haven't applied to any internships yet" />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Internship</th><th>Company</th><th>Domain</th>
                <th>Deadline</th><th>Progress</th><th>Status</th><th></th>
              </tr>
            </thead>
            <tbody>
              {applications.map((a) => {
                const idx = stageIndex(a.status);
                return (
                  <tr key={a.id}>
                    <td style={{ fontWeight: 600 }}>{a.internship_title}</td>
                    <td>{a.company_name}</td>
                    <td><span className="pill">{a.domain}</span></td>
                    <td className="muted small">{a.deadline}</td>
                    <td style={{ minWidth: 110 }}>
                      <div className="tracker">
                        {STAGES.map((s, i) => (
                          <div key={s} className={`step ${a.status === 'Rejected' ? (i === 0 ? 'done' : '') : idx >= i ? 'done' : ''}`} />
                        ))}
                      </div>
                    </td>
                    <td><StatusBadge status={a.status} /></td>
                    <td>
                      {/* conditional rendering: only Applied can be withdrawn */}
                      {a.status === 'Applied' && (
                        <button className="btn danger sm" onClick={() => withdraw(a.id)}>Withdraw</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
