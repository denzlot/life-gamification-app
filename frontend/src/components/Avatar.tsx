import { useEffect, useMemo, useState } from "react";
import type { KeyboardEvent } from "react";
import type { GameStats } from "../api/types";
import { getDailyQuote, readSelectedCharacter, resolveAvatar, type CharacterId } from "../utils/character";
import { avatarMood } from "../utils/hp";

export function Avatar({
  stats,
  compact = false,
  variantIndex = 1,
  characterId: characterIdOverride
}: {
  stats?: GameStats | null;
  compact?: boolean;
  variantIndex?: number;
  characterId?: CharacterId | null;
}) {
  const [hitTick, setHitTick] = useState(0);
  const mood = avatarMood(stats);
  const characterId = characterIdOverride ?? readSelectedCharacter();
  const resolved = resolveAvatar(characterId, stats);
  const quote = useMemo(() => getDailyQuote(characterId), [characterId]);

  function playHit() {
    setHitTick((value) => value + 1);
  }

  useEffect(() => {
    if (!hitTick) return undefined;
    const timeoutId = window.setTimeout(() => setHitTick(0), 260);
    return () => window.clearTimeout(timeoutId);
  }, [hitTick]);

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      playHit();
    }
  }

  return (
    <figure
      className={`avatar-frame avatar-mood-${mood} avatar-${resolved.hpState.toLowerCase()} ${compact ? "avatar-compact" : ""} ${hitTick ? "avatar-hit" : ""}`}
      role="button"
      tabIndex={0}
      onClick={playHit}
      onKeyDown={handleKeyDown}
      aria-label={`Персонаж ${resolved.character.name}`}
    >
      <div className="avatar-picture-wrap" aria-label={`Аватар персонажа ${variantIndex}`}>
        <img src={resolved.src} alt={resolved.character.name} className="avatar-img" draggable={false} />
      </div>
      <figcaption className="avatar-quote-bubble">
        <span>«{quote}»</span>
      </figcaption>
    </figure>
  );
}
