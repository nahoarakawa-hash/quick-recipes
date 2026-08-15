function Sparkle({ className }: { className?: string }) {
  return (
    <svg
      className={`sparkle ${className ?? ""}`}
      viewBox="0 0 12 12"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M6 0c.28 1.85.92 3.08 2.05 4.05C9.22 5.05 10.5 5.7 12 6c-1.5.3-2.78.95-3.95 1.95C6.92 8.92 6.28 10.15 6 12c-.28-1.85-.92-3.08-2.05-4.05C2.78 6.95 1.5 6.3 0 6c1.5-.3 2.78-.95 3.95-1.95C5.08 3.08 5.72 1.85 6 0Z" />
    </svg>
  );
}

function Berry({ className }: { className?: string }) {
  return <span className={`berry ${className ?? ""}`} />;
}

export function GoldStars() {
  return (
    <div className="today-stars" aria-hidden="true">
      <Sparkle className="sparkle-sm" />
      <Berry className="berry-sm" />
      <Sparkle className="sparkle-lg" />
      <Berry className="berry-md" />
      <Sparkle className="sparkle-md" />
    </div>
  );
}
