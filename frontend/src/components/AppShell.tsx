import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Button } from "./Button";
import { useAuth } from "../context/AuthContext";

const leftNav = [
  { to: "/dashboard", label: "Обзор" },
  { to: "/habits", label: "Привычки" },
  { to: "/quests", label: "Квесты" }
];

const rightNav = [
  { to: "/tasks", label: "Задачи" },
  { to: "/calendar", label: "Календарь" },
  { to: "/profile", label: "Профиль" }
];

const extraNav = [
  { to: "/stats", label: "Статистика" },
  { to: "/history", label: "История" }
];

export function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    }
    window.addEventListener("click", onClick);
    return () => window.removeEventListener("click", onClick);
  }, []);

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="app-shell">
      <header className="top-bar">
        <NavLink to="/today" className="brand" aria-label="Flowvisior">
          <span className="brand-mark">FV</span>
          <span>
            <strong>Flowvisior</strong>
            <small>тихая RPG</small>
          </span>
        </NavLink>

        <nav className="top-nav balanced-nav" aria-label="Основное меню">
          <div className="nav-side nav-side-left">
            {leftNav.map((item) => <NavLink key={item.to} to={item.to}>{item.label}</NavLink>)}
          </div>
          <NavLink to="/today" className="today-nav-link">Today</NavLink>
          <div className="nav-side nav-side-right">
            {rightNav.map((item) => <NavLink key={item.to} to={item.to}>{item.label}</NavLink>)}
          </div>
        </nav>

        <div className="top-menu" ref={menuRef}>
          <Button variant="ghost" onClick={(event) => { event.stopPropagation(); setOpen((value) => !value); }} aria-expanded={open}>
            Ещё
          </Button>
          {open ? (
            <div className="drawer-menu">
              <div className="drawer-user">
                <span>пользователь</span>
                <strong>{user?.username}</strong>
              </div>
              {extraNav.map((item) => <NavLink key={item.to} to={item.to} onClick={() => setOpen(false)}>{item.label}</NavLink>)}
              {user?.role === "ADMIN" ? <NavLink to="/admin" onClick={() => setOpen(false)}>Админка</NavLink> : null}
              <button type="button" onClick={handleLogout}>Выйти</button>
            </div>
          ) : null}
        </div>
      </header>

      <main className="main-view">
        <Outlet />
      </main>
    </div>
  );
}
