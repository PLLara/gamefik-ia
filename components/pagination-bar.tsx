"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"

interface PaginationBarProps {
  selectedCount: number
  totalCount: number
  label: string
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}

export function PaginationBar({
  selectedCount,
  totalCount,
  label,
  currentPage,
  totalPages,
  onPageChange,
}: PaginationBarProps) {
  return (
    <div className="flex items-center justify-between border-t border-border px-2 py-3">
      <span className="text-sm text-muted-foreground">
        {selectedCount} de {totalCount} {label} selecionada{selectedCount !== 1 ? "s" : ""}
      </span>
      <div className="flex items-center gap-2">
        <span className="text-sm text-foreground">
          Página {currentPage} de {totalPages}
        </span>
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="rounded-lg border border-border p-1.5 text-foreground hover:bg-sidebar-accent disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="Página anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="rounded-lg border border-border p-1.5 text-foreground hover:bg-sidebar-accent disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="Próxima página"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
