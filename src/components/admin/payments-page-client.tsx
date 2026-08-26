"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, CreditCard } from "lucide-react";
import { CreateInvoiceDialog }    from "@/components/admin/create-invoice-dialog";
import { InvoicesTable }          from "@/components/admin/invoices-table";
import { PlatformPaymentsTable }  from "@/components/admin/platform-payments-table";
import type { OrganizerOption }   from "@/components/admin/record-platform-payment-dialog";

interface Props {
  organizers: OrganizerOption[];
}

export function PaymentsPageClient({ organizers }: Props) {
  const router = useRouter();

  function onSuccess() {
    router.refresh();
  }

  return (
    <Tabs defaultValue="invoices" className="space-y-6">
      <div className="flex items-center justify-between">
        <TabsList className="bg-warm-100">
          <TabsTrigger value="invoices" className="gap-2 data-[state=active]:bg-white">
            <FileText size={15} /> Invoices
          </TabsTrigger>
          <TabsTrigger value="payments" className="gap-2 data-[state=active]:bg-white">
            <CreditCard size={15} /> Payments
          </TabsTrigger>
        </TabsList>
        <CreateInvoiceDialog organizers={organizers} onSuccess={onSuccess} />
      </div>

      <TabsContent value="invoices" className="mt-0">
        <div className="bg-white rounded-2xl border border-warm-200 p-6">
          <h2 className="font-bold text-gray-900 mb-4">All Invoices</h2>
          <InvoicesTable organizers={organizers} />
        </div>
      </TabsContent>

      <TabsContent value="payments" className="mt-0">
        <div className="bg-white rounded-2xl border border-warm-200 p-6">
          <h2 className="font-bold text-gray-900 mb-4">Payment Records</h2>
          <p className="text-sm text-gray-400 mb-4">Payments are auto-created when an invoice is marked as paid.</p>
          <PlatformPaymentsTable organizers={organizers} />
        </div>
      </TabsContent>
    </Tabs>
  );
}
