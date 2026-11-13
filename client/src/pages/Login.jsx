export default function Login() {
  return (
    <div className="login-wrap">
      <div className="card login-card">
        <div className="logo">Intern<span>Portal</span></div>
        <div className="muted small">Department of Computer Science</div>
        <p>
          Track your internships, technical skills and certificates — sign in with
          your GitHub account to continue.
        </p>
        <a className="btn primary" href="/api/auth/github">
          &nbsp;Sign in with GitHub
        </a>
        <div className="demo-note">
          Students get a personal dashboard · department staff get the admin panel
        </div>
      </div>
    </div>
  );
}
