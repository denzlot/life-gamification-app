import { FormEvent, useState, type CSSProperties } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import logoMark from "../assets/logo-mark.svg";
import { Button } from "../components/Button";
import { CharacterChooser } from "../components/CharacterChooser";
import { Field, TextInput } from "../components/FormFields";
import { ThemeSwitchButton } from "../components/ThemeSwitchButton";
import { ErrorLine } from "../components/Loader";
import { useAuth } from "../context/AuthContext";

type Mode = "login" | "register";

type RegisterStep = "welcome" | "character";

function AuthMissionPreview({ isLogin }: { isLogin: boolean }) {
  return (
    <aside className="auth-mission-preview" aria-hidden="true">
      <div className="auth-preview-top">
        <span className="auth-preview-kicker">{isLogin ? "save loaded" : "new run"}</span>
        <span className="auth-preview-status">{isLogin ? "session ready" : "slot empty"}</span>
      </div>
      <div className="auth-preview-core">
        <div className="auth-progress-dial">
          <strong>{isLogin ? "72" : "01"}</strong>
          <span>{isLogin ? "focus" : "level"}</span>
        </div>
        <div className="auth-route-stack">
          <span className="is-done">Today open</span>
          <span>Quest chain</span>
          <span>HP shield</span>
        </div>
      </div>
      <div className="auth-preview-rows">
        <span style={{ "--row-width": "82%" } as CSSProperties} />
        <span style={{ "--row-width": "58%" } as CSSProperties} />
        <span style={{ "--row-width": "71%" } as CSSProperties} />
      </div>
    </aside>
  );
}

function AppPreviewGhost() {
  return (
    <div className="app-preview-ghost" aria-hidden="true">
      <div className="ghost-shell">
        <div className="ghost-topbar">
          <div className="ghost-brand">
            <span className="ghost-brand-mark" />
            <strong>Flowvisior</strong>
          </div>
          <div className="ghost-nav-row">
            <span>Привычки</span>
            <span>Квесты</span>
            <b>Today</b>
            <span>Календарь</span>
            <span>Профиль</span>
          </div>
          <div className="ghost-menu-pill">Ещё</div>
        </div>
        <div className="ghost-main-layout">
          <section className="ghost-page-card ghost-plan-card">
            <div className="ghost-card-head">
              <small>today</small>
              <strong>Лист дня</strong>
              <span />
            </div>
            <div className="ghost-toolbar-row">
              <i />
              <i />
            </div>
            <div className="ghost-task-list">
              <div className="ghost-task-item"><em /><div><b /><span /></div><small /></div>
              <div className="ghost-task-item"><em /><div><b /><span /></div><small /></div>
              <div className="ghost-task-item"><em /><div><b /><span /></div><small /></div>
              <div className="ghost-action-row"><i /><i /></div>
            </div>
          </section>
          <aside className="ghost-page-card ghost-side-card">
            <div className="ghost-side-top">
              <div className="ghost-avatar-orb" />
              <div className="ghost-side-lines">
                <b />
                <span />
                <span />
                <span />
              </div>
            </div>
            <div className="ghost-side-stats">
              <i /><i /><i /><i />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

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
  const [registerStep, setRegisterStep] = useState<RegisterStep>("welcome");

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
        await register(cleanName, password);
        setPendingWelcome(true);
        setRegisterStep("welcome");
        setWelcomeName(cleanName || "User");
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
      <main className={`auth-screen refined-auth-screen welcome-screen ${registerStep === "character" ? "character-preview-screen" : ""}`}>
        {registerStep === "character" ? <AppPreviewGhost /> : null}
        <ThemeSwitchButton />
        <section className={`auth-panel refined-auth-panel welcome-panel ${registerStep === "character" ? "character-welcome-panel" : ""}`}>
          {registerStep === "welcome" ? (
            <>
              <div className="auth-intro welcome-intro">
                <div className="brand auth-brand refined-auth-brand">
                  <span className="brand-mark brand-mark-image"><img src={logoMark} alt="" className="brand-logo-image" /></span>
                  <span>
                    <strong>Flowvisior</strong>
                    <small>первый уровень открыт</small>
                  </span>
                </div>
                <p className="eyebrow">регистрация завершена</p>
                <h1>Теперь вы User, а не Looser!</h1>
                <p className="muted auth-copy">Добро пожаловать, {welcomeName || user.username}. Ниже — короткая карта приложения, чтобы быстро стартовать.</p>
              </div>
              <div className="welcome-guide">
                <div><strong>Today</strong><span>Главный лист дня: открываешь день, добавляешь задачи, отмечаешь выполнение и закрываешь день.</span></div>
                <div><strong>Привычки</strong><span>Повторяемые действия по дням недели. Они автоматически попадают в дневной план.</span></div>
                <div><strong>Квесты</strong><span>Большие цели из шагов. Можно идти по плану, догонять темп или распределять шаги вручную.</span></div>
                <div><strong>Календарь</strong><span>Показывает будущую загрузку, уже закрытые дни и общее ожидание по выбранной дате.</span></div>
                <div><strong>HP / XP</strong><span>Прогресс растёт через streak и достижения. Персонаж подсказывает текущее состояние.</span></div>
              </div>
              <div className="welcome-actions">
                <Button onClick={() => setRegisterStep("character")}>Выбрать персонажа</Button>
              </div>
            </>
          ) : (
            <CharacterChooser
              title="Финальный шаг — выбери персонажа"
              description="Выбери спутника на каждый день. Он будет задавать настроение, говорить короткие фразы и менять тему приложения сразу при выборе."
              onConfirm={() => navigate(target, { replace: true })}
              embedded
            />
          )}
        </section>
      </main>
    );
  }

  return (
    <main className="auth-screen refined-auth-screen">
      <ThemeSwitchButton />
      <section className="auth-panel refined-auth-panel">
        <div className="auth-story">
          <div className="auth-intro">
            <div className="brand auth-brand refined-auth-brand">
              <span className="brand-mark brand-mark-image"><img src={logoMark} alt="" className="brand-logo-image" /></span>
              <span>
                <strong>Flowvisior</strong>
                <small>{isLogin ? "командный центр" : "создание героя"}</small>
              </span>
            </div>
            <p className="eyebrow">{isLogin ? "возвращение" : "новый игрок"}</p>
            <h1>{isLogin ? "Продолжить день" : "Начать маршрут"}</h1>
            <p className="muted auth-copy">
              {isLogin
                ? "Вернись к задачам, квестам и фокусу без лишнего шума."
                : "Собери профиль, выбери ритм и открой первый игровой день."}
            </p>
            <div className="auth-feature-lines" aria-hidden="true">
              <span>Today</span>
              <span>Quests</span>
              <span>HP / XP</span>
            </div>
          </div>
          <AuthMissionPreview isLogin={isLogin} />
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
              minLength={8}
              required
              autoComplete={isLogin ? "current-password" : "new-password"}
              placeholder="минимум 8 символов"
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
