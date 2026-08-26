import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { DashboardSidebar } from "@/components/layout/sidebar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user } = await getSession();
  if (!user) redirect("/login");
  if (user.role === "admin")  redirect("/admin/dashboard");
  if (user.role === "vendor") redirect("/vendor/dashboard");

  return (
    <div className="flex min-h-screen bg-warm-50">
      <DashboardSidebar user={user} />
      <main id="main-content" className="flex-1 min-w-0 lg:pl-64">
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
