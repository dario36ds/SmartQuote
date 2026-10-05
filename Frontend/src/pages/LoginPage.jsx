import { useState } from "react";

import {
  Link,
  Navigate,
  useNavigate,
} from "react-router";

import { useAuth } from "../context/AuthContext";
import Icon from "../components/Icon";
import PasswordInput from "../components/PasswordInput";
import "./AuthPage.css";

export default function LoginPage() {
  const navigate = useNavigate();

  const {
    login,
    isAuthenticated,
  } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      await login(username, password);
      navigate("/");
    } catch (err) {
      setError(
        err.data?.non_field_errors?.[0] ||
          err.message
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="login-heading">
        <h1 className="auth-brand">
          <span className="auth-brand-mark"><Icon name="quote" size={28} /></span>
          SmartQuote
        </h1>
        <h2 id="login-heading">Accedi</h2>

        <form onSubmit={handleSubmit}>
          <div>
            <label htmlFor="username">
              Username
            </label>

            <input
              id="username"
              name="username"
              autoComplete="username"
              value={username}
              onChange={(event) =>
                setUsername(event.target.value)
              }
              required
            />
          </div>

          <div>
            <label htmlFor="password">
              Password
            </label>

            <PasswordInput
              id="password"
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              required
            />
          </div>

          {error && <p className="auth-feedback auth-error" role="alert">{error}</p>}

          <button
            type="submit"
            disabled={loading}
          >
            {loading ? "Accesso..." : "Accedi"}
          </button>
        </form>

        <p className="auth-switch">
          Non hai un account?{" "}
          <Link to="/register">
            Registrati
          </Link>
        </p>
      </section>
    </main>
  );
}
