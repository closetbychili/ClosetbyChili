"use client";

export default function BrandEssence() {
  const pillars = [
    {
      icon: "dry_cleaning",
      title: "Signature Drapes",
      desc: "Fluid silk-satin silhouettes engineered for seamless movement and graceful lines.",
    },
    {
      icon: "precision_manufacturing",
      title: "Bespoke Tailoring",
      desc: "Precision cuts and shoulder architecture designed specifically for Indian silhouettes.",
    },
    {
      icon: "hotel_class",
      title: "Artisanal Gold Trims",
      desc: "Custom molded buttons, solid metallic fastenings, and antique zari hand-embellishment.",
    },
    {
      icon: "support_agent",
      title: "Complimentary Fit Concierge",
      desc: "Free length customizations and personalized WhatsApp styling assistance for all orders.",
    },
  ];

  return (
    <section className="w-full py-16 px-4 sm:px-6 lg:px-12 bg-page-bg border-y border-border-sand/40">
      <div className="max-w-360 mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {pillars.map((pillar, idx) => (
            <div
              key={idx}
              className="flex items-start gap-4 p-5 bg-surface shadow-xs border border-outline-variant/30 hover:shadow-md transition-shadow"
            >
              <div className="w-12 h-12 rounded-none bg-primary-fixed flex items-center justify-center shrink-0 text-primary">
                <span className="material-symbols-outlined text-[26px]">
                  {pillar.icon}
                </span>
              </div>
              <div>
                <h4 className="font-headline-sm text-[16px] text-on-surface font-semibold mb-1">
                  {pillar.title}
                </h4>
                <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                  {pillar.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
