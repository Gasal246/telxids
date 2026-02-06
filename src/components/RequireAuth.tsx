import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getAuthToken } from "@/lib/auth";

interface RequireAuthProps {
  children: ReactNode;
}

const RequireAuth = ({ children }: RequireAuthProps) => {
  const location = useLocation();
  const token = getAuthToken();

  if (!token) {
    return <Navigate to="/sign-in" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
};

export default RequireAuth;
