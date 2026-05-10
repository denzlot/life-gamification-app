import { Button } from "../Button";
import { Field, TextArea } from "../FormFields";

interface DayNoteEditorProps {
  noteDraft: string;
  setNoteDraft: (value: string) => void;
  noteSaving: boolean;
  onSave: () => void;
}

export function DayNoteEditor({ noteDraft, setNoteDraft, noteSaving, onSave }: DayNoteEditorProps) {
  return (
    <div className="day-note-editor drawer-panel">
      <Field label="Заметка о дне">
        <TextArea
          value={noteDraft}
          onChange={(event) => setNoteDraft(event.target.value)}
          rows={4}
          maxLength={5000}
          placeholder="Что получилось, что не понравилось, что стоит запомнить"
        />
      </Field>
      <div className="form-actions">
        <Button type="button" disabled={noteSaving} onClick={onSave}>{noteSaving ? "Сохраняем" : "Сохранить"}</Button>
      </div>
    </div>
  );
}
