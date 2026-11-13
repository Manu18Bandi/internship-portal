import { useSearchParams } from 'react-router-dom';

const GitHubMark = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
  </svg>
);

const FEATURES = [
  { icon: '💼', title: 'Internship tracker', text: 'Browse openings by domain, apply in one click and follow every status change.' },
  { icon: '🧠', title: 'Skill portfolio', text: 'Build your technical skill set with proficiency levels the department can verify.' },
  { icon: '📜', title: 'Certificates', text: 'Upload completion certificates (PDF/JPG/PNG) and access them anytime.' },
  { icon: '🛡', title: 'Admin control', text: 'Department staff manage companies, openings and application decisions.' },
];

export default function Login() {
  const [params] = useSearchParams();
  const denied = params.get('denied');

  return (
    <div className="login-wrap">
      <div className="login-split">
        {/* ---- hero / branding ---- */}
        <section className="login-hero">
          <div className="logo">Intern<span>Portal</span></div>
          <h1>
            Your internship journey,<br />organized in one place.
          </h1>
          <p>
            The Department of Computer Science&rsquo;s centralized portal for
            internship companies, opportunities, skills and certificates.
          </p>
          <ul className="feature-list">
            {FEATURES.map((f) => (
              <li key={f.title}>
                <span className="feature-icon">{f.icon}</span>
                <span>
                  <b>{f.title}</b>
                  <small>{f.text}</small>
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* ---- sign-in card ---- */}
        <section className="card login-card">
          <span className="badge-tag">Secure sign-in</span>
          <h2>Welcome back</h2>
          <p className="login-sub">
            Use your GitHub account to continue. Access is limited to
            authorized department accounts.
          </p>

          {denied && (
            <div className="notice" role="alert">
              🚫 This portal is restricted. Your GitHub account is not
              authorized to sign in.
            </div>
          )}

          <a className="btn primary github-btn" href="/api/auth/github">
            <GitHubMark /> Continue with GitHub
          </a>

          <div className="login-foot">
            <span>By continuing you agree to use this portal for departmental purposes only.</span>
          </div>
        </section>
      </div>
    </div>
  );
}
