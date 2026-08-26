"use client";

import * as React from "react";
import { Search, ShieldOff, ShieldCheck, Pencil } from "lucide-react";
import { Input }    from "@/components/ui/input";
import { Badge }    from "@/components/ui/badge";
import { Button }   from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Pagination, PAGE_SIZE } from "@/components/ui/pagination";
import { formatDate } from "@/lib/utils";
import { EditUserDialog } from "@/components/admin/edit-user-dialog";
import type { UserRole, UserStatus } from "@prisma/client";

interface UserRow {
  id:        number;
  name:      string;
  email:     string;
  phone:     string | null;
  role:      UserRole;
  status:    UserStatus;
  createdAt: Date;
  _count:    { events: number };
}

export function UserManagementTable({ users: initial, currentUserId }: { users: UserRow[]; currentUserId: number }) {
  const { toast }       = useToast();
  const [users, setUsers] = React.useState(initial);
  const [search, setSearch] = React.useState("");
  const [loading, setLoading] = React.useState<number | null>(null);
  const [page, setPage] = React.useState(1);
  const [editingUser, setEditingUser] = React.useState<UserRow | null>(null);

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages  = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged       = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  React.useEffect(() => { setPage(1); }, [search]);

  async function toggleSuspend(userId: number, isSuspended: boolean) {
    setLoading(userId);
    try {
      const res  = await fetch(`/api/v1/admin/users/${userId}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ status: isSuspended ? "active" : "suspended" }),
      });
      const json = await res.json();
      if (!res.ok) { toast({ title: "Error", description: json.error, variant: "destructive" }); return; }
      setUsers(prev => prev.map(u =>
        u.id === userId ? { ...u, status: isSuspended ? "active" : "suspended" } : u
      ));
      toast({ title: isSuspended ? "User unsuspended" : "User suspended" });
    } catch {
      toast({ title: "Something went wrong", variant: "destructive" });
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <Input
          placeholder="Search users…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-8"
        />
      </div>

      <div className="bg-white rounded-2xl border border-warm-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-warm-100 bg-warm-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">User</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden sm:table-cell">Role</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Events</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden lg:table-cell">Joined</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paged.map(user => (
                <tr key={user.id} className="border-b border-warm-50 hover:bg-warm-50/50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{user.name}</div>
                    <div className="text-xs text-gray-400">{user.email}</div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <Badge variant="outline" className="capitalize text-xs">{user.role}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={
                        user.status === "active"    ? "success" :
                        user.status === "unverified" ? "warning" : "error"
                      }
                      className="text-xs capitalize"
                    >
                      {user.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-gray-600">
                    {user._count.events}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-xs text-gray-400">
                    {formatDate(user.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingUser(user)}
                        className="text-gray-500 hover:bg-warm-100"
                      >
                        <Pencil size={14} className="mr-1" /> Edit
                      </Button>
                      {user.role !== "admin" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={loading === user.id}
                          onClick={() => toggleSuspend(user.id, user.status === "suspended")}
                          className={user.status === "suspended"
                            ? "text-green-600 hover:bg-green-50"
                            : "text-red-500 hover:bg-red-50"}
                        >
                          {user.status === "suspended"
                            ? <><ShieldCheck size={14} className="mr-1" /> Unsuspend</>
                            : <><ShieldOff size={14} className="mr-1" /> Suspend</>
                          }
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={currentPage} totalPages={totalPages} onChange={setPage} />
      </div>

      {editingUser && (
        <EditUserDialog
          open={!!editingUser}
          onClose={() => setEditingUser(null)}
          user={editingUser}
          isSelf={editingUser.id === currentUserId}
          onSaved={updated => {
            setUsers(prev => prev.map(u =>
              u.id === updated.id ? { ...u, ...updated } : u
            ));
            setEditingUser(null);
          }}
        />
      )}
    </div>
  );
}
