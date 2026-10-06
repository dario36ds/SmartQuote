import {
  useEffect,
  useState,
} from "react";

import { apiRequest } from "../api";
import { AuthContext } from "./AuthContext";

export function AuthProvider({ children }) {
  const [token, setToken] = useState(
    () => localStorage.getItem("token")
  );

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadUser() {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const data = await apiRequest("/auth/me/", {
          token,
        });

        if (!cancelled) setUser(data);
      } catch {
        if (cancelled) return;
        localStorage.removeItem("token");
        setToken(null);
        setUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadUser();
    return () => { cancelled = true; };
  }, [token]);

  async function changeEmail(email, currentPassword) {
    const data = await apiRequest("/auth/me/", {
      method: "PATCH",
      token,
      body: { email, current_password: currentPassword },
    });
    setUser(data);
    return data;
  }

  async function changePassword(currentPassword, newPassword, confirmPassword) {
    const data = await apiRequest("/auth/change-password/", {
      method: "POST",
      token,
      body: {
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      },
    });
    localStorage.setItem("token", data.token);
    setToken(data.token);
    setUser(data.user);
    return data;
  }

  async function login(username, password) {
    const data = await apiRequest("/auth/login/", {
      method: "POST",
      body: {
        username,
        password,
      },
    });

    localStorage.setItem("token", data.token);
    setToken(data.token);
    setUser(data.user);

    return data;
  }

  async function logout() {
    try {
      if (token) {
        await apiRequest("/auth/logout/", {
          method: "POST",
          token,
        });
      }
    } finally {
      localStorage.removeItem("token");
      setToken(null);
      setUser(null);
    }
  }

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        loading,
        login,
        logout,
        changeEmail,
        changePassword,
        isAuthenticated: Boolean(token),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
