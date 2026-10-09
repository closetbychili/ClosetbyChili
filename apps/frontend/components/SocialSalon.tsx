"use client";

export default function SocialSalon() {
  const tiles = [
    {
      handle: "@ananya_v",
      icon: "photo_camera",
      image:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuAMy7s5EFXCM0o5tCZuRdha45sj9s-MkJWMGkzo8tEXUJsTs5ZqkLw6_ichJoMTegzAeWC9Ydz0YwDgOXMjBAjaECTrIH457a72F9hOVBbBNp3sEGgt_7eAXbg3ZrSf9QRa7XAvft67f_Y7ePcowLB8SukCOKRGpVx1Y9wW0Cek4Aiq5JMtvr8CdQywWMrLy44DHatRO_jHsZ3wniT2M9hhQl3FXDIxM-8_cPV2rJZJ83JiFkgBOKiY7w",
      alt: "Fashion influencer styling Closet by Chilli red tuxedo blazer on modern urban street in Mumbai",
    },
    {
      handle: "Unboxing Luxe",
      icon: "shopping_bag",
      image:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuDLjYSkeEi-tPH12uGyrxqTxIoXxlCO4w5YI1zFIramvYLAHBdA0uBmHVaM6-ZUmiA_J-dVt4V1fOJRgfsY2JgQeW2eQKanJi7c0NLmCS63Dbdl7PgjYdfmC_fsOYJcBY_2roMas6s0bne33qQXmqhf0JGTpb_-c2gHGJnE9-zfEnf2J6l_RGiSqweJZKNzn5IvVGr0zRtmOM4xAs-dzZBPU7dev1nc3pyNb9JrTlkkvyt52IySP3vrlw",
      alt: "Flat lay photograph of Closet by Chilli luxury unboxing with black shopping bag and crimson tissue paper",
    },
    {
      handle: "@meera.kapoor",
      icon: "favorite",
      image:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuAcfmhjavtt6C9lSqeDmxDgeSXMZHygHo28QPpPMTNa3uuOpun8sCBRpz-cqImWmyD5YqU1BzAk_1xlRkIT886n6oyLw5MBW9s5T2UnCsYer7aQ9Razp9YlcdeOrYMLLy148y0_OwiizvapgmhUF0c3hLDcYfFOrEjNEYrNG6A0SkwMYiJHWlaPjvAdS0Qt2upBcne7XMuzefnG4AUED-JUfRnNpCnaaD_dsQIomWYq5GV0B34Hg-Kpbw",
      alt: "Editorial portrait of real client in crimson red floor length gown at destination wedding",
    },
    {
      handle: "Studio Rack",
      icon: "storefront",
      image:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuAqKHHPMvhodAqImNexY-ME2WgGITh3ZMGFVxOn_VanZVqQIgcurcRiLj263b23qe62pdcIjYhWXb77iMuVPZzEHERBr0n16lN5-iwkmtMYhv43htR9atlRGeR3EQAmBrJ63skfpj1lD5xiNPkkF8_OqTdk0u_hGNSdvyLMO0nR1zpPxxKjeeW_BhivmpOBRtPSiSXqdPwuT7L-o4BjQ1OiBM79HvMBjOAqe3oMstA0JV_e5mMXv0VpKw",
      alt: "Close up photography of tailored garments hanging on wooden hanger featuring Closet by Chilli engraved logo",
    },
    {
      handle: "@tanya_drapes",
      icon: "photo_camera",
      image:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuAKyFj3o7NKYiPLmyMHC2UBTqMSZNxGeRitBhhoI4FfZRkaNaWzswfB8Q_TclNxl1ZYSEf68UYhaW0o7WpD3z1UJF7foABStlzuf7TuDpJAUXKFoXObvaS05MoWxjkKqjpmrfky_ucDqac6dWRHNOKiFQtcKHF9NJ6qr8zLcbfhMu_4VHkFqiVxstNrabh5QwMR0wUJtrAfvLcOFGyQKyVj6NdSyLheyRmqQLrwseUUmpn8DVQql81NmQ",
      alt: "Muse in asymmetrical scarlet red kurta pairing it with chunky statement gold earrings",
    },
  ];

  return (
    <section className="w-full py-20 px-4 sm:px-6 lg:px-12 bg-surface">
      <div className="max-w-360 mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="material-symbols-outlined text-primary text-[18px]">
                photo_camera
              </span>
              <span className="font-label-caps text-label-caps uppercase text-primary tracking-widest font-semibold">
                Styled In Chilli
              </span>
            </div>
            <h2 className="font-headline-lg text-headline-lg text-on-surface">
              The Social Salon
            </h2>
            <p className="font-body-md text-body-md text-on-surface-variant mt-1">
              Tag <span className="font-semibold text-primary">@closetbychili</span> and use{" "}
              <span className="font-semibold text-on-surface">#ClosetByChilli</span> to be featured on our curated runway feed.
            </p>
          </div>
          <a
            href="https://instagram.com"
            rel="noopener noreferrer"
            target="_blank"
            className="mt-4 md:mt-0 inline-flex items-center gap-2 font-label-caps text-label-caps uppercase tracking-wider text-on-surface hover:text-primary transition-colors"
          >
            <span>Follow Us on Instagram</span>
            <span className="material-symbols-outlined text-[16px]">open_in_new</span>
          </a>
        </div>

        {/* 5-Grid Mosaic */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
          {tiles.map((tile, idx) => (
            <a
              key={idx}
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              className={`group relative aspect-square overflow-hidden bg-surface-container shadow-xs hover:shadow-md transition-shadow ${
                idx === 4 ? "col-span-2 md:col-span-1" : ""
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={tile.image}
                alt={tile.alt}
                data-alt={tile.alt}
                className="w-full h-full object-cover transition-transform duration-600 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-inverse-surface/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-on-primary">
                <span className="material-symbols-outlined text-[28px]">
                  {tile.icon}
                </span>
              </div>
              <span className="absolute bottom-2 left-2 px-2 py-0.5 bg-surface/90 text-on-surface font-label-caps text-[9px] uppercase tracking-wider shadow-xs">
                {tile.handle}
              </span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
