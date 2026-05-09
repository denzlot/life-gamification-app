import { useState } from "react";
import { Button } from "./Button";
import { characterCatalog, getCharacter, previewTheme, type CharacterId, saveSelectedCharacter } from "../utils/character";

interface CharacterChooserProps {
  onConfirm?: (id: CharacterId) => void;
  onPreview?: (id: CharacterId) => void;
  title?: string;
  description?: string;
  initialCharacter?: CharacterId | null;
  embedded?: boolean;
}

export function CharacterChooser({
  onConfirm,
  onPreview,
  title = "Выбери персонажа",
  description = "Нажми на героя, чтобы сразу увидеть его тему. Подтверждение завершит выбор.",
  initialCharacter = null,
  embedded = false
}: CharacterChooserProps) {
  const [selectedId, setSelectedId] = useState<CharacterId>(initialCharacter ?? characterCatalog[0].id);

  function chooseCharacter(id: CharacterId) {
    setSelectedId(id);
    onPreview?.(id);
    previewTheme(getCharacter(id).theme);
  }

  function confirmSelection() {
    saveSelectedCharacter(selectedId);
    onConfirm?.(selectedId);
  }

  return (
    <section className={`character-chooser ${embedded ? "embedded" : "modal"}`}>
      <div className="character-chooser-head">
        <div>
          <p className="eyebrow">персонаж</p>
          <h2>{title}</h2>
          <p className="muted">{description}</p>
        </div>
      </div>

      <div className="character-card-grid character-grid">
        {characterCatalog.map((character) => (
          <button
            type="button"
            key={character.id}
            className={`character-card character-theme-${character.theme} ${selectedId === character.id ? "active" : ""}`}
            onClick={() => chooseCharacter(character.id)}
          >
            <div className="character-card-preview">
              {character.preview ? <img src={character.preview} alt={character.name} /> : null}
            </div>
            <div className="character-card-body">
              <strong>{character.name}</strong>
              <span>{character.title}</span>
              <small>{character.description}</small>
            </div>
          </button>
        ))}
      </div>

      <div className="character-chooser-actions">
        <Button onClick={confirmSelection}>Подтвердить персонажа</Button>
      </div>
    </section>
  );
}
