import "./kipp-mascot.css";

/** Decorative: the containing link or button supplies the accessible name. */
export function KippMascot({ animated = false }: { animated?: boolean }) {
  return (
    <picture className="kipp-mascot" aria-hidden="true">
      {animated && (
        <source
          media="(prefers-reduced-motion: no-preference)"
          srcSet="/assets/kipp/kipp-agent-v3.webp"
          type="image/webp"
        />
      )}
      <img
        src="/assets/kipp/kipp-logo-v3.webp"
        width={304}
        height={296}
        alt=""
        draggable={false}
      />
    </picture>
  );
}
