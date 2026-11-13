import { useEffect, useState } from 'react';
import api, { getErr } from '../../api/client';
import { useToast } from '../../components/Toast';
import Loader from '../../components/Loader';
import EmptyState from '../../components/EmptyState';
import Modal from '../../components/Modal';

const EMPTY = {
  company_id: '', title: '', domain: '', description: '',
  duration_weeks: 8, stipend: 0, seats: 1, deadline: '',
};

export default function AdminInternships() {
  const toast = useToast();
  const [internships, setInternships] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY);

  const load = () =>
    Promise.all([api.get('/internships'), api.get('/companies')])
      .then(([i, c]) => { setInternships(i.data.data); setCompanies(c.data.data); });

  useEffect(() => {
    load().catch((e) => toast(getErr(e), 'error')).finally(() => setLoading(false));
  }, []);

  const openAdd = () => {
    setForm({ ...EMPTY, company_id: companies[0]?.id || '' });
    setModal({ mode: 'add' });
  };
  const openEdit = (i) => {
    setForm({
      company_id: i.company_id, title: i.title, domain: i.domain,
      description: i.description || '', duration_weeks: i.duration_weeks,
      stipend: Number(i.stipend), seats: i.seats, deadline: i.deadline,
    });
    setModal({ mode: 'edit', internship: i });
  };

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const save = async (e) => {
    e.preventDefault();
    try {
      if (modal.mode === 'add') {
        await api.post('/internships', form);
        toast('Internship created ✔');
      } else {
        await api.put(`/internships/${modal.internship.id}`, form);
        toast('Internship updated ✔');
      }
      setModal(null);
      await load();
    } catch (err) {
      toast(getErr(err), 'error');
    }
  };

  const remove = async (i) => {
    if (!window.confirm(`Delete internship "${i.title}"?`)) return;
    try {
      await api.delete(`/internships/${i.id}`);
      setInternships(internships.filter((x) => x.id !== i.id));
      toast('Internship deleted');
    } catch (err) {
      toast(getErr(err), 'error');
    }
  };

  if (loading) return <Loader />;

  return (
    <div className="card">
      <div className="row mb">
        <h3 style={{ margin: 0 }}>Internships ({internships.length})</h3>
        <button className="btn primary sm" onClick={openAdd} disabled={companies.length === 0}>
          + Add internship
        </button>
      </div>
      {internships.length === 0 ? (
        <EmptyState icon="💼" text="No internships yet — add a company first, then create internships" />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Title</th><th>Company</th><th>Domain</th><th>Duration</th>
                <th>Stipend</th><th>Seats</th><th>Applicants</th><th>Deadline</th><th></th>
              </tr>
            </thead>
            <tbody>
              {internships.map((i) => (
                <tr key={i.id}>
                  <td style={{ fontWeight: 600 }}>{i.title}</td>
                  <td className="small">{i.company_name}</td>
                  <td><span className="pill">{i.domain}</span></td>
                  <td className="small">{i.duration_weeks} wks</td>
                  <td className="small">₹{Number(i.stipend).toLocaleString('en-IN')}</td>
                  <td className="small">{i.seats}</td>
                  <td className="small">{i.applicant_count}</td>
                  <td className="muted small">{i.deadline}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <button className="btn ghost sm" onClick={() => openEdit(i)}>Edit</button>{' '}
                    <button className="btn danger sm" onClick={() => remove(i)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <Modal title={modal.mode === 'add' ? 'Add internship' : `Edit "${modal.internship.title}"`} onClose={() => setModal(null)}>
          <form onSubmit={save}>
            <div className="field">
              <label>Company</label>
              <select name="company_id" value={form.company_id} onChange={onChange} required>
                {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Title</label>
              <input name="title" value={form.title} onChange={onChange} required />
            </div>
            <div className="form-row">
              <div className="field">
                <label>Domain</label>
                <input name="domain" value={form.domain} onChange={onChange}
                  placeholder="e.g. Web Development" required list="domains" />
                <datalist id="domains">
                  {[...new Set(internships.map((i) => i.domain))].map((d) => <option key={d} value={d} />)}
                </datalist>
              </div>
              <div className="field">
                <label>Application deadline</label>
                <input name="deadline" type="date" value={form.deadline} onChange={onChange} required />
              </div>
            </div>
            <div className="form-row">
              <div className="field">
                <label>Duration (weeks)</label>
                <input name="duration_weeks" type="number" min="1" value={form.duration_weeks} onChange={onChange} />
              </div>
              <div className="field">
                <label>Stipend (₹/month)</label>
                <input name="stipend" type="number" min="0" value={form.stipend} onChange={onChange} />
              </div>
            </div>
            <div className="field">
              <label>Seats</label>
              <input name="seats" type="number" min="1" value={form.seats} onChange={onChange} />
            </div>
            <div className="field">
              <label>Description</label>
              <textarea name="description" value={form.description} onChange={onChange} />
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
