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

        <button type="button" onClick={handleLogout}>
          Esci
        </button>

        <hr />
      </header>

      <main>{children}</main>
    </>
  );
}
