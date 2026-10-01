import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import { apiRequest } from "../api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(
    () => localStorage.getItem("token")
  );

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const data = await apiRequest("/auth/me/", {
          token,
        });

        setUser(data);
      } catch {
        localStorage.removeItem("token");
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    loadUser();
  }, [token]);

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
        isAuthenticated: Boolean(token),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}