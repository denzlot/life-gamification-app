// Central style entry. Load legacy before migrated page files so extracted styles are not shadowed by the old cascade.
import "./fonts.css";
import "./base.css";
import "./layout.css";
import "./navigation.css";
import "./buttons.css";
import "./forms.css";

// Legacy loads before migrated component/page files so extracted selectors become the new source of truth.
import "./legacy.css";
import "@ncdai/react-wheel-picker/style.css";
import "./wheels.css";
import "./modals.css";
import "./creation-panels.css";
import "./quest-picker.css";
import "./date-navigation.css";
import "./motion.css";
import "./headers.css";
import "./overlays.css";
import "./control-states.css";
import "./brand.css";
import "./avatar.css";
import "./toasts.css";
import "./theme.css";
import "./components.css";

// Page styles are migrated one page at a time and intentionally override legacy when selectors match.
import "./pages/auth.css";
import "./pages/profile.css";
import "./pages/admin.css";
import "./pages/stats.css";
import "./pages/history.css";
import "./pages/achievements.css";
import "./pages/habits.css";
import "./pages/today.css";
import "./pages/day-details.css";
import "./pages/quests.css";
import "./pages/calendar.css";
