import { Navigate } from "react-router";
import { useAuth } from "./context/authContext";

export function ProtectedRoute({ children }: any) {
  const { token } = useAuth();

  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
}
