import { Navigate } from "react-router";

import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children }) {
  const {
    loading,
    isAuthenticated,
  } = useAuth();

  if (loading) {
    return <p>Caricamento...</p>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}