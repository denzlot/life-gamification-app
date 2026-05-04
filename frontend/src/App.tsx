import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { AdminGuard, AuthGuard } from "./components/AuthGuard";
import { AchievementProvider } from "./context/AchievementContext";
import { GameProvider } from "./context/GameContext";
import { AdminPage } from "./pages/AdminPage";
import { AuthPage } from "./pages/AuthPage";
import { CalendarPage } from "./pages/CalendarPage";
import { DashboardPage } from "./pages/DashboardPage";
import { DayDetailsPage } from "./pages/DayDetailsPage";
import { HabitsPage } from "./pages/HabitsPage";
import { HistoryPage } from "./pages/HistoryPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { ProfilePage } from "./pages/ProfilePage";
import { QuestsPage } from "./pages/QuestsPage";
import { StatsPage } from "./pages/StatsPage";
import { TasksPage } from "./pages/TasksPage";
import { TodayPage } from "./pages/TodayPage";

function ProtectedShell() {
  return (
    <GameProvider>
      <AchievementProvider>
        <AppShell />
      </AchievementProvider>
    </GameProvider>
  );
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<AuthPage mode="login" />} />
      <Route path="/register" element={<AuthPage mode="register" />} />
      <Route element={<AuthGuard />}>
        <Route element={<ProtectedShell />}>
          <Route path="/" element={<Navigate to="/today" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/today" element={<TodayPage />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/habits" element={<HabitsPage />} />
          <Route path="/quests" element={<QuestsPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/calendar/:date" element={<DayDetailsPage />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/admin" element={<AdminGuard><AdminPage /></AdminGuard>} />
        </Route>
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
