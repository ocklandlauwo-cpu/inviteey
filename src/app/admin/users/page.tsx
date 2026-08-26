import { prisma }     from "@/lib/prisma";
import { Badge }      from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { getSession } from "@/lib/auth";
import { UserManagementTable } from "@/components/admin/user-management-table";

export default async function AdminUsersPage() {
  const { user: currentUser } = await getSession();

  const users = await prisma.user.findMany({
    orderBy: { id: "asc" },
    select: {
      id:        true,
      name:      true,
      email:     true,
      phone:     true,
      role:      true,
      status:    true,
      createdAt: true,
      _count:    { select: { events: { where: { deletedAt: null } } } },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900">User Management</h1>
        <p className="text-gray-500 text-sm mt-1">{users.length} registered users</p>
      </div>

      <UserManagementTable users={users} currentUserId={parseInt(currentUser!.id, 10)} />
    </div>
  );
}
