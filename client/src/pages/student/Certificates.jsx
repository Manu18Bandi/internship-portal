import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import api, { getErr } from '../../api/client';
import { useToast } from '../../components/Toast';
import Loader from '../../components/Loader';
import EmptyState from '../../components/EmptyState';

const EMPTY = { title: '', issuer: '', issue_date: '' };

export default function Certificates() {
  const { studentId } = useOutletContext();
  const toast = useToast();
  const [certificates, setCertificates] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [file, setFile] = useState(null);   // File object from <input type="file">
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = () =>
    api.get(`/students/${studentId}/certificates`)
      .then((r) => setCertificates(r.data.data));

  useEffect(() => {
    load().catch((e) => toast(getErr(e), 'error')).finally(() => setLoading(false));
  }, [studentId]);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setUploading(true);
    try {
      // multipart/form-data — works with or without a file attached
      const data = new FormData();
      Object.entries(form).forEach(([k, v]) => data.append(k, v));
      if (file) data.append('file', file);
      await api.post(`/students/${studentId}/certificates`, data);
      await load();
      setForm(EMPTY);
      setFile(null);
      e.target.reset?.();
      toast('Certificate added ✔');
    } catch (err) {
      toast(getErr(err), 'error');
    } finally {
      setUploading(false);
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this certificate?')) return;
    try {
      await api.delete(`/certificates/${id}`);
      setCertificates(certificates.filter((c) => c.id !== id));
      toast('Certificate deleted');
    } catch (err) {
      toast(getErr(err), 'error');
    }
  };

  if (loading) return <Loader />;

  return (
    <div className="grid cols-2" style={{ alignItems: 'start' }}>
      <form className="card" onSubmit={submit}>
        <h3>Add certificate</h3>
        <div className="field">
          <label>Title</label>
          <input name="title" value={form.title} onChange={onChange}
            placeholder="e.g. AWS Cloud Practitioner" required />
        </div>
        <div className="field">
          <label>Issuer</label>
          <input name="issuer" value={form.issuer} onChange={onChange}
            placeholder="e.g. Amazon Web Services" required />
        </div>
        <div className="field">
          <label>Issue date</label>
          <input name="issue_date" type="date" value={form.issue_date} onChange={onChange} required />
        </div>
        <div className="field">
          <label>Attach file (PDF / JPG / PNG, max 5 MB)</label>
          <input type="file" accept=".pdf,.jpg,.jpeg,.png"
            onChange={(e) => setFile(e.target.files[0] || null)} />
        </div>
        <button className="btn primary" type="submit" disabled={uploading}>
          {uploading ? 'Uploading…' : '+ Add certificate'}
        </button>
      </form>

      <div className="card">
        <h3>My certificates ({certificates.length})</h3>
        {certificates.length === 0 ? (
          <EmptyState icon="📜" text="No certificates added yet" />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Certificate</th><th>Issuer</th><th>Issued</th><th>File</th><th></th></tr>
              </thead>
              <tbody>
                {certificates.map((c) => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 600 }}>{c.title}</td>
                    <td className="small">{c.issuer}</td>
                    <td className="muted small">{c.issue_date}</td>
                    <td>
                      {c.file_path ? (
                        <a className="btn ghost sm" target="_blank" rel="noreferrer"
                          href={`/api/certificates/${c.id}/file`}>View</a>
                      ) : (
                        <span className="muted small">—</span>
                      )}
                    </td>
                    <td>
                      <button className="btn danger sm" onClick={() => remove(c.id)}>Delete</button>
                    </td>
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
