import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Button } from "./Button";
import { ThemeSwitchButton } from "./ThemeSwitchButton";
import { useAuth } from "../context/AuthContext";

const leftNav = [
  { to: "/habits", label: "Привычки" },
  { to: "/quests", label: "Квесты" }
];

const rightNav = [
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
      <header className="top-bar centered-top-bar">
        <NavLink to="/today" className="brand" aria-label="Flowvisior">
          <span className="brand-mark brand-mark-svg" aria-hidden="true">
            <svg className="brand-logo" viewBox="0 0 48 48" role="img" focusable="false">
              <path className="brand-logo-ground" d="M8 35.8c5.1-4.9 11.2-7.3 18.4-7.3 5.4 0 9.9 1.3 13.6 3.9-3.3 5.1-8.9 8.1-16.4 8.1-6.7 0-12-1.6-15.6-4.7Z" />
              <path className="brand-logo-trail" d="M14.3 33.5c7.7-7.8 15.1-13.2 22.4-16.5" />
              <path className="brand-logo-spark" d="M35.9 6.7 38.4 13l6.4 2.3-6.4 2.4-2.5 6.2-2.4-6.2-6.3-2.4 6.3-2.3 2.4-6.3Z" />
              <path className="brand-logo-seed" d="M23.7 30.8c.9-5.6 3.2-9.4 6.8-11.6" />
              <circle className="brand-logo-dot" cx="13.2" cy="36" r="1.8" />
            </svg>
          </span>
          <span>
            <strong>Flowvisior</strong>
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
      <ThemeSwitchButton />
    </div>
  );
}
