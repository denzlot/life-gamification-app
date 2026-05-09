import type { GameStats } from "../../api/types";
import { Avatar } from "../Avatar";
import { GameHud } from "../GameHud";

export function TodaySidebar({ stats }: { stats?: GameStats }) {
  return (
    <aside className="today-side">
      <section className="section-line character-panel clean-section">
        <Avatar stats={stats} compact variantIndex={1} />
        <GameHud stats={stats} />
      </section>
    </aside>
  );
}
