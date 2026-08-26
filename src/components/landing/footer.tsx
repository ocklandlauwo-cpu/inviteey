import Link from "next/link";

const LINKS = {
  Product: [
    { label: "Features",    href: "#about" },
    { label: "How It Works",href: "#how-it-works" },
    { label: "Pricing",     href: "#pricing" },
    { label: "Templates",   href: "#templates" },
  ],
  Company: [
    { label: "About Us",    href: "#about" },
    { label: "Contact",     href: "#contact" },
    { label: "Blog",        href: "#" },
    { label: "Careers",     href: "#" },
  ],
  Support: [
    { label: "Help Center",      href: "#" },
    { label: "Privacy Policy",   href: "/privacy" },
    { label: "Terms of Service", href: "/terms" },
    { label: "Cookie Policy",    href: "/cookies" },
  ],
};

export function Footer() {
  return (
    <footer className="bg-gray-950 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 mb-12">
          {/* Brand */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">🎉</span>
              <span className="text-xl font-extrabold">Invitee</span>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed max-w-xs">
              Your AI-powered event management platform. From invitation to check-in,
              we make every event unforgettable.
            </p>
            <p className="text-gray-500 text-xs mt-4">
              Built with love in Tanzania 🇹🇿
            </p>
          </div>

          {/* Links */}
          {Object.entries(LINKS).map(([group, links]) => (
            <div key={group}>
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">
                {group}
              </h4>
              <ul className="space-y-2.5">
                {links.map(link => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-gray-400 hover:text-white text-sm transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-white/10 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-gray-500 text-sm">
            &copy; {new Date().getFullYear()} Invitee. All rights reserved.
          </p>
          <p className="text-gray-600 text-xs">
            <a href="mailto:info@invitee.co.tz" className="hover:text-gray-400 transition-colors">
              info@invitee.co.tz
            </a>
            {" · "}
            <span>invitee.co.tz</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
