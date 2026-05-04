import type { ReactNode } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Loader } from "./Loader";

export function AuthGuard() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <Loader label="Восстанавливаем сессию" />;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  return <Outlet />;
}

export function AdminGuard({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (user?.role !== "ADMIN") {
    return (
      <section className="page narrow-page">
        <p className="eyebrow">админка</p>
        <h1>Доступ закрыт</h1>
        <p className="muted">Этот экран доступен только пользователю с ролью ROLE_ADMIN.</p>
      </section>
    );
  }
  return <>{children}</>;
}
