export function EmptyState({ title, text }: { title: string; text?: string }) {
  return (
    <div className="empty-state">
      <div className="empty-title">{title}</div>
      {text ? <div className="muted">{text}</div> : null}
    </div>
  );
}
