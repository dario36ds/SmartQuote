import { Link } from "react-router";

export default function RegisterPage() {
  return (
    <main>
      <h1>SmartQuote</h1>
      <h2>Registrati</h2>

      <p>
        Hai già un account?{" "}
        <Link to="/login">Accedi</Link>
      </p>
    </main>
  );
}
