import { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';

const AuthContext = createContext(null);

/**
 * Auth provider.
 *  - authEnabled: whether the server has GitHub OAuth configured
 *      null = unknown (loading), true = OAuth on, false = demo mode (no auth)
 *  - demo mode keeps legacy behavior: student id 1, admin nav visible
 */
export function AuthProvider({ children }) {
  const [authEnabled, setAuthEnabled] = useState(null);
  const [user, setUser] = useState(null);      // GitHub user or null
  const [student, setStudent] = useState(null); // linked student profile
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const status = await api.get('/auth/status');
        setAuthEnabled(status.data.data.enabled);

        if (status.data.data.enabled) {
          try {
            const me = await api.get('/auth/me');
            setUser(me.data.data.user);
            setStudent(me.data.data.student);
          } catch {
            setUser(null); // not signed in
          }
        } else {
          // demo mode: single demo student
          try {
            const s = await api.get('/students/1');
            setStudent(s.data.data);
          } catch { /* db down */ }
        }
      } catch {
        setAuthEnabled(false); // server unreachable → behave like demo mode
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = () => { window.location.href = '/api/auth/github'; };

  const logout = async () => {
    try { await api.post('/auth/logout'); } catch { /* ignore */ }
    setUser(null);
    setStudent(null);
    navigate('/login');
    window.location.reload();
  };

  const studentId = authEnabled ? (student?.id ?? null) : 1;
  const isAdmin = authEnabled ? user?.role === 'admin' : true;

  return (
    <AuthContext.Provider value={{ authEnabled, user, student, studentId, isAdmin, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
