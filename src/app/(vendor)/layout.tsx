import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Package } from "lucide-react";
import { VendorNav } from "@/components/vendor/vendor-nav";

export default async function VendorLayout({ children }: { children: React.ReactNode }) {
  const { user } = await getSession();
  if (!user) redirect("/login");
  if (user.role !== "vendor") redirect("/events");

  return (
    <div className="min-h-screen bg-warm-50">
      <VendorNav name={user.name} />
      <main className="max-w-4xl mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
}
