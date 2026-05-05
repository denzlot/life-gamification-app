import { FormEvent, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import appIcon from "../assets/app-icon.svg";
import { Button } from "../components/Button";
import { Field, TextInput } from "../components/FormFields";
import { ThemeSwitchButton } from "../components/ThemeSwitchButton";
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
  const [pendingWelcome, setPendingWelcome] = useState(false);
  const [welcomeName, setWelcomeName] = useState("");

  const target = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? "/today";
  const isLogin = mode === "login";

  if (user && (!pendingWelcome || isLogin)) return <Navigate to={target} replace />;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const cleanName = username.trim();
      if (isLogin) {
        await login(cleanName, password);
        navigate(target, { replace: true });
      } else {
        setPendingWelcome(true);
        setWelcomeName(cleanName || "User");
        await register(cleanName, password);
      }
    } catch (err) {
      setPendingWelcome(false);
      setError(err instanceof Error ? err.message : "Запрос не выполнен");
    } finally {
      setBusy(false);
    }
  }


  if (user && pendingWelcome && !isLogin) {
    return (
      <main className="auth-screen refined-auth-screen welcome-screen">
        <ThemeSwitchButton />
        <section className="auth-panel refined-auth-panel welcome-panel">
          <div className="auth-intro welcome-intro">
            <div className="brand auth-brand refined-auth-brand">
              <span className="brand-mark"><img src={appIcon} alt="" /></span>
              <span>
                <strong>Flowvisior</strong>
                <small>первый уровень открыт</small>
              </span>
            </div>
            <p className="eyebrow">регистрация завершена</p>
            <h1>Теперь вы User а не Looser!</h1>
            <p className="muted auth-copy">Добро пожаловать, {welcomeName || user.username}. Ниже — короткая карта приложения, чтобы быстро начать.</p>
          </div>
          <div className="welcome-guide">
            <div><strong>Today</strong><span>Главный лист дня: открываешь день, добавляешь задачи, отмечаешь выполнение и закрываешь день.</span></div>
            <div><strong>Привычки</strong><span>Повторяемые действия по дням недели. Они автоматически попадают в дневной план.</span></div>
            <div><strong>Квесты</strong><span>Большие цели из шагов. Можно идти по плану, догонять темп или распределять шаги вручную.</span></div>
            <div><strong>Календарь</strong><span>Показывает историю дней и темп выбранного квеста: где отстаёшь, а где опережаешь.</span></div>
            <div><strong>HP / XP</strong><span>XP растёт за выполненные дела, HP реагирует на провалы. Персонаж подсказывает состояние.</span></div>
          </div>
          <div className="welcome-actions">
            <Button onClick={() => navigate(target, { replace: true })}>Начать день</Button>
            <Link className="text-link" to="/quests">Создать первый квест</Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="auth-screen refined-auth-screen">
      <ThemeSwitchButton />
      <section className="auth-panel refined-auth-panel">
        <div className="auth-intro">
          <div className="brand auth-brand refined-auth-brand">
            <span className="brand-mark"><img src={appIcon} alt="" /></span>
            <span>
              <strong>Flowvisior</strong>
              <small>life gamification</small>
            </span>
          </div>
          <p className="eyebrow">{isLogin ? "возвращение" : "новый игрок"}</p>
          <h1>{isLogin ? "Войти в игру" : "Создать профиль"}</h1>
          <p className="muted auth-copy">
            Собирай день в линию: задачи, привычки, квесты, опыт и здоровье персонажа.
          </p>
          <div className="auth-feature-lines" aria-hidden="true">
            <span>Today</span>
            <span>Quests</span>
            <span>HP / XP</span>
          </div>
        </div>

        <form className="auth-form" onSubmit={submit}>
          <Field label="Имя пользователя">
            <TextInput
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              minLength={3}
              autoFocus
              required
              autoComplete="username"
              placeholder="player_name"
            />
          </Field>
          <Field label="Пароль">
            <TextInput
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              minLength={6}
              required
              autoComplete={isLogin ? "current-password" : "new-password"}
              placeholder="минимум 6 символов"
            />
          </Field>
          <ErrorLine error={error} />
          <Button disabled={busy}>{busy ? "Сохраняем" : isLogin ? "Войти" : "Зарегистрироваться"}</Button>

          <p className="muted switch-auth">
            {isLogin ? "Нет аккаунта?" : "Уже есть аккаунт?"} {" "}
            <Link to={isLogin ? "/register" : "/login"}>{isLogin ? "Создать профиль" : "Войти"}</Link>
          </p>
        </form>
      </section>
    </main>
  );
}
