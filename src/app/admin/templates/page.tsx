"use client";

import * as React from "react";
import { Plus, Pencil, Trash2, Search, LayoutTemplate } from "lucide-react";
import { Button }    from "@/components/ui/button";
import { Input }     from "@/components/ui/input";
import { Badge }     from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pagination, PAGE_SIZE } from "@/components/ui/pagination";
import { useToast }  from "@/components/ui/use-toast";
import {
  TemplateDialog,
  EVENT_TYPE_LABELS,
  CHANNEL_LABELS,
  NOTIF_TYPE_LABELS,
  type NotifTemplate,
} from "@/components/admin/template-dialog";

const CHANNEL_VARIANT: Record<string, "info" | "success" | "warning"> = {
  email:    "info",
  sms:      "success",
  whatsapp: "warning",
};

export default function AdminTemplatesPage() {
  const { toast } = useToast();

  const [templates, setTemplates]   = React.useState<NotifTemplate[]>([]);
  const [loading, setLoading]       = React.useState(true);
  const [search, setSearch]         = React.useState("");
  const [channelFilter, setChannel] = React.useState("all");
  const [page, setPage]             = React.useState(1);
  const [dialog, setDialog]         = React.useState<"create" | NotifTemplate | null>(null);
  const [deleting, setDeleting]     = React.useState<number | null>(null);

  React.useEffect(() => { load(); }, []);
  React.useEffect(() => { setPage(1); }, [search, channelFilter]);

  async function load() {
    setLoading(true);
    try {
      const res  = await fetch("/api/v1/admin/templates?activeOnly=false");
      const json = await res.json();
      if (res.ok) setTemplates(json.data);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this template? This cannot be undone.")) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/v1/admin/templates/${id}`, { method: "DELETE" });
      if (res.ok) {
        setTemplates(prev => prev.filter(t => t.id !== id));
        toast({ title: "Template deleted" });
      } else {
        const json = await res.json();
        toast({ title: "Error", description: json.error, variant: "destructive" });
      }
    } finally {
      setDeleting(null);
    }
  }

  function handleSaved(saved: NotifTemplate) {
    setTemplates(prev => {
      const idx = prev.findIndex(t => t.id === saved.id);
      return idx >= 0 ? prev.map(t => t.id === saved.id ? saved : t) : [saved, ...prev];
    });
    setDialog(null);
  }

  const filtered = templates.filter(t => {
    const matchChannel = channelFilter === "all" || t.channel === channelFilter;
    const q = search.toLowerCase();
    const matchSearch = !q || t.name.toLowerCase().includes(q) || t.message.toLowerCase().includes(q);
    return matchChannel && matchSearch;
  });

  const totalPages  = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged       = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notification Templates</h1>
          <p className="text-sm text-gray-500 mt-0.5">Reusable message templates for composing notifications</p>
        </div>
        <Button onClick={() => setDialog("create")} className="gap-2">
          <Plus size={16} /> New Template
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search templates…"
            className="pl-8"
          />
        </div>
        <Select value={channelFilter} onValueChange={setChannel}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All channels</SelectItem>
            {Object.entries(CHANNEL_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-warm-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <LayoutTemplate size={32} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">No templates yet</p>
            <p className="text-sm text-gray-400 mt-1">Create reusable message templates for faster notification composing.</p>
            <Button onClick={() => setDialog("create")} className="mt-4 gap-2" size="sm">
              <Plus size={14} /> New Template
            </Button>
          </div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead className="bg-warm-50 border-b border-warm-100">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Name</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Channel</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden lg:table-cell">Type</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden lg:table-cell">Event</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden sm:table-cell">Lang</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-warm-50">
                {paged.map(t => (
                  <tr key={t.id} className="hover:bg-warm-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{t.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{t.message}</p>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <Badge variant={CHANNEL_VARIANT[t.channel] ?? "outline"} className="text-xs">
                        {CHANNEL_LABELS[t.channel] ?? t.channel}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 hidden lg:table-cell">
                      {NOTIF_TYPE_LABELS[t.type] ?? t.type}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 hidden lg:table-cell">
                      {t.eventType ? (EVENT_TYPE_LABELS[t.eventType] ?? t.eventType) : <span className="text-gray-300">Any</span>}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="text-xs font-medium text-gray-500 uppercase">{t.language}</span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={t.isActive ? "success" : "outline"} className="text-xs">
                        {t.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          onClick={() => setDialog(t)}
                          title="Edit"
                        >
                          <Pencil size={13} />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-red-500 hover:bg-red-50"
                          onClick={() => handleDelete(t.id)}
                          disabled={deleting === t.id}
                          title="Delete"
                        >
                          <Trash2 size={13} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination page={currentPage} totalPages={totalPages} onChange={setPage} />
          </>
        )}
      </div>

      {/* Dialogs */}
      {dialog === "create" && (
        <TemplateDialog onClose={() => setDialog(null)} onSaved={handleSaved} />
      )}
      {dialog && dialog !== "create" && (
        <TemplateDialog template={dialog} onClose={() => setDialog(null)} onSaved={handleSaved} />
      )}
    </div>
  );
}
