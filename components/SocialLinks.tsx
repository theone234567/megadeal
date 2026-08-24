const SOCIALS = [
  {
    name: "Facebook",
    href: "https://facebook.com/megadealnz",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className="h-4 w-4">
        <path d="M14 13.5h2.5l1-4H14v-2c0-1.03 0-2 2-2h1.5V2.14c-.326-.043-1.557-.14-2.857-.14C11.928 2 10 3.657 10 6.7v2.8H7v4h3V22h4v-8.5Z" />
      </svg>
    ),
  },
  {
    name: "Instagram",
    href: "https://instagram.com/megadealnz",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        aria-hidden
        className="h-4 w-4"
      >
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    name: "TikTok",
    href: "https://tiktok.com/@megadealnz",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className="h-4 w-4">
        <path d="M16.6 5.82a4.28 4.28 0 0 1-3.14-1.4v9.6a5.5 5.5 0 1 1-4.72-5.44v2.6a2.9 2.9 0 1 0 2.22 2.82V2h2.5a4.28 4.28 0 0 0 3.14 3.6v.22Z" />
      </svg>
    ),
  },
];

export default function SocialLinks({
  className = "",
  variant = "default",
}: {
  className?: string;
  variant?: "default" | "light";
}) {
  const linkClass =
    variant === "light"
      ? "border-white/40 text-white hover:border-white hover:bg-white/10"
      : "border-slate-200 text-slate-500 hover:border-brand-400 hover:text-brand-600";

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {SOCIALS.map((s) => (
        <a
          key={s.name}
          href={s.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`MegaDeal on ${s.name}`}
          className={`flex h-9 w-9 items-center justify-center rounded-full border transition ${linkClass}`}
        >
          {s.icon}
        </a>
      ))}
    </div>
  );
}
