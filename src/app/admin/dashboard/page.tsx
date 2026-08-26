import Link             from "next/link";
import {
  Users, CalendarDays, Shield, Activity, TrendingUp, ArrowRight,
  CheckCircle2, Clock, XCircle, Rocket, Star,
} from "lucide-react";
import { prisma }          from "@/lib/prisma";
import { getSession }      from "@/lib/auth";
import { redirect }        from "next/navigation";
import { formatCurrency }  from "@/lib/utils";
import { PendingTiersList } from "@/components/admin/pending-tiers-list";

const STATUS_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  draft:      { label: "Draft",      icon: Clock,         color: "text-gray-500"  },
  active:     { label: "Active",     icon: Rocket,        color: "text-green-600" },
  event_day:  { label: "Event Day",  icon: Star,          color: "text-amber-600" },
  completed:  { label: "Completed",  icon: CheckCircle2,  color: "text-blue-600"  },
  cancelled:  { label: "Cancelled",  icon: XCircle,       color: "text-red-400"   },
};

export default async function AdminDashboardPage() {
  const { user } = await getSession();
  if (!user || user.role !== "admin") redirect("/login");

  const [
    userCount,
    suspendedCount,
    eventStatusGroups,
    pendingTierEvents,
    pendingTierCount,
    revenueAgg,
    recentAudit,
    totalAuditCount,
  ] = await Promise.all([
    prisma.user.count({ where: { status: { not: "suspended" } } }),
    prisma.user.count({ where: { status: "suspended" } }),
    prisma.event.groupBy({ by: ["status"], where: { deletedAt: null }, _count: { status: true } }),
    prisma.event.findMany({
      where:   { tier: { not: "basic" }, tierActivatedAt: null, deletedAt: null },
      include: { organizer: { select: { name: true, email: true, phone: true } } },
      orderBy: { id: "asc" },
      take:    5,
    }),
    prisma.event.count({ where: { tier: { not: "basic" }, tierActivatedAt: null, deletedAt: null } }),
    prisma.platformPayment.aggregate({ where: { deletedAt: null, status: "confirmed" }, _sum: { amount: true }, _count: true }),
    prisma.auditLog.findMany({ orderBy: { changedAt: "desc" }, take: 10, include: { user: true } }),
    prisma.auditLog.count(),
  ]);

  const totalEvents  = eventStatusGroups.reduce((s, g) => s + g._count.status, 0);
  const totalRevenue = revenueAgg._sum.amount ?? BigInt(0);

  const topStats = [
    {
      label: "Active Users",
      value: userCount.toLocaleString("en"),
      sub:   suspendedCount ? `${suspendedCount} suspended` : "no suspensions",
      icon:  Users,
      color: "text-blue-600 bg-blue-50",
      href:  "/admin/users",
    },
    {
      label: "Total Events",
      value: totalEvents.toLocaleString("en"),
      sub:   `${eventStatusGroups.find(g => g.status === "active")?._count.status ?? 0} active`,
      icon:  CalendarDays,
      color: "text-green-600 bg-green-50",
      href:  "/admin/events",
    },
    {
      label: "Pending Tier Activations",
      value: pendingTierCount.toLocaleString("en"),
      sub:   pendingTierCount ? "waiting for confirmation" : "all up to date",
      icon:  Shield,
      color: pendingTierCount ? "text-amber-600 bg-amber-50" : "text-gray-400 bg-gray-50",
      href:  "/admin/tiers",
    },
    {
      label: "Platform Revenue",
      value: formatCurrency(totalRevenue),
      sub:   `${revenueAgg._count} confirmed payment${revenueAgg._count !== 1 ? "s" : ""}`,
      icon:  TrendingUp,
      color: "text-purple-600 bg-purple-50",
      href:  "/admin/payments",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Platform overview and pending actions</p>
      </div>

      {/* Top stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {topStats.map(stat => (
          <Link key={stat.label} href={stat.href} className="group">
            <div className="bg-white rounded-2xl border border-warm-200 p-5 hover:border-amber-200 hover:shadow-sm transition-all h-full">
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stat.color}`}>
                  <stat.icon size={18} />
                </div>
                <ArrowRight size={14} className="text-gray-300 group-hover:text-amber-400 transition-colors" />
              </div>
              <div className="text-2xl font-extrabold text-gray-900">{stat.value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{stat.label}</div>
              <div className="text-xs text-gray-400 mt-0.5">{stat.sub}</div>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Events by status */}
        <div className="bg-white rounded-2xl border border-warm-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900">Events by Status</h2>
            <Link href="/admin/events" className="text-xs text-amber-600 hover:text-amber-700 font-semibold flex items-center gap-1">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          <div className="space-y-3">
            {["draft","active","event_day","completed","cancelled"].map(status => {
              const meta  = STATUS_META[status];
              const count = eventStatusGroups.find(g => g.status === status)?._count.status ?? 0;
              const pct   = totalEvents ? Math.round((count / totalEvents) * 100) : 0;
              const Icon  = meta.icon;
              return (
                <div key={status} className="flex items-center gap-3">
                  <Icon size={14} className={`${meta.color} shrink-0`} />
                  <span className="text-sm text-gray-600 w-24 shrink-0">{meta.label}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        status === "active"    ? "bg-green-500" :
                        status === "event_day" ? "bg-amber-500" :
                        status === "completed" ? "bg-blue-500"  :
                        status === "draft"     ? "bg-gray-400"  : "bg-red-300"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-gray-900 w-8 text-right shrink-0">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Pending tier activations */}
        <div className="bg-white rounded-2xl border border-warm-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900">Pending Tier Activations</h2>
            {pendingTierCount > 0 && (
              <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full">
                {pendingTierCount}
              </span>
            )}
          </div>
          <PendingTiersList
            events={pendingTierEvents.map(e => ({
              id:        e.id,
              name:      e.name,
              tier:      e.tier,
              organizer: e.organizer,
            }))}
            totalCount={pendingTierCount}
          />
        </div>
      </div>

      {/* Recent audit activity */}
      <div className="bg-white rounded-2xl border border-warm-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-900">Recent Activity</h2>
          <Link href="/admin/audit" className="text-xs text-amber-600 hover:text-amber-700 font-semibold flex items-center gap-1">
            <Activity size={12} /> {totalAuditCount.toLocaleString("en")} total
          </Link>
        </div>
        <div className="space-y-1">
          {recentAudit.length === 0 && (
            <p className="text-sm text-gray-400 py-4 text-center">No audit logs yet.</p>
          )}
          {recentAudit.map(log => (
            <div key={String(log.id)} className="flex items-center gap-3 text-sm py-2.5 border-b border-warm-50 last:border-0">
              <span className={`px-2 py-0.5 rounded text-xs font-mono font-semibold shrink-0 ${
                log.operation === "INSERT" ? "bg-green-50 text-green-700" :
                log.operation === "UPDATE" ? "bg-blue-50 text-blue-700"  :
                "bg-red-50 text-red-700"
              }`}>
                {log.operation}
              </span>
              <span className="text-gray-600 font-mono text-xs shrink-0">{log.tableName}</span>
              <span className="text-gray-400 text-xs ml-auto shrink-0">
                {log.user?.name ?? "System"} · {new Date(log.changedAt).toLocaleString("en-TZ")}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
