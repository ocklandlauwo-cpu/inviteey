"use client";

import * as React from "react";
import { Search } from "lucide-react";
import { Input }    from "@/components/ui/input";
import { Button }   from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Pagination, PAGE_SIZE } from "@/components/ui/pagination";

export interface InviteeOption {
  id:    number;
  name:  string;
  phone: string | null;
}

interface Props {
  open:        boolean;
  onClose:     () => void;
  invitees:    InviteeOption[];
  selectedIds: number[];
  onConfirm:   (ids: number[]) => void;
}

export function InviteeSelectDialog({ open, onClose, invitees, selectedIds, onConfirm }: Props) {
  const [search, setSearch] = React.useState("");
  const [page, setPage]     = React.useState(1);
  const [selected, setSelected] = React.useState<Set<number>>(new Set(selectedIds));

  React.useEffect(() => {
    if (open) {
      setSelected(new Set(selectedIds));
      setSearch("");
      setPage(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const filtered = invitees.filter(inv =>
    inv.name.toLowerCase().includes(search.toLowerCase()) ||
    (inv.phone ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const totalPages  = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged       = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  React.useEffect(() => { setPage(1); }, [search]);

  function toggle(id: number) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Recipients ({selected.size} selected)</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 mt-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search by name or phone…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>

          <div className="border border-warm-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto max-h-80 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-warm-50">
                  <tr className="border-b border-warm-100">
                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase w-10"></th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Name</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Phone</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="text-center py-8 text-sm text-gray-500">
                        No invitees match your search.
                      </td>
                    </tr>
                  ) : paged.map(inv => (
                    <tr key={inv.id} className="border-b border-warm-50 hover:bg-warm-50/50">
                      <td className="px-3 py-2">
                        <Checkbox
                          checked={selected.has(inv.id)}
                          onCheckedChange={() => toggle(inv.id)}
                        />
                      </td>
                      <td className="px-3 py-2 text-gray-900">{inv.name}</td>
                      <td className="px-3 py-2 text-gray-500">{inv.phone ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={currentPage} totalPages={totalPages} onChange={setPage} />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button
              type="button"
              className="bg-amber-600 hover:bg-amber-700 text-white"
              onClick={() => { onConfirm(Array.from(selected)); onClose(); }}
            >
              Done
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
