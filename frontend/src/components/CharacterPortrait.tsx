interface CharacterPortraitProps {
  src?: string | null;
  alt: string;
  className?: string;
}

export function CharacterPortrait({ src, alt, className }: CharacterPortraitProps) {
  if (src) {
    return <img src={src} alt={alt} className={className} />;
  }

  return (
    <div className="character-image-placeholder" role="img" aria-label={`${alt}: место для будущего аватара`}>
      <span className="character-image-placeholder-orbit" aria-hidden="true" />
      <span className="character-image-placeholder-mark" aria-hidden="true">+</span>
      <span className="character-image-placeholder-text">место для аватара</span>
    </div>
  );
}
