import { NavLink, Route, Routes } from "react-router-dom";
import CreatePage from "./pages/CreatePage";
import SitesPage from "./pages/SitesPage";
import SiteDetailPage from "./pages/SiteDetailPage";

function Mark() {
  return (
    <svg className="brand-mark" viewBox="0 0 36 36" aria-hidden>
      <rect width="36" height="36" rx="9" fill="#3286ff" />
      <path
        d="M11.2 10.2h9.6l4.6 4.6v11a1.4 1.4 0 0 1-1.4 1.4H11.2a1.4 1.4 0 0 1-1.4-1.4v-14a1.4 1.4 0 0 1 1.4-1.4z"
        fill="#fff"
      />
      <path d="M20.6 10.4v4.6h4.6" fill="#3286ff" />
      <path
        d="M13.2 19.2h9.2M13.2 22.6h6.4"
        fill="none"
        stroke="#3286ff"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function App() {
  return (
    <div className="site">
      <header className="topbar">
        <div className="topbar-inner">
          <div className="topbar-left">
            <NavLink to="/" className="brand" end>
              <Mark />
              <span className="brand-word">atelier.</span>
            </NavLink>
            <nav className="nav-pills">
              <NavLink to="/" end>
                Create
              </NavLink>
              <a href="/#journal">Journal</a>
              <NavLink to="/sites">Sites</NavLink>
            </nav>
          </div>
          <div className="topbar-right">
            <NavLink to="/sites" className="nav-text">
              Sites
            </NavLink>
            <a className="btn btn-primary" href="/#create">
              Generate
            </a>
          </div>
        </div>
      </header>
      <Routes>
        <Route path="/" element={<CreatePage />} />
        <Route
          path="/sites"
          element={
            <div className="page-wrap">
              <SitesPage />
            </div>
          }
        />
        <Route
          path="/sites/:id"
          element={
            <div className="page-wrap">
              <SiteDetailPage />
            </div>
          }
        />
      </Routes>
    </div>
  );
}
