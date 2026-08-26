import {
  Heart, Cake, Briefcase, GlassWater, HandCoins, Star, ArrowRight,
} from "lucide-react";
import Link from "next/link";

const TEMPLATES = [
  {
    type:    "Wedding",
    icon:    Heart,
    palette: "from-rose-500 to-pink-600",
    accent:  "bg-rose-100 text-rose-700",
    count:   8,
    desc:    "Elegant floral designs in ivory, gold & blush",
  },
  {
    type:    "Birthday",
    icon:    Cake,
    palette: "from-amber-400 to-orange-500",
    accent:  "bg-amber-100 text-amber-700",
    count:   6,
    desc:    "Vibrant & festive — from kids to milestone birthdays",
  },
  {
    type:    "Corporate",
    icon:    Briefcase,
    palette: "from-slate-600 to-gray-800",
    accent:  "bg-slate-100 text-slate-700",
    count:   5,
    desc:    "Professional layouts for meetings, launches & galas",
  },
  {
    type:    "Sendoff",
    icon:    Star,
    palette: "from-violet-500 to-purple-700",
    accent:  "bg-violet-100 text-violet-700",
    count:   4,
    desc:    "Warm farewell themes for retirements & departures",
  },
  {
    type:    "Kitchen Party",
    icon:    GlassWater,
    palette: "from-teal-400 to-cyan-600",
    accent:  "bg-teal-100 text-teal-700",
    count:   4,
    desc:    "Fun, colourful designs perfect for pre-wedding events",
  },
  {
    type:    "Fundraising",
    icon:    HandCoins,
    palette: "from-green-500 to-emerald-700",
    accent:  "bg-green-100 text-green-700",
    count:   3,
    desc:    "Compelling designs that inspire guests to contribute",
  },
];

export function Templates() {
  return (
    <section id="templates" className="py-20 lg:py-28 bg-warm-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Heading */}
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-100 border border-amber-200 text-amber-700 text-sm font-semibold mb-4">
            <Star size={13} /> Ready-Made Templates
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 leading-tight">
            Beautiful E-cards for{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-500">
              every occasion
            </span>
          </h2>
          <p className="text-gray-500 mt-4 text-lg">
            Pick a template, personalise with guest names and QR codes, and send directly via
            WhatsApp or Email — all in minutes.
          </p>
        </div>

        {/* Template grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {TEMPLATES.map(tpl => {
            const Icon = tpl.icon;
            return (
              <div
                key={tpl.type}
                className="group bg-white rounded-3xl border border-warm-200 overflow-hidden hover:shadow-lg hover:border-amber-200 transition-all duration-300"
              >
                {/* Card visual */}
                <div className={`h-44 bg-gradient-to-br ${tpl.palette} relative flex items-center justify-center overflow-hidden`}>
                  {/* Decorative circles */}
                  <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/10 rounded-full" />
                  <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-white/10 rounded-full" />
                  {/* Mock card interior */}
                  <div className="relative bg-white/15 backdrop-blur-sm rounded-2xl px-8 py-5 text-center mx-6">
                    <Icon size={22} className="text-white mx-auto mb-2" />
                    <div className="h-2 w-24 bg-white/60 rounded-full mx-auto mb-1.5" />
                    <div className="h-1.5 w-16 bg-white/40 rounded-full mx-auto mb-3" />
                    <div className="w-10 h-10 bg-white/25 rounded-lg mx-auto" title="QR code placeholder" />
                  </div>
                </div>

                {/* Meta */}
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${tpl.accent}`}>{tpl.type}</span>
                    <span className="text-xs text-gray-400">{tpl.count} designs</span>
                  </div>
                  <p className="text-sm text-gray-600">{tpl.desc}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* CTA */}
        <div className="mt-12 text-center">
          <Link
            href="/register"
            className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white font-bold px-8 py-3.5 rounded-2xl transition-colors text-sm"
          >
            Browse All Templates <ArrowRight size={16} />
          </Link>
          <p className="text-gray-400 text-xs mt-3">New templates added monthly · Upload your own custom design</p>
        </div>
      </div>
    </section>
  );
}
