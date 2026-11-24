export function Rosette({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
    >
      {Array.from({ length: 8 }, (_, i) => (
        <ellipse
          key={i}
          cx="24"
          cy="15"
          rx="6.65"
          ry="12.6"
          transform={`rotate(${i * 45} 24 24)`}
          stroke="currentColor"
          strokeWidth="1.15"
        />
      ))}
      <circle cx="24" cy="24" r="2.5" fill="currentColor" />
    </svg>
  );
}
export function Arrow({
  dir = "up",
}: {
  dir?: "up" | "down" | "left" | "right";
}) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      width="19"
      height="19"
      style={{
        transform: `rotate(${{ up: 0, right: 45, down: 135, left: 225 }[dir]}deg)`,
      }}
    >
      <path
        d="M5.5 18.5 18 6M6 6h12v12"
        stroke="currentColor"
        strokeWidth="1.35"
      />
    </svg>
  );
}
export function Brand() {
  return (
    <span className="brand" dir="ltr">
      <Rosette />
      <span>SENSORA</span>
    </span>
  );
}
