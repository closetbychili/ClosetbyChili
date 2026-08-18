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
  align = "left",
  light = false,
}: SectionHeadingProps) {
  const textAlign = align === "center" ? "text-center" : "text-left";
  const eyebrowColor = light ? "text-gold" : "text-chili";
  const titleColor = light ? "text-cream" : "text-ink";
  const subtitleColor = light ? "text-cream/60" : "text-ink/55";

  return (
    <div className={textAlign}>
      {eyebrow && (
        <p
          className={`text-[10px] font-semibold uppercase tracking-[0.35em] ${eyebrowColor} font-body`}
        >
          {eyebrow}
        </p>
      )}
      <h2
        className={`mt-3 font-display text-3xl sm:text-4xl lg:text-5xl ${titleColor}`}
      >
        {title}
      </h2>
      {subtitle && (
        <p
          className={`mx-auto mt-5 max-w-2xl text-sm leading-7 sm:text-base ${subtitleColor}`}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}
