import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Calendar, Users, Sparkles } from "lucide-react";

const STATS = [
  { value: "10K+",  label: "Events Managed" },
  { value: "500K+", label: "Invitations Sent" },
  { value: "98%",   label: "On-Time Delivery" },
];

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center bg-gradient-to-br from-gray-900 via-amber-950 to-orange-900 overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-600/5 rounded-full blur-3xl" />
        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)", backgroundSize: "60px 60px" }}
        />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-sm font-medium mb-8">
            <Sparkles size={14} />
            <span>AI-Powered Event Management for Africa</span>
          </div>

          {/* Headline */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-white leading-[1.1] tracking-tight mb-6">
            Every Event,{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">
              Perfectly
            </span>{" "}
            Managed
          </h1>

          {/* Subheadline */}
          <p className="text-xl text-white/70 max-w-2xl mx-auto mb-10 leading-relaxed">
            From wedding invitations to corporate check-ins — Invitee gives you everything
            you need to plan, invite, and run events that your guests will never forget.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
            <Link href="/register">
              <Button size="xl" className="bg-amber-500 hover:bg-amber-600 text-white shadow-xl shadow-amber-900/30 group">
                Start for Free
                <ArrowRight size={18} className="ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <a href="#how-it-works">
              <Button
                size="xl"
                variant="outline"
                className="border-white/20 text-white bg-white/5 hover:bg-white/10 hover:border-white/30"
              >
                See How It Works
              </Button>
            </a>
          </div>

          {/* Stats */}
          <div className="flex flex-col sm:flex-row gap-8 sm:gap-12 justify-center items-center">
            {STATS.map(stat => (
              <div key={stat.value} className="text-center">
                <div className="text-3xl font-extrabold text-amber-400">{stat.value}</div>
                <div className="text-sm text-white/60 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Feature cards floating */}
        <div className="mt-20 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
          {[
            { icon: Calendar, title: "Smart Invitations", desc: "Beautiful e-cards delivered via SMS & WhatsApp" },
            { icon: Users,    title: "Guest Management", desc: "Track RSVPs, contributions & check-ins in real time" },
            { icon: Sparkles, title: "AI Assistance",    desc: "Let Gemini AI suggest messages and analyze your event" },
          ].map(feat => (
            <div
              key={feat.title}
              className="flex items-start gap-3 p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm"
            >
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 shrink-0">
                <feat.icon size={18} />
              </div>
              <div>
                <div className="text-white font-semibold text-sm">{feat.title}</div>
                <div className="text-white/50 text-xs mt-0.5">{feat.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
