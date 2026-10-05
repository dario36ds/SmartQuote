import { Navigate } from "react-router";

import { SessionSkeleton } from "./LoadingSkeletons";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children }) {
  const {
    loading,
    isAuthenticated,
  } = useAuth();

  if (loading) {
    return <SessionSkeleton />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}