import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { AdminGuard, AuthGuard } from "./components/AuthGuard";
import { AchievementProvider } from "./context/AchievementContext";
import { GameProvider } from "./context/GameContext";
import { AdminPage } from "./pages/AdminPage";
import { AchievementsPage } from "./pages/AchievementsPage";
import { AuthPage } from "./pages/AuthPage";
import { CalendarPage } from "./pages/CalendarPage";
import { DayDetailsPage } from "./pages/DayDetailsPage";
import { HabitsPage } from "./pages/HabitsPage";
import { HistoryPage } from "./pages/HistoryPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { ProfilePage } from "./pages/ProfilePage";
import { QuestsPage } from "./pages/QuestsPage";
import { StatsPage } from "./pages/StatsPage";
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
          <Route path="/today" element={<TodayPage />} />
          <Route path="/habits" element={<HabitsPage />} />
          <Route path="/quests" element={<QuestsPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/calendar/:date" element={<DayDetailsPage />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/achievements" element={<AchievementsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/admin" element={<AdminGuard><AdminPage /></AdminGuard>} />
        </Route>
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
