import { useState } from "react";

import { Link } from "react-router";

import { apiRequest } from "../api";
import PasswordInput from "../components/PasswordInput";
import ValidatedInput from "../components/ValidatedInput";
import "./AuthPage.css";

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
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="register-heading">
        <h1>SmartQuote</h1>
        <h2 id="register-heading">Registrati</h2>

        <form onSubmit={handleSubmit}>
          <div>
            <label htmlFor="username">Username</label>

            <ValidatedInput
              id="username"
              name="username"
              autoComplete="username"
              maxLength={150}
              disabled={loading || success}
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              required
            />
          </div>

          <div>
            <label htmlFor="email">Email (facoltativa)</label>

            <ValidatedInput
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              maxLength={254}
              disabled={loading || success}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>

          <div>
            <label htmlFor="password">Password (almeno 8 caratteri)</label>

            <PasswordInput
              id="password"
              name="password"
              autoComplete="new-password"
              disabled={loading || success}
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>

          {error && <p className="auth-feedback auth-error" role="alert">{error}</p>}

          <button type="submit" disabled={loading || success}>
            {loading ? "Registrazione..." : "Registrati"}
          </button>
        </form>

        {success && (
          <p className="auth-feedback auth-success" role="status">Account creato. Ora puoi accedere.</p>
        )}

        <p className="auth-switch">
          Hai già un account?{" "}
          <Link to="/login">Accedi</Link>
        </p>
      </section>
    </main>
  );
}
