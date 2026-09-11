"use client";

import * as React from "react";
import {
  MessageCircle, Plus, Loader2, Trash2, ToggleLeft, ToggleRight, X, Pencil, ImageIcon,
} from "lucide-react";
import { Badge }   from "@/components/ui/badge";
import { Button }  from "@/components/ui/button";
import { Input }   from "@/components/ui/input";
import { Label }   from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";

interface WhatsappTemplate {
  id:             number;
  name:           string;
  wid:            string;
  hasImageHeader: boolean;
  isActive:       boolean;
  createdAt:      string;
}

export default function AdminWhatsappTemplatesPage() {
  const { toast } = useToast();
  const [templates,  setTemplates]  = React.useState<WhatsappTemplate[]>([]);
  const [loading,    setLoading]    = React.useState(true);
  const [showForm,   setShowForm]   = React.useState(false);
  const [saving,     setSaving]     = React.useState(false);
  const [togglingId, setTogglingId] = React.useState<number | null>(null);
  const [deletingId, setDeletingId] = React.useState<number | null>(null);
  const [editingId,  setEditingId]  = React.useState<number | null>(null);
  const [form, setForm] = React.useState({ name: "", wid: "", hasImageHeader: false });

  async function load() {
    setLoading(true);
    try {
      const res  = await fetch("/api/v1/admin/whatsapp-templates");
      const json = await res.json();
      if (res.ok) setTemplates(json.data);
    } finally { setLoading(false); }
  }

  React.useEffect(() => { load(); }, []);

  function resetForm() {
    setShowForm(false);
    setEditingId(null);
    setForm({ name: "", wid: "", hasImageHeader: false });
  }

  function startEdit(tpl: WhatsappTemplate) {
    setEditingId(tpl.id);
    setForm({ name: tpl.name, wid: tpl.wid, hasImageHeader: tpl.hasImageHeader });
    setShowForm(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { toast({ title: "Name is required", variant: "destructive" }); return; }
    if (!form.wid.trim())  { toast({ title: "Template ID (wid) is required", variant: "destructive" }); return; }

    setSaving(true);
    try {
      const url    = editingId ? `/api/v1/admin/whatsapp-templates/${editingId}` : "/api/v1/admin/whatsapp-templates";
      const method = editingId ? "PATCH" : "POST";
      const res    = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ name: form.name.trim(), wid: form.wid.trim(), hasImageHeader: form.hasImageHeader }),
      });
      const json = await res.json();
      if (!res.ok) { toast({ title: editingId ? "Update failed" : "Save failed", description: json.error, variant: "destructive" }); return; }
      toast({ title: editingId ? "Template updated" : "Template registered" });
      resetForm();
      await load();
    } catch {
      toast({ title: "Something went wrong", variant: "destructive" });
    } finally { setSaving(false); }
  }

  async function toggleActive(tpl: WhatsappTemplate) {
    setTogglingId(tpl.id);
    try {
      const res  = await fetch(`/api/v1/admin/whatsapp-templates/${tpl.id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ isActive: !tpl.isActive }),
      });
      const json = await res.json();
      if (!res.ok) { toast({ title: json.error, variant: "destructive" }); return; }
      setTemplates(prev => prev.map(t => t.id === tpl.id ? { ...t, isActive: !tpl.isActive } : t));
    } catch {
      toast({ title: "Something went wrong", variant: "destructive" });
    } finally { setTogglingId(null); }
  }

  async function handleDelete(tpl: WhatsappTemplate) {
    if (!confirm(`Remove template "${tpl.name}"? This cannot be undone.`)) return;
    setDeletingId(tpl.id);
    try {
      const res = await fetch(`/api/v1/admin/whatsapp-templates/${tpl.id}`, { method: "DELETE" });
      if (!res.ok) { toast({ title: "Delete failed", variant: "destructive" }); return; }
      setTemplates(prev => prev.filter(t => t.id !== tpl.id));
      toast({ title: "Template removed" });
    } catch {
      toast({ title: "Something went wrong", variant: "destructive" });
    } finally { setDeletingId(null); }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">WhatsApp Templates</h1>
          <p className="text-gray-500 text-sm mt-1">
            Register AuthKey.io templates so they can be picked when sending invitations via WhatsApp.
          </p>
        </div>
        <Button
          className="bg-amber-600 hover:bg-amber-700 text-white gap-2"
          onClick={() => (showForm ? resetForm() : setShowForm(true))}
        >
          {showForm ? <X size={15} /> : <Plus size={15} />}
          {showForm ? "Cancel" : "Register Template"}
        </Button>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 text-sm text-amber-800">
        AuthKey.io has no API to list templates, so register each approved template here manually —
        copy its <strong>Template ID</strong> from the AuthKey dashboard (Templates list). The
        template must have exactly <strong>one body variable ({"{{1}}"})</strong>: the full
        pre-formatted invitation text is sent through as that variable. Check &quot;Has image
        header&quot; only if the template was built with an image header block (used to attach the
        e-card).
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl border border-warm-200 p-6">
          <h2 className="font-bold text-gray-900 mb-5">{editingId ? "Edit Template" : "Register Template"}</h2>
          <form onSubmit={handleSave} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label>Display Name *</Label>
                <Input
                  placeholder="e.g. Wedding Invitation"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Template ID (wid) *</Label>
                <Input
                  placeholder="Copy from AuthKey dashboard"
                  value={form.wid}
                  onChange={e => setForm(f => ({ ...f, wid: e.target.value }))}
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.hasImageHeader}
                onChange={e => setForm(f => ({ ...f, hasImageHeader: e.target.checked }))}
                className="rounded"
              />
              Has image header (attach the e-card image when sending)
            </label>

            <div className="flex justify-end">
              <Button type="submit" disabled={saving} className="bg-amber-600 hover:bg-amber-700 text-white gap-2">
                {saving ? <Loader2 size={14} className="animate-spin" /> : editingId ? <Pencil size={14} /> : <Plus size={14} />}
                {editingId ? "Save Changes" : "Register Template"}
              </Button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 size={24} className="animate-spin text-amber-600" />
        </div>
      ) : templates.length === 0 ? (
        <div className="bg-white rounded-2xl border border-warm-200 p-16 text-center">
          <MessageCircle size={36} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No WhatsApp templates registered yet</p>
          <p className="text-sm text-gray-400 mt-1">Register your first AuthKey.io template above.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-warm-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-warm-100 bg-warm-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Template ID</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Image Header</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody>
                {templates.map(tpl => (
                  <tr key={tpl.id} className="border-b border-warm-50 hover:bg-warm-50/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">{tpl.name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{tpl.wid}</td>
                    <td className="px-4 py-3">
                      {tpl.hasImageHeader
                        ? <Badge variant="outline" className="text-xs gap-1"><ImageIcon size={10} /> Yes</Badge>
                        : <span className="text-xs text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={tpl.isActive ? "success" : "outline"} className="text-xs">
                        {tpl.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 justify-end">
                        <button
                          title="Edit"
                          onClick={() => startEdit(tpl)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          title={tpl.isActive ? "Deactivate" : "Activate"}
                          disabled={togglingId === tpl.id}
                          onClick={() => toggleActive(tpl)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors disabled:opacity-40"
                        >
                          {togglingId === tpl.id
                            ? <Loader2 size={14} className="animate-spin" />
                            : tpl.isActive ? <ToggleLeft size={14} /> : <ToggleRight size={14} />}
                        </button>
                        <button
                          title="Delete"
                          disabled={deletingId === tpl.id}
                          onClick={() => handleDelete(tpl)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40"
                        >
                          {deletingId === tpl.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
