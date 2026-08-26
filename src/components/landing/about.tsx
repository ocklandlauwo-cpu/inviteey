import { Heart, Shield, Zap, Globe } from "lucide-react";

const VALUES = [
  {
    icon: Heart,
    title: "Built for African Events",
    description:
      "We understand the nuance of local celebrations — from weddings with 1,000 guests to intimate kitchen parties. Invitee is designed around the way events happen here.",
  },
  {
    icon: Zap,
    title: "Fast & Reliable",
    description:
      "WhatsApp and SMS delivery in seconds. Your guests receive their invitations instantly, with real-time delivery tracking in your dashboard.",
  },
  {
    icon: Globe,
    title: "Swahili & English",
    description:
      "Full bilingual support. Send notifications, generate messages, and manage your event in the language your guests speak.",
  },
  {
    icon: Shield,
    title: "Trusted & Secure",
    description:
      "Your guest data stays private. Role-based access, audit logs, and encrypted storage — enterprise-grade security for every event.",
  },
];

export function About() {
  return (
    <section id="about" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="max-w-2xl mx-auto text-center mb-16">
          <span className="inline-block px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold uppercase tracking-widest mb-4">
            About Invitee
          </span>
          <h2 className="text-4xl lg:text-5xl font-extrabold text-gray-900 mb-4">
            Event management that actually works for you
          </h2>
          <p className="text-lg text-gray-600 leading-relaxed">
            Invitee was built from the ground up for event organizers across Africa —
            people who plan weddings, birthdays, sendoffs, and everything in between —
            and need tools that match the scale and spirit of those celebrations.
          </p>
        </div>

        {/* Values grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {VALUES.map(val => (
            <div
              key={val.title}
              className="group flex flex-col gap-4 p-6 rounded-2xl border border-warm-100 hover:border-amber-200 hover:shadow-lg transition-all"
            >
              <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center group-hover:bg-amber-100 transition-colors">
                <val.icon size={22} className="text-amber-600" />
              </div>
              <div>
                <h3 className="text-gray-900 font-bold text-lg mb-2">{val.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{val.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Event type pills */}
        <div className="mt-16 text-center">
          <p className="text-sm text-gray-500 mb-4 font-medium">Supports every event type</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {["Weddings", "Birthdays", "Send-offs", "Kitchen Parties", "Corporate Events", "Fundraisings", "& More"].map(t => (
              <span
                key={t}
                className="px-4 py-2 rounded-full bg-warm-50 border border-warm-200 text-gray-700 text-sm font-medium"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
