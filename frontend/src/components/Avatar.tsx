import avatar from "../assets/avatar.png";
import type { GameStats } from "../api/types";
import { avatarMood, normalizeHpState } from "../utils/hp";

export function Avatar({ stats, compact = false, variantIndex = 1 }: { stats?: GameStats | null; compact?: boolean; variantIndex?: number }) {
  const state = normalizeHpState(stats);
  const mood = avatarMood(stats);
  return (
    <figure className={`avatar-frame avatar-mood-${mood} avatar-${state.toLowerCase()} ${compact ? "avatar-compact" : ""}`}>
      <div className="avatar-picture-wrap" aria-label={`Аватар персонажа ${variantIndex}`}>
        <img src={avatar} alt="Аватар персонажа" className="avatar-img" />
      </div>
      <figcaption className="avatar-quote-bubble">
        <span>«Маленький шаг сегодня — большой уровень завтра.»</span>
      </figcaption>
    </figure>
  );
}
