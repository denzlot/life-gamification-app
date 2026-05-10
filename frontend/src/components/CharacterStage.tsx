import type { CharacterAnimation } from "../utils/character";

interface CharacterStageProps {
  src?: string | null;
  alt: string;
  animation: CharacterAnimation;
  active?: boolean;
  activationKey?: number;
  variant?: "avatar" | "card";
  className?: string;
  imageClassName?: string;
  ariaLabel?: string;
}

export function CharacterStage({
  src,
  alt,
  animation,
  active = false,
  activationKey = 0,
  variant = "avatar",
  className = "",
  imageClassName = "",
  ariaLabel
}: CharacterStageProps) {
  return (
    <div
      className={`character-stage character-stage-${variant} character-animation-${animation} ${active ? "character-stage-active" : ""} ${className}`.trim()}
      aria-label={ariaLabel}
    >
      <span key={`back-${activationKey}`} className="character-stage-effect character-stage-effect-back" aria-hidden="true" />
      {src ? (
        <img
          key={`image-${activationKey}`}
          src={src}
          alt={alt}
          className={`character-stage-image ${imageClassName}`.trim()}
          draggable={false}
        />
      ) : null}
      <span key={`front-${activationKey}`} className="character-stage-effect character-stage-effect-front" aria-hidden="true" />
    </div>
  );
}
