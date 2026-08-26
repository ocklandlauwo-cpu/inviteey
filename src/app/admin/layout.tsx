import { redirect } from "next/navigation";
import Link         from "next/link";
import { getSession } from "@/lib/auth";
import { AdminSidebar } from "@/components/admin/admin-sidebar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = await getSession();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/events");

  return (
    <div className="flex min-h-screen bg-warm-50">
      <AdminSidebar user={user} />
      <main id="main-content" className="flex-1 min-w-0 lg:pl-64">
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
