import { ClipboardList, UserPlus, Send, QrCode } from "lucide-react";

const STEPS = [
  {
    step: "01",
    icon: ClipboardList,
    title: "Create Your Event",
    description:
      "Set up your event in minutes. Choose the event type, date, venue, and select a tier that fits your needs — from Basic (free) to Royal.",
    color: "bg-blue-50 text-blue-600",
  },
  {
    step: "02",
    icon: UserPlus,
    title: "Add Guests",
    description:
      "Add invitees one by one or bulk-import a CSV. Each guest gets a unique QR code and a personalised e-card invitation.",
    color: "bg-amber-50 text-amber-600",
  },
  {
    step: "03",
    icon: Send,
    title: "Send Invitations",
    description:
      "Deliver invitations instantly via SMS and WhatsApp. Guests RSVP by replying with YES or NO — no app download required.",
    color: "bg-green-50 text-green-600",
  },
  {
    step: "04",
    icon: QrCode,
    title: "Check In & Track",
    description:
      "On the day, staff scan QR codes to mark attendance. Monitor contributions, pledges, and real-time attendance from your dashboard.",
    color: "bg-purple-50 text-purple-600",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 bg-warm-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="max-w-2xl mx-auto text-center mb-16">
          <span className="inline-block px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold uppercase tracking-widest mb-4">
            How It Works
          </span>
          <h2 className="text-4xl lg:text-5xl font-extrabold text-gray-900 mb-4">
            From zero to event-ready in four steps
          </h2>
          <p className="text-lg text-gray-600 leading-relaxed">
            No complicated setup. No technical knowledge required.
            Invitee is designed so you can go live in under 10 minutes.
          </p>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {STEPS.map((step, index) => (
            <div key={step.step} className="relative flex flex-col items-start">
              {/* Connector line */}
              {index < STEPS.length - 1 && (
                <div className="hidden lg:block absolute top-10 left-[calc(100%-16px)] w-full h-px bg-warm-200 z-0" />
              )}

              {/* Icon */}
              <div className={`relative z-10 w-20 h-20 rounded-2xl ${step.color} flex items-center justify-center mb-5`}>
                <step.icon size={28} />
                <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-amber-500 text-white text-xs font-bold flex items-center justify-center">
                  {step.step}
                </span>
              </div>

              <h3 className="text-gray-900 font-bold text-xl mb-2">{step.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
