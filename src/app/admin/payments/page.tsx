import { redirect }   from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma }     from "@/lib/prisma";
import { CreditCard, TrendingUp, FileText, Clock } from "lucide-react";
import { PaymentsPageClient } from "@/components/admin/payments-page-client";

function StatCard({
  icon: Icon, label, value, sub, color = "amber",
}: {
  icon: React.ElementType; label: string; value: string; sub?: string; color?: string;
}) {
  const colors: Record<string, string> = {
    amber:  "bg-amber-50  text-amber-600",
    green:  "bg-green-50  text-green-600",
    blue:   "bg-blue-50   text-blue-600",
    yellow: "bg-yellow-50 text-yellow-600",
  };
  return (
    <div className="bg-white rounded-2xl border border-warm-200 p-5 flex items-center gap-4">
      <div className={`p-3 rounded-xl ${colors[color]}`}>
        <Icon size={22} />
      </div>
      <div>
        <p className="text-xs text-gray-500 font-medium">{label}</p>
        <p className="text-2xl font-extrabold text-gray-900 leading-tight">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default async function AdminPaymentsPage() {
  const { user } = await getSession();
  if (!user || user.role !== "admin") redirect("/login");

  const [
    organizers,
    invoiceTotal,
    invoicePending,
    invoicePaid,
    revenueAgg,
    serviceBreakdown,
  ] = await Promise.all([
    prisma.user.findMany({
      where:   { role: "organizer" },
      select:  { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
    prisma.platformInvoice.count({ where: { deletedAt: null } }),
    prisma.platformInvoice.count({ where: { deletedAt: null, status: "pending" } }),
    prisma.platformInvoice.count({ where: { deletedAt: null, status: "paid" } }),
    prisma.platformPayment.aggregate({
      where:  { deletedAt: null, status: "confirmed" },
      _sum:   { amount: true },
      _count: true,
    }),
    prisma.platformPayment.groupBy({
      by:     ["serviceType"],
      where:  { deletedAt: null, status: "confirmed" },
      _sum:   { amount: true },
      _count: { id: true },
      orderBy:{ _sum: { amount: "desc" } },
    }),
  ]);

  const totalRevenue = Number(revenueAgg._sum.amount ?? 0);

  const SERVICE_LABELS: Record<string, string> = {
    tier_standard:         "Tier Standard",
    tier_premium:          "Tier Premium",
    tier_royal:            "Tier Royal",
    sms_notification:      "SMS Notification",
    whatsapp_notification: "WhatsApp Notification",
    ecard_service:         "E-Card Service",
    extra_invitees:        "Extra Invitees",
    other:                 "Other",
  };

  function fmtTZS(n: number) {
    return `TZS ${n.toLocaleString("en")}`;
  }

  return (
    <div className="space-y-8 max-w-7xl">
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900">Platform Payments</h1>
        <p className="text-sm text-gray-500 mt-1">
          Create invoices for services → receive payment → confirm automatically
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={FileText}
          label="Total Invoices"
          value={String(invoiceTotal)}
          sub={`${invoicePending} pending · ${invoicePaid} paid`}
          color="blue"
        />
        <StatCard
          icon={Clock}
          label="Pending Payment"
          value={String(invoicePending)}
          sub="awaiting confirmation"
          color="yellow"
        />
        <StatCard
          icon={CreditCard}
          label="Payments Collected"
          value={String(revenueAgg._count)}
          sub={`${invoicePaid} invoices settled`}
          color="amber"
        />
        <StatCard
          icon={TrendingUp}
          label="Total Revenue"
          value={fmtTZS(totalRevenue)}
          sub="confirmed payments only"
          color="green"
        />
      </div>

      {/* Revenue by service type */}
      {serviceBreakdown.length > 0 && (
        <div className="bg-white rounded-2xl border border-warm-200 p-6">
          <h2 className="font-bold text-gray-900 mb-4">Revenue by Service</h2>
          <div className="space-y-3">
            {serviceBreakdown.map(row => {
              const amount = Number(row._sum.amount ?? 0);
              const pct    = totalRevenue > 0 ? Math.round((amount / totalRevenue) * 100) : 0;
              return (
                <div key={row.serviceType} className="flex items-center gap-3">
                  <span className="w-44 text-sm text-gray-700 shrink-0">
                    {SERVICE_LABELS[row.serviceType] ?? row.serviceType}
                  </span>
                  <div className="flex-1 h-2.5 bg-warm-100 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-400 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-sm font-semibold text-gray-900 w-36 text-right whitespace-nowrap">
                    {fmtTZS(amount)}
                  </span>
                  <span className="text-xs text-gray-400 w-10 text-right">{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Invoices + Payments tabs (client) */}
      <PaymentsPageClient organizers={organizers} />
    </div>
  );
}
