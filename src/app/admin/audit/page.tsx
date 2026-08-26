import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma }     from "@/lib/prisma";
import { AuditLogTable } from "@/components/admin/audit-log-table";

export default async function AdminAuditPage() {
  const { user } = await getSession();
  if (!user || user.role !== "admin") redirect("/login");

  const logs = await prisma.auditLog.findMany({
    orderBy: { id: "desc" },
    include: { user: { select: { id: true, name: true, email: true } } },
    take:    500,
  });

  const serialized = logs.map(l => ({ ...l, id: l.id.toString() }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900">Audit Log</h1>
        <p className="text-gray-500 text-sm mt-1">
          Record of changes made to key tables, most recent 500 entries.
        </p>
      </div>

      <AuditLogTable logs={serialized} />
    </div>
  );
}
