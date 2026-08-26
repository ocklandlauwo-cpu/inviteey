"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  page:       number;
  totalPages: number;
  onChange:   (page: number) => void;
}

export function Pagination({ page, totalPages, onChange }: Props) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-warm-100">
      <p className="text-xs text-gray-500">
        Page {page} of {totalPages}
      </p>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          className="h-8 px-2 gap-1 text-xs"
          onClick={() => onChange(Math.max(1, page - 1))}
          disabled={page === 1}
        >
          <ChevronLeft size={14} /> Prev
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-8 px-2 gap-1 text-xs"
          onClick={() => onChange(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
        >
          Next <ChevronRight size={14} />
        </Button>
      </div>
    </div>
  );
}

export const PAGE_SIZE = 20;
