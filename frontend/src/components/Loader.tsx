export function Loader({ label = "Загрузка" }: { label?: string }) {
  return (
    <div className="loader" role="status">
      <span className="loader-dot" />
      <span>{label}</span>
    </div>
  );
}

export function ErrorLine({ error }: { error?: string | null }) {
  if (!error) return null;
  return <div className="error-line">{error}</div>;
}
