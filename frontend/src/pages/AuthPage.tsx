import { FormEvent, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Button } from "../components/Button";
import { Field, TextInput } from "../components/FormFields";
import { ErrorLine } from "../components/Loader";
import { useAuth } from "../context/AuthContext";

type Mode = "login" | "register";

export function AuthPage({ mode }: { mode: Mode }) {
  const { user, login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const target = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? "/today";

  if (user) return <Navigate to={target} replace />;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === "login") await login(username.trim(), password);
      else await register(username.trim(), password);
      navigate(target, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Запрос не выполнен");
    } finally {
      setBusy(false);
    }
  }

  const isLogin = mode === "login";

  return (
    <main className="auth-screen">
      <section className="auth-panel">
        <div className="brand auth-brand">
          <span className="brand-mark">FV</span>
          <span>
            <strong>Flowvisior</strong>
            <small>тихая RPG для задач</small>
          </span>
        </div>

        <p className="eyebrow">{isLogin ? "продолжить" : "новый игрок"}</p>
        <h1>{isLogin ? "Вход" : "Регистрация"}</h1>
        <p className="muted">Тёмный минималистичный интерфейс, Today, привычки, квесты и личный прогресс.</p>

        <form className="stack" onSubmit={submit}>
          <Field label="Имя пользователя">
            <TextInput value={username} onChange={(event) => setUsername(event.target.value)} minLength={3} autoFocus required />
          </Field>
          <Field label="Пароль">
            <TextInput value={password} onChange={(event) => setPassword(event.target.value)} type="password" minLength={6} required />
          </Field>
          <ErrorLine error={error} />
          <Button disabled={busy}>{busy ? "Подождите" : isLogin ? "Войти" : "Создать аккаунт"}</Button>
        </form>

        <p className="muted switch-auth">
          {isLogin ? "Нет аккаунта?" : "Уже есть аккаунт?"} {" "}
          <Link to={isLogin ? "/register" : "/login"}>{isLogin ? "Зарегистрироваться" : "Войти"}</Link>
        </p>
      </section>
    </main>
  );
}
