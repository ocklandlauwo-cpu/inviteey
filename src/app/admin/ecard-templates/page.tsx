"use client";

import * as React from "react";
import Image from "next/image";
import {
  ImageIcon, Plus, Loader2, Trash2, ToggleLeft, ToggleRight, X, Type, Pencil, Eye,
} from "lucide-react";
import { Badge }   from "@/components/ui/badge";
import { Button }  from "@/components/ui/button";
import { Input }   from "@/components/ui/input";
import { Label }   from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";

const EVENT_TYPE_LABELS: Record<string, string> = {
  wedding:       "Wedding",
  birthday:      "Birthday",
  sendoff:       "Sendoff",
  kitchen_party: "Kitchen Party",
  corporate:     "Corporate",
  fundraising:   "Fundraising",
  other:         "Other",
};
const EVENT_TYPES = Object.keys(EVENT_TYPE_LABELS);

const FIELD_KEY_LABELS: Record<string, string> = {
  inviteeName: "Invitee Name",
  eventTitle:  "Event Title",
  date:        "Event Date",
  venue:       "Venue Name",
  category:    "Guest Category",
  custom:      "Custom Text",
};
const FIELD_KEYS = Object.keys(FIELD_KEY_LABELS);

interface TextFieldEntry {
  id:          string;
  key:         "inviteeName" | "eventTitle" | "date" | "venue" | "category" | "custom";
  staticValue: string;
  x:           string;
  y:           string;
  fontSize:    string;
  color:       string;
  bold:        boolean;
  align:       "left" | "center" | "right";
}

interface EcardTemplate {
  id:            number;
  name:          string;
  eventType:     string;
  imagePath:     string;
  thumbnailPath: string | null;
  qrPosition:    { x: number; y: number; size: number } | null;
  qrEnabled:     boolean;
  textFields:    unknown[] | null;
  isActive:      boolean;
  createdAt:     string;
}

