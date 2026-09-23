import { NavLink, Outlet, useLocation } from "react-router-dom";

export default function Layout() {
  const location = useLocation();
  const isCandidate = location.pathname.startsWith("/candidate");
  const role = isCandidate ? "candidate" : "recruiter";

  function persistRole(next) {
    localStorage.setItem("activeRole", next);
  }

  return (
    <div className={`app role-${role}`}>
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">AI</span>
          <div>
            <strong>Interview Generator</strong>
            <p>Domain-specific questions, answers, and LLM scoring</p>
          </div>
        </div>
        <div className="role-switch" aria-label="Active role">
          <span className="role-label">Active role</span>
          <NavLink
            to="/recruiter"
            className={({ isActive }) => (isActive ? "role-btn active" : "role-btn")}
            onClick={() => persistRole("recruiter")}
          >
            Recruiter
          </NavLink>
          <NavLink
            to="/candidate"
            className={({ isActive }) => (isActive ? "role-btn active" : "role-btn")}
            onClick={() => persistRole("candidate")}
          >
            Candidate
          </NavLink>
        </div>
      </header>
      <main className="page">
        <Outlet />
      </main>
    </div>
  );
}
