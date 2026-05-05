import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <section className="page narrow-page">
      <p className="eyebrow">404</p>
      <h1>Страница не найдена</h1>
      <p className="muted">Такого маршрута в приложении нет.</p>
      <Link className="text-link" to="/today">Вернуться в Today</Link>
    </section>
  );
}
