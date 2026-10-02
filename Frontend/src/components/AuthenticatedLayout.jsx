import { NavLink } from "react-router";

import { useAuth } from "../context/AuthContext";

export default function AuthenticatedLayout({ children }) {
  const { user, logout } = useAuth();

  async function handleLogout() {
    await logout();
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
