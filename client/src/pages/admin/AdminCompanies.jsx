import { useEffect, useState } from 'react';
import api, { getErr } from '../../api/client';
import { useToast } from '../../components/Toast';
import Loader from '../../components/Loader';
import EmptyState from '../../components/EmptyState';
import Modal from '../../components/Modal';

const EMPTY = { name: '', industry: '', location: '', website: '' };

export default function AdminCompanies() {
  const toast = useToast();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | { mode:'add' } | { mode:'edit', company }
  const [form, setForm] = useState(EMPTY);

  const load = () => api.get('/companies').then((r) => setCompanies(r.data.data));

  useEffect(() => {
    load().catch((e) => toast(getErr(e), 'error')).finally(() => setLoading(false));
  }, []);

  const openAdd = () => { setForm(EMPTY); setModal({ mode: 'add' }); };
  const openEdit = (company) => {
    setForm({ name: company.name, industry: company.industry || '', location: company.location || '', website: company.website || '' });
    setModal({ mode: 'edit', company });
  };

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const save = async (e) => {
    e.preventDefault();
    try {
      if (modal.mode === 'add') {
        await api.post('/companies', form);
        toast('Company created ✔');
      } else {
        await api.put(`/companies/${modal.company.id}`, form);
        toast('Company updated ✔');
      }
      setModal(null);
      await load();
    } catch (err) {
      toast(getErr(err), 'error');
    }
  };

  const remove = async (company) => {
    if (!window.confirm(`Delete "${company.name}"? Its internships and applications will also be removed.`)) return;
    try {
      await api.delete(`/companies/${company.id}`);
      setCompanies(companies.filter((c) => c.id !== company.id));
      toast('Company deleted');
    } catch (err) {
      toast(getErr(err), 'error');
    }
  };

  if (loading) return <Loader />;

  return (
    <div className="card">
      <div className="row mb">
        <h3 style={{ margin: 0 }}>Companies ({companies.length})</h3>
        <button className="btn primary sm" onClick={openAdd}>+ Add company</button>
      </div>
      {companies.length === 0 ? (
        <EmptyState icon="🏢" text="No companies yet" />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Name</th><th>Industry</th><th>Location</th><th>Website</th><th>Internships</th><th></th></tr>
            </thead>
            <tbody>
              {companies.map((c) => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 600 }}>{c.name}</td>
                  <td><span className="pill">{c.industry || '—'}</span></td>
                  <td className="small">{c.location || '—'}</td>
                  <td className="small">
                    {c.website ? <a href={c.website} target="_blank" rel="noreferrer" style={{ color: 'var(--c-primary)' }}>link</a> : '—'}
                  </td>
                  <td>{c.internship_count}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <button className="btn ghost sm" onClick={() => openEdit(c)}>Edit</button>{' '}
                    <button className="btn danger sm" onClick={() => remove(c)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <Modal title={modal.mode === 'add' ? 'Add company' : `Edit ${modal.company.name}`} onClose={() => setModal(null)}>
          <form onSubmit={save}>
            <div className="field">
              <label>Name</label>
              <input name="name" value={form.name} onChange={onChange} required />
            </div>
            <div className="form-row">
              <div className="field">
                <label>Industry</label>
                <input name="industry" value={form.industry} onChange={onChange} />
              </div>
              <div className="field">
                <label>Location</label>
                <input name="location" value={form.location} onChange={onChange} />
              </div>
            </div>
            <div className="field">
              <label>Website</label>
              <input name="website" value={form.website} onChange={onChange} placeholder="https://…" />
            </div>
            <div className="actions">
              <button type="button" className="btn ghost" onClick={() => setModal(null)}>Cancel</button>
              <button type="submit" className="btn primary">{modal.mode === 'add' ? 'Create' : 'Save'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
