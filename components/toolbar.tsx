"use client"

import { Search, MousePointerClick } from "lucide-react"
import { cn } from "@/lib/utils"

interface ToolbarProps {
  searchQuery: string
  onSearchChange: (value: string) => void
  sortOrder: string
  onSortChange: (value: string) => void
  allSelected: boolean
  onSelectAll: () => void
  selectionMode?: boolean
  onToggleSelectionMode?: () => void
  children?: React.ReactNode
}

export function Toolbar({
  searchQuery,
  onSearchChange,
  sortOrder,
  onSortChange,
  allSelected,
  onSelectAll,
  selectionMode = false,
  onToggleSelectionMode,
  children,
}: ToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Pesquisar por nome..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-[180px] border-0 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
        />
      </div>

      <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
        <span className="text-sm text-foreground">Ordenar por:</span>
        <select
          value={sortOrder}
          onChange={(e) => onSortChange(e.target.value)}
          className="border-0 bg-transparent text-sm font-medium text-foreground outline-none cursor-pointer"
        >
          <option value="asc">A-Z</option>
          <option value="desc">Z-A</option>
        </select>
      </div>

      {onToggleSelectionMode && (
        <button
          onClick={onToggleSelectionMode}
          className={cn(
            "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
            selectionMode
              ? "border-primary bg-primary/10 text-primary"
              : "border-border bg-card text-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          )}
        >
          <MousePointerClick className="h-4 w-4" />
          Selecionar
        </button>
      )}

      {selectionMode && (
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={onSelectAll}
            className="h-4 w-4 rounded border-border accent-primary"
          />
          <span className="text-sm text-foreground">Selecionar todos</span>
        </label>
      )}

      <div className="ml-auto flex items-center gap-2">
        {children}
      </div>
    </div>
  )
}
