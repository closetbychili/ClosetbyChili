interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  align?: "left" | "center";
  light?: boolean;
}

export default function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = "center",
  light = false,
}: SectionHeadingProps) {
  const textAlign = align === "center" ? "text-center items-center" : "text-left items-start";
  const eyebrowColor = light ? "text-gold" : "text-chili";
  const titleColor = light ? "text-[#fff8f7]" : "text-ink";
  const subtitleColor = light ? "text-white/70" : "text-ink/60";

  return (
    <div className={`flex flex-col ${textAlign} max-w-3xl ${align === "center" ? "mx-auto" : ""}`}>
      {eyebrow && (
        <div className="flex items-center gap-3 mb-3">
          {align === "center" && <span className="h-px w-6 bg-gold/50" />}
          <p
            className={`text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.35em] ${eyebrowColor}`}
          >
            {eyebrow}
          </p>
          {align === "center" && <span className="h-px w-6 bg-gold/50" />}
        </div>
      )}
      <h2
        className={`font-display text-2xl sm:text-4xl lg:text-5xl font-normal leading-[1.15] tracking-tight ${titleColor}`}
      >
        {title}
      </h2>
      {subtitle && (
        <p
          className={`mt-4 text-xs sm:text-sm lg:text-base leading-relaxed max-w-xl ${subtitleColor}`}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}
