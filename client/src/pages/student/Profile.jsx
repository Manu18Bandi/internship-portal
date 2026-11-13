import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import api, { getErr } from '../../api/client';
import { useToast } from '../../components/Toast';
import Loader from '../../components/Loader';

const PROFICIENCIES = ['Beginner', 'Intermediate', 'Advanced'];
const EMPTY_FORM = {
  name: '', email: '', phone: '', department: '', year: '3', cgpa: '', bio: '',
};

export default function Profile() {
  const { studentId } = useOutletContext();
  const toast = useToast();

  const [student, setStudent] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);   // controlled form state
  const [skills, setSkills] = useState([]);
  const [catalog, setCatalog] = useState([]);      // master skill list
  const [skillId, setSkillId] = useState('');
  const [proficiency, setProficiency] = useState('Beginner');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get(`/students/${studentId}`),
      api.get(`/students/${studentId}/skills`),
      api.get('/skills'),
    ])
      .then(([s, sk, cat]) => {
        setStudent(s.data.data);
        setForm({ ...EMPTY_FORM, ...s.data.data });
        setSkills(sk.data.data);
        setCatalog(cat.data.data.grouped);
      })
      .catch((e) => toast(getErr(e, 'Could not load profile'), 'error'));
  }, [studentId]);

  // Controlled inputs: single handler for every field
  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const saveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const r = await api.put(`/students/${studentId}`, form);
      setStudent(r.data.data);
      toast('Profile updated ✔');
    } catch (err) {
      toast(getErr(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  const addSkill = async (e) => {
    e.preventDefault();
    if (!skillId) return toast('Pick a skill first', 'error');
    try {
      const r = await api.post(`/students/${studentId}/skills`, {
        skill_id: Number(skillId), proficiency,
      });
      setSkills([...skills, r.data.data]);
      setSkillId('');
      toast('Skill added ✔');
    } catch (err) {
      toast(getErr(err), 'error');
    }
  };

  const removeSkill = async (sid) => {
    try {
      await api.delete(`/students/${studentId}/skills/${sid}`);
      setSkills(skills.filter((s) => s.id !== sid)); // filter() to update list
      toast('Skill removed');
    } catch (err) {
      toast(getErr(err), 'error');
    }
  };

  if (!student) return <Loader />;

  // skills already added — filter them out of the dropdown
  const available = Object.entries(catalog)
    .map(([category, list]) => ({
      category,
      list: list.filter((s) => !skills.some((mine) => mine.id === s.id)),
    }))
    .filter((g) => g.list.length > 0);

  return (
    <div className="grid cols-2" style={{ alignItems: 'start' }}>
      {/* ---- profile form ---- */}
      <form className="card" onSubmit={saveProfile}>
        <h3>Student profile</h3>
        <div className="form-row">
          <div className="field">
            <label>Full name</label>
            <input name="name" value={form.name} onChange={onChange} required />
          </div>
          <div className="field">
            <label>Email</label>
            <input name="email" type="email" value={form.email} onChange={onChange} required />
          </div>
        </div>
        <div className="form-row">
          <div className="field">
            <label>Phone</label>
            <input name="phone" value={form.phone || ''} onChange={onChange} />
          </div>
          <div className="field">
            <label>Department</label>
            <input name="department" value={form.department} onChange={onChange} required />
          </div>
        </div>
        <div className="form-row">
          <div className="field">
            <label>Year</label>
            <select name="year" value={form.year} onChange={onChange}>
              {['1', '2', '3', '4'].map((y) => <option key={y} value={y}>Year {y}</option>)}
            </select>
          </div>
          <div className="field">
            <label>CGPA (0–10)</label>
            <input name="cgpa" type="number" step="0.01" min="0" max="10"
              value={form.cgpa ?? ''} onChange={onChange} />
          </div>
        </div>
        <div className="field">
          <label>Bio</label>
          <textarea name="bio" value={form.bio || ''} onChange={onChange}
            placeholder="Short introduction…" />
        </div>
        <button className="btn primary" type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Save profile'}
        </button>
      </form>

      {/* ---- skills ---- */}
      <div className="stack">
        <form className="card" onSubmit={addSkill}>
          <h3>Add technical skill</h3>
          <div className="form-row">
            <div className="field">
              <label>Skill</label>
              <select value={skillId} onChange={(e) => setSkillId(e.target.value)}>
                <option value="">— select a skill —</option>
                {available.map((g) => (
                  <optgroup key={g.category} label={g.category}>
                    {g.list.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </optgroup>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Proficiency</label>
              <select value={proficiency} onChange={(e) => setProficiency(e.target.value)}>
                {PROFICIENCIES.map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <button className="btn primary sm" type="submit">+ Add skill</button>
        </form>

        <div className="card">
          <h3>My skills ({skills.length})</h3>
          {skills.length === 0 ? (
            <p className="muted small">No skills added yet.</p>
          ) : (
            <div className="chip-row" style={{ margin: 0 }}>
              {skills.map((s) => (
                <span className="pill" key={s.id}>
                  {s.name} · <b>{s.proficiency}</b>
                  <button type="button" onClick={() => removeSkill(s.id)} title="Remove">✕</button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
