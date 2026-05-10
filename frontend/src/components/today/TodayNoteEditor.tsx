import { Button } from "../Button";
import { Field, TextArea } from "../FormFields";

interface TodayNoteEditorProps {
  noteDraft: string;
  noteSaving: boolean;
  setNoteDraft: (value: string) => void;
  onSave: () => void;
}

export function TodayNoteEditor({ noteDraft, noteSaving, setNoteDraft, onSave }: TodayNoteEditorProps) {
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
