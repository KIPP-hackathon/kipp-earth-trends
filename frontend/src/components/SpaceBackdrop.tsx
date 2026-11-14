// Decorative, deterministic star field. It is not a catalog of stellar positions.
const stars = Array.from({ length: 250 }, (_, index) => {
  const hash = (value: number) => {
    const sine = Math.sin(value * 127.1 + 311.7) * 43758.5453;
    return sine - Math.floor(sine);
  };
  return {
    x: hash(index + 1) * 1000,
    y: hash(index + 513) * 1000,
    radius: 0.5 + hash(index + 1021) * 1.4,
    opacity: 0.2 + hash(index + 1741) * 0.65,
  };
});
export function SpaceBackdrop() {
  return (
    <svg
      className="space-backdrop"
      viewBox="0 0 1000 1000"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      {stars.map((star, index) => (
        <circle
          key={index}
          cx={star.x}
          cy={star.y}
          r={star.radius}
          fill={index % 8 === 0 ? "#a7cfff" : "#ffffff"}
          opacity={star.opacity}
        />
      ))}
      <g stroke="#e7f2ff" strokeWidth=".6" opacity=".7">
        {[stars[6], stars[39], stars[124]].map((star, index) => (
          <path
            key={index}
            d={`M${star.x - 4},${star.y}h8M${star.x},${star.y - 4}v8`}
          />
        ))}
      </g>
    </svg>
  );
}
