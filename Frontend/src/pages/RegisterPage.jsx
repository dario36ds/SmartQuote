import { useState } from "react";

import { Link } from "react-router";

import { apiRequest } from "../api";

export default function RegisterPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    if (loading || success) {
      return;
    }

    setError("");
    setLoading(true);

    try {
      await apiRequest("/auth/register/", {
        method: "POST",
        body: { username, email, password },
      });

      setSuccess(true);
      setPassword("");
    } catch (err) {
      setError(
        err.data?.username?.[0] ||
          err.data?.email?.[0] ||
          err.data?.password?.[0] ||
          err.data?.non_field_errors?.[0] ||
          err.message
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <h1>SmartQuote</h1>
      <h2>Registrati</h2>

      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="username">Username</label>

          <input
            id="username"
            name="username"
            autoComplete="username"
            disabled={loading || success}
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            required
          />
        </div>

        <div>
          <label htmlFor="email">Email (facoltativa)</label>

          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            disabled={loading || success}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>

        <div>
          <label htmlFor="password">Password (almeno 8 caratteri)</label>

          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            disabled={loading || success}
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </div>

        {error && <p role="alert">{error}</p>}

        <button type="submit" disabled={loading || success}>
          {loading ? "Registrazione..." : "Registrati"}
        </button>
      </form>

      {success && (
        <p role="status">Account creato. Ora puoi accedere.</p>
      )}

      <p>
        Hai già un account?{" "}
        <Link to="/login">Accedi</Link>
      </p>
    </main>
  );
}