export default function AdminEcardTemplatesPage() {
  const { toast } = useToast();
  const [templates,   setTemplates]   = React.useState<EcardTemplate[]>([]);
  const [loading,     setLoading]     = React.useState(true);
  const [showForm,    setShowForm]    = React.useState(false);
  const [togglingId,  setTogglingId]  = React.useState<number | null>(null);
  const [deletingId,  setDeletingId]  = React.useState<number | null>(null);
  const [uploading,   setUploading]   = React.useState(false);
  const [textFields,  setTextFields]  = React.useState<TextFieldEntry[]>([]);
  const [editingId,   setEditingId]   = React.useState<number | null>(null);
  const [previewUrl,     setPreviewUrl]     = React.useState<string | null>(null);
  const [previewingId,   setPreviewingId]   = React.useState<number | null>(null);

  const fileRef   = React.useRef<HTMLInputElement>(null);
  const [preview, setPreview] = React.useState<string | null>(null);
  const [form, setForm] = React.useState({
    name: "", eventType: "wedding", qrX: "650", qrY: "550", qrSize: "180", qrEnabled: true,
  });

  async function load() {
    setLoading(true);
    try {
      const res  = await fetch("/api/v1/admin/ecard-templates");
      const json = await res.json();
      if (res.ok) setTemplates(json.data);
    } finally { setLoading(false); }
  }

  React.useEffect(() => { load(); }, []);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setPreview(URL.createObjectURL(f));
  }

  function addTextField() {
    setTextFields(prev => [...prev, {
      id:          `f_${Date.now()}`,
      key:         "inviteeName",
      staticValue: "",
      x:           "400",
      y:           "200",
      fontSize:    "28",
      color:       "#ffffff",
      bold:        true,
      align:       "center",
    }]);
  }

  function updateTextField(id: string, patch: Partial<TextFieldEntry>) {
    setTextFields(prev => prev.map(f => f.id === id ? { ...f, ...patch } : f));
  }

  function removeTextField(id: string) {
    setTextFields(prev => prev.filter(f => f.id !== id));
  }

  function resetForm() {
    setShowForm(false);
    setEditingId(null);
    setForm({ name: "", eventType: "wedding", qrX: "650", qrY: "550", qrSize: "180", qrEnabled: true });
    setTextFields([]);
    setPreview(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function startEdit(tpl: EcardTemplate) {
    setEditingId(tpl.id);
    setForm({
      name:      tpl.name,
      eventType: tpl.eventType,
      qrX:       String(tpl.qrPosition?.x    ?? 650),
      qrY:       String(tpl.qrPosition?.y    ?? 550),
      qrSize:    String(tpl.qrPosition?.size ?? 180),
      qrEnabled: tpl.qrEnabled ?? true,
    });
    const existing = (tpl.textFields as Partial<TextFieldEntry>[] | null) ?? [];
    setTextFields(existing.map((f, i) => ({
      id:          `existing_${tpl.id}_${i}`,
      key:         f.key ?? "inviteeName",
      staticValue: f.staticValue ?? "",
      x:           String(f.x ?? 400),
      y:           String(f.y ?? 200),
      fontSize:    String(f.fontSize ?? 28),
      color:       f.color ?? "#ffffff",
      bold:        f.bold ?? true,
      align:       f.align ?? "center",
    })));
    setPreview(null);
    setShowForm(true);
  }

  function buildTextFieldsPayload() {
    return textFields.map(({ id: _id, ...f }) => ({
      key:  f.key,
      ...(f.key === "custom" ? { staticValue: f.staticValue } : {}),
      x:        parseInt(f.x, 10)        || 0,
      y:        parseInt(f.y, 10)        || 0,
      fontSize: parseInt(f.fontSize, 10) || 24,
      color:    f.color || "#ffffff",
      bold:     f.bold,
      align:    f.align,
    }));
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { toast({ title: "Name is required", variant: "destructive" }); return; }

    setUploading(true);
    try {
      if (editingId) {
        const res  = await fetch(`/api/v1/admin/ecard-templates/${editingId}`, {
          method:  "PATCH",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({
            name:       form.name,
            eventType:  form.eventType,
            qrX:        parseInt(form.qrX, 10)    || 0,
            qrY:        parseInt(form.qrY, 10)    || 0,
            qrSize:     parseInt(form.qrSize, 10) || 0,
            qrEnabled:  form.qrEnabled,
            textFields: buildTextFieldsPayload(),
          }),
        });
        const json = await res.json();
        if (!res.ok) { toast({ title: "Update failed", description: json.error, variant: "destructive" }); return; }
        toast({ title: "Template updated" });
      } else {
        const file = fileRef.current?.files?.[0];
        if (!file) { toast({ title: "Select an image file", variant: "destructive" }); return; }

        const fd = new FormData();
        fd.append("image",      file);
        fd.append("name",       form.name);
        fd.append("eventType",  form.eventType);
        fd.append("qrX",        form.qrX);
        fd.append("qrY",        form.qrY);
        fd.append("qrSize",     form.qrSize);
        fd.append("qrEnabled",  String(form.qrEnabled));
        fd.append("textFields", JSON.stringify(buildTextFieldsPayload()));

        const res  = await fetch("/api/v1/admin/ecard-templates", { method: "POST", body: fd });
        const json = await res.json();
        if (!res.ok) { toast({ title: "Upload failed", description: json.error, variant: "destructive" }); return; }
        toast({ title: "Template uploaded" });
      }
      resetForm();
      await load();
    } catch {
      toast({ title: "Something went wrong", variant: "destructive" });
    } finally { setUploading(false); }
  }

  async function handlePreview(tpl: EcardTemplate) {
    setPreviewingId(tpl.id);
    try {
      const res = await fetch(`/api/v1/admin/ecard-templates/${tpl.id}/preview`, { method: "POST" });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        toast({ title: "Preview failed", description: json.error, variant: "destructive" });
        return;
      }
      const blob = await res.blob();
      setPreviewUrl(URL.createObjectURL(blob));
    } catch {
      toast({ title: "Something went wrong", variant: "destructive" });
    } finally { setPreviewingId(null); }
  }

  async function toggleActive(tpl: EcardTemplate) {
    setTogglingId(tpl.id);
    try {
      const res  = await fetch(`/api/v1/admin/ecard-templates/${tpl.id}`, {
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

  async function handleDelete(tpl: EcardTemplate) {
    if (!confirm(`Delete template "${tpl.name}"? This cannot be undone.`)) return;
    setDeletingId(tpl.id);
    try {
      const res = await fetch(`/api/v1/admin/ecard-templates/${tpl.id}`, { method: "DELETE" });
      if (!res.ok) { toast({ title: "Delete failed", variant: "destructive" }); return; }
      setTemplates(prev => prev.filter(t => t.id !== tpl.id));
      toast({ title: "Template deleted" });
    } catch {
      toast({ title: "Something went wrong", variant: "destructive" });
    } finally { setDeletingId(null); }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">E-card Templates</h1>
          <p className="text-gray-500 text-sm mt-1">Upload and manage invitation card templates per event type</p>
        </div>
        <Button
          className="bg-amber-600 hover:bg-amber-700 text-white gap-2"
          onClick={() => (showForm ? resetForm() : setShowForm(true))}
        >
          {showForm ? <X size={15} /> : <Plus size={15} />}
          {showForm ? "Cancel" : "Upload Template"}
        </Button>
      </div>

      {/* Upload / edit form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-warm-200 p-6">
          <h2 className="font-bold text-gray-900 mb-5">{editingId ? "Edit Template" : "New Template"}</h2>
          <form onSubmit={handleUpload} className="space-y-6">

            {/* Name + Event Type */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label>Template Name *</Label>
                <Input
                  placeholder="e.g. Classic Gold Wedding"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Event Type *</Label>
                <Select value={form.eventType} onValueChange={v => setForm(f => ({ ...f, eventType: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EVENT_TYPES.map(t => (
                      <SelectItem key={t} value={t}>{EVENT_TYPE_LABELS[t]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Image upload */}
            {!editingId && (
              <div className="space-y-2">
                <Label>
                  Template Image *{" "}
                  <span className="text-gray-400 font-normal text-xs">(JPG, PNG or WebP — text overlays and QR will be composited at generation)</span>
                </Label>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp"
                  onChange={handleFileChange}
                  className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100"
                />
                {preview && (
                  <div className="relative w-32 h-40 rounded-xl overflow-hidden border border-warm-200 mt-2">
                    <Image src={preview} alt="Preview" fill className="object-cover" />
                  </div>
                )}
              </div>
            )}
            {editingId && (
              <p className="text-xs text-gray-400 bg-warm-50 rounded-xl px-4 py-3">
                The template image itself can't be changed here — delete and re-upload to replace the artwork. You can freely edit name, event type, QR position, and text overlays below.
              </p>
            )}

            {/* QR code toggle + position */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.qrEnabled}
                  onChange={e => setForm(f => ({ ...f, qrEnabled: e.target.checked }))}
                  className="rounded"
                />
                Include QR code on this template
              </label>

              {form.qrEnabled && (
                <div className="space-y-2">
                  <Label>QR Code Position <span className="text-gray-400 font-normal text-xs">(pixels from top-left of the template image)</span></Label>
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 w-8">X</span>
                      <Input type="number" className="w-24" value={form.qrX} onChange={e => setForm(f => ({ ...f, qrX: e.target.value }))} />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 w-8">Y</span>
                      <Input type="number" className="w-24" value={form.qrY} onChange={e => setForm(f => ({ ...f, qrY: e.target.value }))} />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 w-10">Size</span>
                      <Input type="number" className="w-24" value={form.qrSize} onChange={e => setForm(f => ({ ...f, qrSize: e.target.value }))} />
                    </div>
                  </div>
                  <p className="text-xs text-gray-400">Default: X=650 Y=550 Size=180. Open the template image in an editor to find the exact pixel coordinates.</p>
                </div>
              )}
            </div>

            {/* Text overlays */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Type size={14} className="text-amber-600" />
                  Text Overlays
                  <span className="text-gray-400 font-normal text-xs">(dynamic text composited onto the card at generation time)</span>
                </Label>
                <button
                  type="button"
                  onClick={addTextField}
                  className="text-xs flex items-center gap-1 text-amber-700 hover:text-amber-800 font-semibold px-2 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 transition-colors"
                >
                  <Plus size={12} /> Add Field
                </button>
              </div>

              {textFields.length === 0 ? (
                <p className="text-xs text-gray-400 italic bg-warm-50 rounded-xl px-4 py-3">
                  No overlays defined — the invitee name will be placed at a default position (top of image). Add fields to control placement precisely.
                </p>
              ) : (
                <div className="space-y-2">
                  {textFields.map((field, idx) => (
                    <div key={field.id} className="bg-warm-50 border border-warm-100 rounded-xl p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Overlay {idx + 1}</span>
                        <button type="button" onClick={() => removeTextField(field.id)} className="text-red-400 hover:text-red-600 p-0.5">
                          <Trash2 size={12} />
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-2 items-center">
                        {/* Data source */}
                        <Select
                          value={field.key}
                          onValueChange={v => updateTextField(field.id, { key: v as TextFieldEntry["key"] })}
                        >
                          <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {FIELD_KEYS.map(k => (
                              <SelectItem key={k} value={k} className="text-xs">{FIELD_KEY_LABELS[k]}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {/* Custom text value (only for "custom" type) */}
                        {field.key === "custom" && (
                          <Input
                            placeholder="Text value…"
                            value={field.staticValue}
                            onChange={e => updateTextField(field.id, { staticValue: e.target.value })}
                            className="h-8 w-40 text-xs"
                          />
                        )}

                        {/* X position */}
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-gray-400 font-medium">X</span>
                          <Input
                            type="number"
                            value={field.x}
                            onChange={e => updateTextField(field.id, { x: e.target.value })}
                            className="h-8 w-20 text-xs"
                          />
                        </div>

                        {/* Y position */}
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-gray-400 font-medium">Y</span>
                          <Input
                            type="number"
                            value={field.y}
                            onChange={e => updateTextField(field.id, { y: e.target.value })}
                            className="h-8 w-20 text-xs"
                          />
                        </div>

                        {/* Font size */}
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-gray-400 font-medium">Size</span>
                          <Input
                            type="number"
                            value={field.fontSize}
                            onChange={e => updateTextField(field.id, { fontSize: e.target.value })}
                            className="h-8 w-16 text-xs"
                          />
                        </div>

                        {/* Color picker */}
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-gray-400 font-medium">Color</span>
                          <input
                            type="color"
                            value={field.color}
                            onChange={e => updateTextField(field.id, { color: e.target.value })}
                            title="Text color"
                            className="h-8 w-8 rounded-md cursor-pointer border border-warm-200 p-0.5"
                          />
                        </div>

                        {/* Align */}
                        <Select
                          value={field.align}
                          onValueChange={v => updateTextField(field.id, { align: v as TextFieldEntry["align"] })}
                        >
                          <SelectTrigger className="h-8 w-24 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="left"   className="text-xs">Left</SelectItem>
                            <SelectItem value="center" className="text-xs">Center</SelectItem>
                            <SelectItem value="right"  className="text-xs">Right</SelectItem>
                          </SelectContent>
                        </Select>

                        {/* Bold */}
                        <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={field.bold}
                            onChange={e => updateTextField(field.id, { bold: e.target.checked })}
                            className="rounded"
                          />
                          Bold
                        </label>
                      </div>

                      <p className="text-[10px] text-gray-400">
                        {FIELD_KEY_LABELS[field.key]} — placed at ({field.x}, {field.y}), size {field.fontSize}px
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={uploading}
                className="bg-amber-600 hover:bg-amber-700 text-white gap-2"
              >
                {uploading ? <Loader2 size={14} className="animate-spin" /> : editingId ? <Pencil size={14} /> : <Plus size={14} />}
                {editingId ? "Save Changes" : "Upload Template"}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Template grid */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 size={24} className="animate-spin text-amber-600" />
        </div>
      ) : templates.length === 0 ? (
        <div className="bg-white rounded-2xl border border-warm-200 p-16 text-center">
          <ImageIcon size={36} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No templates yet</p>
          <p className="text-sm text-gray-400 mt-1">Upload your first e-card template above.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {templates.map(tpl => (
            <div key={tpl.id} className="bg-white rounded-2xl border border-warm-200 overflow-hidden">
              {/* Thumbnail */}
              <div className="relative aspect-[4/5] bg-warm-50">
                {tpl.thumbnailPath ? (
                  <Image
                    src={`/uploads/templates/${tpl.thumbnailPath}`}
                    alt={tpl.name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon size={28} className="text-gray-300" />
                  </div>
                )}
                {!tpl.isActive && (
                  <div className="absolute inset-0 bg-gray-900/40 flex items-center justify-center">
                    <span className="bg-white/90 text-gray-700 text-xs font-semibold px-2 py-1 rounded-lg">Inactive</span>
                  </div>
                )}
              </div>

              {/* Meta */}
              <div className="p-3 space-y-2">
                <p className="font-semibold text-gray-900 text-sm truncate">{tpl.name}</p>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Badge variant="outline" className="text-xs">{EVENT_TYPE_LABELS[tpl.eventType] ?? tpl.eventType}</Badge>
                  <Badge variant={tpl.isActive ? "success" : "outline"} className="text-xs">
                    {tpl.isActive ? "Active" : "Inactive"}
                  </Badge>
                  {Array.isArray(tpl.textFields) && tpl.textFields.length > 0 && (
                    <Badge variant="outline" className="text-xs gap-1">
                      <Type size={9} />
                      {tpl.textFields.length} overlay{tpl.textFields.length !== 1 ? "s" : ""}
                    </Badge>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 pt-1">
                  <button
                    title="Preview with sample data"
                    disabled={previewingId === tpl.id}
                    onClick={() => handlePreview(tpl)}
                    className="flex items-center justify-center gap-1 text-xs py-1.5 px-2 rounded-lg border border-warm-200 text-gray-600 hover:border-amber-300 hover:text-amber-700 transition-colors disabled:opacity-50"
                  >
                    {previewingId === tpl.id ? <Loader2 size={12} className="animate-spin" /> : <Eye size={12} />}
                  </button>
                  <button
                    title="Edit template"
                    onClick={() => startEdit(tpl)}
                    className="flex items-center justify-center gap-1 text-xs py-1.5 px-2 rounded-lg border border-warm-200 text-gray-600 hover:border-amber-300 hover:text-amber-700 transition-colors"
                  >
                    <Pencil size={12} />
                  </button>
                  <button
                    title={tpl.isActive ? "Deactivate" : "Activate"}
                    disabled={togglingId === tpl.id}
                    onClick={() => toggleActive(tpl)}
                    className="flex-1 flex items-center justify-center gap-1 text-xs py-1.5 rounded-lg border border-warm-200 text-gray-600 hover:border-amber-300 hover:text-amber-700 transition-colors disabled:opacity-50"
                  >
                    {togglingId === tpl.id
                      ? <Loader2 size={12} className="animate-spin" />
                      : tpl.isActive ? <ToggleLeft size={13} /> : <ToggleRight size={13} />}
                    {tpl.isActive ? "Deactivate" : "Activate"}
                  </button>
                  <button
                    title="Delete template"
                    disabled={deletingId === tpl.id}
                    onClick={() => handleDelete(tpl)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    {deletingId === tpl.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preview modal */}
      {previewUrl && (
        <div
          className="fixed inset-0 z-50 bg-gray-900/70 flex items-center justify-center p-6"
          onClick={() => { URL.revokeObjectURL(previewUrl); setPreviewUrl(null); }}
        >
          <div className="relative max-w-md w-full" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => { URL.revokeObjectURL(previewUrl); setPreviewUrl(null); }}
              className="absolute -top-10 right-0 text-white/80 hover:text-white flex items-center gap-1 text-sm"
            >
              <X size={16} /> Close
            </button>
            <img src={previewUrl} alt="Template preview" className="w-full rounded-2xl shadow-2xl" />
            <p className="text-center text-white/60 text-xs mt-3">
              Preview with sample data — "John Doe", today's date, sample venue
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
