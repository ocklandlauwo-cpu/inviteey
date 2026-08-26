"use client";

import * as React from "react";
import { Search, ChevronDown, ChevronUp, ClipboardList } from "lucide-react";
import { Input }  from "@/components/ui/input";
import { Badge }  from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pagination, PAGE_SIZE } from "@/components/ui/pagination";
import { formatDate } from "@/lib/utils";
import type { AuditOp } from "@prisma/client";

interface AuditLogRow {
  id:        string;
  tableName: string;
  recordId:  number;
  operation: AuditOp;
  oldData:   unknown;
  newData:   unknown;
  changedBy: number | null;
  changedAt: Date | string;
  user:      { id: number; name: string; email: string } | null;
}

const OPERATION_VARIANT: Record<AuditOp, "success" | "info" | "error"> = {
  INSERT: "success",
  UPDATE: "info",
  DELETE: "error",
};

const OPERATION_FILTERS: { value: "all" | AuditOp; label: string }[] = [
  { value: "all",    label: "All" },
  { value: "INSERT", label: "Insert" },
  { value: "UPDATE", label: "Update" },
  { value: "DELETE", label: "Delete" },
];

function tableLabel(tableName: string) {
  return tableName.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

export function AuditLogTable({ logs }: { logs: AuditLogRow[] }) {
  const [search, setSearch]       = React.useState("");
  const [tableFilter, setTableFilter] = React.useState<string>("all");
  const [opFilter, setOpFilter]   = React.useState<"all" | AuditOp>("all");
  const [page, setPage]           = React.useState(1);
  const [expanded, setExpanded]   = React.useState<Set<string>>(new Set());

  const tables = React.useMemo(
    () => Array.from(new Set(logs.map(l => l.tableName))).sort(),
    [logs]
  );

  const filtered = logs.filter(l => {
    const matchesTable = tableFilter === "all" || l.tableName === tableFilter;
    const matchesOp    = opFilter === "all" || l.operation === opFilter;
    const matchesSearch =
      String(l.recordId).includes(search) ||
      tableLabel(l.tableName).toLowerCase().includes(search.toLowerCase()) ||
      (l.user?.name.toLowerCase().includes(search.toLowerCase()) ?? false) ||
      (l.user?.email.toLowerCase().includes(search.toLowerCase()) ?? false);
    return matchesTable && matchesOp && matchesSearch;
  });

  const totalPages  = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged       = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  React.useEffect(() => { setPage(1); }, [search, tableFilter, opFilter]);

  function toggle(id: string) {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search by record ID, table, or user…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {OPERATION_FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setOpFilter(f.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                opFilter === f.value
                  ? "bg-amber-600 text-white"
                  : "bg-warm-50 text-gray-500 hover:bg-warm-100"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setTableFilter("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              tableFilter === "all"
                ? "bg-amber-600 text-white"
                : "bg-warm-50 text-gray-500 hover:bg-warm-100"
            }`}
          >
            All Tables
          </button>
          {tables.map(t => (
            <button
              key={t}
              onClick={() => setTableFilter(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                tableFilter === t
                  ? "bg-amber-600 text-white"
                  : "bg-warm-50 text-gray-500 hover:bg-warm-100"
              }`}
            >
              {tableLabel(t)}
            </button>
          ))}
        </div>
      </div>

      {logs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-warm-200 p-12 text-center">
          <ClipboardList size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No audit entries yet</p>
          <p className="text-sm text-gray-400 mt-1">Changes to key tables will be recorded here.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-warm-200 overflow-hidden">
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-sm text-gray-500">No entries match your filters.</div>
          ) : (
            <div className="divide-y divide-warm-50">
              {paged.map(log => {
                const isExpanded = expanded.has(log.id);
                const hasData = log.oldData != null || log.newData != null;
                return (
                  <div key={log.id}>
                    <div className="p-4 flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant={OPERATION_VARIANT[log.operation]} className="text-xs">
                            {log.operation}
                          </Badge>
                          <span className="font-semibold text-sm text-gray-900">{tableLabel(log.tableName)}</span>
                          <span className="text-xs text-gray-400">#{log.recordId}</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                          {log.user ? `${log.user.name} (${log.user.email})` : "System"}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs text-gray-400">{formatDate(log.changedAt, true)}</p>
                        {hasData && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-xs gap-1 mt-2"
                            onClick={() => toggle(log.id)}
                          >
                            Details
                            {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                          </Button>
                        )}
                      </div>
                    </div>

                    {isExpanded && hasData && (
                      <div className="bg-warm-50/40 border-t border-warm-50 px-4 py-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Before</p>
                          <pre className="text-xs bg-white border border-warm-100 rounded-lg p-2 overflow-x-auto whitespace-pre-wrap break-all">
                            {log.oldData != null ? JSON.stringify(log.oldData, null, 2) : "—"}
                          </pre>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">After</p>
                          <pre className="text-xs bg-white border border-warm-100 rounded-lg p-2 overflow-x-auto whitespace-pre-wrap break-all">
                            {log.newData != null ? JSON.stringify(log.newData, null, 2) : "—"}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          <Pagination page={currentPage} totalPages={totalPages} onChange={setPage} />
        </div>
      )}
    </div>
  );
}
