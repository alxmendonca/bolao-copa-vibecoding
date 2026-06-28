import { Link, useLocation } from "react-router-dom";

export default function Header() {
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path ? "active" : "";
  };

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link to="/" className="site-logo">
          ⚽ <span>BET do Bolin</span>
        </Link>
        <nav className="site-nav">
          <Link to="/" className={`nav-link ${isActive("/")}`}>
            Simulador Local
          </Link>
          <Link to="/league/new" className={`nav-link ${isActive("/league/new")}`}>
            Criar Liga
          </Link>
          <Link to="/admin" className={`nav-link ${isActive("/admin")}`}>
            Admin
          </Link>
        </nav>
      </div>
    </header>
  );
}
