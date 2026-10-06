import { NavLink } from "react-router";

import { useAuth } from "../context/AuthContext";
import AuthenticatedWorkspace from "./AuthenticatedWorkspace";

export default function AuthenticatedLayout({ children, variant, search, onSearch, onNewQuote }) {
  const { user, logout } = useAuth();

  async function handleLogout() {
    await logout();
  }

  if (["customers", "quotes", "dashboard", "settings"].includes(variant)) {
    return <AuthenticatedWorkspace variant={variant} search={search} onSearch={onSearch} onNewQuote={onNewQuote}>{children}</AuthenticatedWorkspace>;
  }

  return (
    <>
      <header>
        <h1>SmartQuote</h1>

        <p>
          Benvenuto, <strong>{user?.username}</strong>
        </p>

        <nav aria-label="Navigazione principale">
          <NavLink to="/" end>Dashboard</NavLink>
          {" | "}
          <NavLink to="/customers">Clienti</NavLink>
          {" | "}
          <NavLink to="/quotes">Preventivi</NavLink>
          {" | "}
          <NavLink to="/settings">Impostazioni</NavLink>
        </nav>

        <button type="button" onClick={handleLogout}>
          Esci
        </button>

        <hr />
      </header>

      <main>{children}</main>
    </>
  );
}
