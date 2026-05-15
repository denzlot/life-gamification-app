export function AchievementCategoryIcon({ category }: { category: string }) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const
  };

  const icon = (() => {
    if (category === "START") {
      return (
        <svg {...common}>
          <path d="M12 3c3.5 1.8 5.4 5.2 5.2 9.1L12 17.3l-5.2-5.2C6.6 8.2 8.5 4.8 12 3Z" />
          <path d="M9.2 14.8 7 19l4.2-2.2" />
          <path d="M14.8 14.8 17 19l-4.2-2.2" />
          <path d="M12 8.4h.01" />
        </svg>
      );
    }
    if (category === "TASKS") {
      return (
        <svg {...common}>
          <path d="m5 12 3 3 5.8-7" />
          <path d="M15 8h4" />
          <path d="M15 14h4" />
          <path d="M5 19h14" />
        </svg>
      );
    }
    if (category === "HABITS") {
      return (
        <svg {...common}>
          <path d="M7 13.5c0-4 2.8-7.2 7.7-8.5.9 5.2-1 9-5.3 10.4" />
          <path d="M7 13.5c-1.8 1.1-2.8 2.7-3 4.5" />
          <path d="M10 16c1 2.1 3 3.5 5.4 3.5 2 0 3.7-.9 4.6-2.3" />
        </svg>
      );
    }
    if (category === "QUESTS") {
      return (
        <svg {...common}>
          <path d="M6 20V5" />
          <path d="M6 5h10l-2 3 2 3H6" />
          <path d="M9 16h8" />
          <path d="M17 16l2 2-2 2" />
        </svg>
      );
    }
    if (category === "FOCUS") {
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="7" />
          <circle cx="12" cy="12" r="2.2" />
          <path d="M12 3v2" />
          <path d="M21 12h-2" />
          <path d="M12 21v-2" />
          <path d="M3 12h2" />
        </svg>
      );
    }
    if (category === "STREAK") {
      return (
        <svg {...common}>
          <path d="M12 21c3.5-1.5 5.6-4 5.6-7.1 0-2.6-1.3-4.7-3.7-6.2.1 2.1-.7 3.3-1.9 4.1-.2-2.8-1.5-5-4-6.8.3 3.4-1.6 5.3-2.1 8.3C5.3 16.8 7.8 20 12 21Z" />
        </svg>
      );
    }
    if (category === "DAYS") {
      return (
        <svg {...common}>
          <rect x="4" y="5" width="16" height="15" rx="2" />
          <path d="M8 3v4" />
          <path d="M16 3v4" />
          <path d="M4 10h16" />
          <path d="m9 15 2 2 4-4" />
        </svg>
      );
    }
    if (category === "LEVEL") {
      return (
        <svg {...common}>
          <path d="m12 4 7 4-7 4-7-4 7-4Z" />
          <path d="m5 12 7 4 7-4" />
          <path d="m5 16 7 4 7-4" />
        </svg>
      );
    }
    if (category === "SPECIAL") {
      return (
        <svg {...common}>
          <path d="M12 3.5 14.5 9l6 .6-4.5 4 1.3 5.9L12 16.4l-5.3 3.1L8 13.6l-4.5-4 6-.6L12 3.5Z" />
        </svg>
      );
    }
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="7" />
        <path d="M8 12h8" />
        <path d="M12 8v8" />
      </svg>
    );
  })();

  return <span className="achievement-category-icon" aria-hidden="true">{icon}</span>;
}
