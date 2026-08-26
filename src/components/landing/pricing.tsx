import Link from "next/link";
import { Check, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";

const TIERS = [
  {
    name:        "Basic",
    price:       0,
    invitees:    5,
    badge:       "basic" as const,
    description: "For small, intimate gatherings.",
    highlight:   false,
    features: [
      "Up to 5 guests",
      "1 active event",
      "Basic event management",
      "Email support",
    ],
    missing: [
      "RSVP tracking",
      "E-card invitations",
      "SMS / WhatsApp",
      "Contribution tracking",
    ],
  },
  {
    name:        "Standard",
    price:       149999,
    invitees:    251,
    badge:       "standard" as const,
    description: "For medium events with full communication.",
    highlight:   false,
    features: [
      "Up to 251 guests",
      "Multiple events",
      "RSVP tracking",
      "E-card invitations",
      "SMS & WhatsApp notifications",
      "Contribution tracking",
      "QR code check-in",
      "Basic reports",
    ],
    missing: [
      "Custom e-card templates",
      "Budget & vendor management",
      "CSV export",
      "Staff access",
    ],
  },
  {
    name:        "Premium",
    price:       359999,
    invitees:    551,
    badge:       "premium" as const,
    description: "For large events that need full control.",
    highlight:   true,
    features: [
      "Up to 551 guests",
      "Everything in Standard",
      "Custom e-card templates",
      "Budget & vendor management",
      "CSV export",
      "Staff access",
      "AI message suggestions",
      "Advanced reports",
    ],
    missing: [],
  },
  {
    name:        "Royal",
    price:       599999,
    invitees:    1001,
    badge:       "royal" as const,
    description: "For premium events at any scale.",
    highlight:   false,
    features: [
      "Up to 1,001 guests",
      "Everything in Premium",
      "Priority support",
      "Dedicated account manager",
      "Custom branding",
      "Post-event AI summary",
    ],
    missing: [],
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="max-w-2xl mx-auto text-center mb-4">
          <span className="inline-block px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold uppercase tracking-widest mb-4">
            Pricing
          </span>
          <h2 className="text-4xl lg:text-5xl font-extrabold text-gray-900 mb-4">
            Plans for every celebration
          </h2>
          <p className="text-lg text-gray-600 leading-relaxed">
            Start free. Upgrade your tier when you need more. All payments are offline
            and activated by our team within 24 hours.
          </p>
        </div>

        {/* Payment note */}
        <p className="text-center text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl py-3 px-4 max-w-xl mx-auto mb-12">
          Payments via M-Pesa / bank transfer. Our team activates your tier manually within 24 hours.
        </p>

        {/* Tier cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {TIERS.map(tier => (
            <div
              key={tier.name}
              className={`relative flex flex-col rounded-2xl border p-6 transition-all ${
                tier.highlight
                  ? "border-amber-400 shadow-xl shadow-amber-100 scale-[1.02]"
                  : "border-warm-200 hover:border-amber-200 hover:shadow-md"
              }`}
            >
              {tier.highlight && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="flex items-center gap-1 px-3 py-1 rounded-full bg-amber-500 text-white text-xs font-bold">
                    <Star size={10} fill="white" /> Most Popular
                  </span>
                </div>
              )}

              <div className="mb-4">
                <Badge variant={tier.badge} className="mb-3">{tier.name}</Badge>
                <div className="text-3xl font-extrabold text-gray-900">
                  {tier.price === 0 ? (
                    <span>Free</span>
                  ) : (
                    <span>{formatCurrency(BigInt(tier.price))}</span>
                  )}
                </div>
                {tier.price > 0 && <div className="text-xs text-gray-500 mt-0.5">per event</div>}
                <p className="text-sm text-gray-500 mt-2">{tier.description}</p>
                <p className="text-xs text-amber-600 font-semibold mt-1">Up to {tier.invitees} guests</p>
              </div>

              <div className="flex-1 space-y-2 mb-6">
                {tier.features.map(f => (
                  <div key={f} className="flex items-center gap-2 text-sm text-gray-700">
                    <Check size={14} className="text-green-500 shrink-0" />
                    {f}
                  </div>
                ))}
                {tier.missing.map(f => (
                  <div key={f} className="flex items-center gap-2 text-sm text-gray-400 line-through">
                    <span className="w-3.5 shrink-0" />
                    {f}
                  </div>
                ))}
              </div>

              <Link href="/register">
                <Button
                  className={`w-full ${
                    tier.highlight
                      ? "bg-amber-600 hover:bg-amber-700 text-white"
                      : ""
                  }`}
                  variant={tier.highlight ? "default" : "outline"}
                >
                  {tier.price === 0 ? "Get Started Free" : `Choose ${tier.name}`}
                </Button>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
