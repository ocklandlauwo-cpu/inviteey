import { redirect }    from "next/navigation";
import { getSession }  from "@/lib/auth";
import { prisma }      from "@/lib/prisma";
import { VendorDashboardClient } from "@/components/vendor/vendor-dashboard-client";

export default async function VendorDashboardPage() {
  const { user } = await getSession();
  if (!user) redirect("/login");

  const userId = parseInt(user.id, 10);

  const vendors = await prisma.vendor.findMany({
    where:   { userId, event: { deletedAt: null } },
    include: {
      event: {
        select: {
          id: true, name: true, eventDate: true,
          venueName: true, status: true, type: true,
        },
      },
    },
    orderBy: { event: { eventDate: "asc" } },
  });

  return (
    <VendorDashboardClient
      vendorName={user.name ?? "Vendor"}
      vendors={vendors.map(v => ({
        id:                 v.id,
        name:               v.name,
        category:           v.category,
        serviceDescription: v.serviceDescription,
        estimatedCost:      v.estimatedCost ? Number(v.estimatedCost) : null,
        agreedCost:         v.agreedCost    ? Number(v.agreedCost)    : null,
        currencyCode:       v.currencyCode,
        paymentStatus:      v.paymentStatus,
        deliveryStatus:     v.deliveryStatus,
        contactPhone:       v.contactPhone,
        notes:              v.notes,
        event: {
          id:        v.event.id,
          name:      v.event.name,
          eventDate: v.event.eventDate.toISOString(),
          venueName: v.event.venueName,
          status:    v.event.status,
          type:      v.event.type,
        },
      }))}
    />
  );
}
