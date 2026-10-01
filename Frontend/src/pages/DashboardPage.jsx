import { useAuth } from "../context/AuthContext";

export default function DashboardPage() {
  const {
    user,
    logout,
  } = useAuth();

  async function handleLogout() {
    await logout();
  }

  return (
    <main>
      <h1>SmartQuote</h1>

      <p>
        Benvenuto,{" "}
        <strong>
          {user?.username}
        </strong>
      </p>

      <button onClick={handleLogout}>
        Esci
      </button>

      <hr />

      <h2>Dashboard</h2>

      <p>
        Da qui gestirai clienti e preventivi.
      </p>
    </main>
  );
}