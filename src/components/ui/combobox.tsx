"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface ComboboxOption {
  value: string;
  label: string;
}

interface Props {
  options:           ComboboxOption[];
  value:             string;
  onChange:          (value: string) => void;
  placeholder?:      string;
  searchPlaceholder?: string;
  emptyText?:        string;
}

export function Combobox({
  options, value, onChange,
  placeholder = "Select…", searchPlaceholder = "Search…", emptyText = "No results found.",
}: Props) {
  const [open, setOpen]     = React.useState(false);
  const [search, setSearch] = React.useState("");

  const selected = options.find(o => o.value === value);
  const filtered = options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()));

  return (
    <Popover open={open} onOpenChange={o => { setOpen(o); if (!o) setSearch(""); }}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex h-10 w-full items-center justify-between rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
            !selected && "text-muted-foreground"
          )}
        >
          {selected ? selected.label : placeholder}
          <ChevronsUpDown size={14} className="opacity-50 shrink-0 ml-2" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <div className="p-2 border-b border-warm-100">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="pl-8 h-8 text-sm"
            />
          </div>
        </div>
        <div className="max-h-60 overflow-y-auto p-1">
          {filtered.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-4">{emptyText}</p>
          ) : (
            filtered.map(option => (
              <button
                key={option.value}
                type="button"
                onClick={() => { onChange(option.value); setOpen(false); setSearch(""); }}
                className={cn(
                  "flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-sm text-left hover:bg-warm-50 transition-colors",
                  option.value === value && "bg-amber-50"
                )}
              >
                {option.label}
                {option.value === value && <Check size={14} className="text-amber-600" />}
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
