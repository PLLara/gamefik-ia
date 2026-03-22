"use client"

import { useState, useRef, useEffect } from "react"
import { ChevronDown, Search, Check } from "lucide-react"
import { cn } from "@/lib/utils"

export interface FilterOption {
  value: string
  label: string
  description?: string
}

interface FilterDropdownProps {
  label: string
  options: FilterOption[]
  value?: string | string[]
  onChange: (value: string | string[]) => void
  multiple?: boolean
  searchable?: boolean
  searchPlaceholder?: string
  icon?: React.ReactNode
  className?: string
}

export function FilterDropdown({
  label,
  options,
  value,
  onChange,
  multiple = false,
  searchable = false,
  searchPlaceholder = "Buscar...",
  icon,
  className,
}: FilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const selectedValues = Array.isArray(value) ? value : value ? [value] : []
  
  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getDisplayLabel = () => {
    if (selectedValues.length === 0) return label
    if (selectedValues.length === 1) {
      const opt = options.find((o) => o.value === selectedValues[0])
      return opt?.label || label
    }
    return `${selectedValues.length} selecionados`
  }

  const handleSelect = (optionValue: string) => {
    if (multiple) {
      const newValues = selectedValues.includes(optionValue)
        ? selectedValues.filter((v) => v !== optionValue)
        : [...selectedValues, optionValue]
      onChange(newValues)
    } else {
      onChange(optionValue)
      setIsOpen(false)
    }
  }

  const isSelected = (optionValue: string) => selectedValues.includes(optionValue)

  return (
    <div ref={dropdownRef} className={cn("relative", className)}>
      {/* Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors",
          selectedValues.length > 0
            ? "border-primary/50 bg-primary/5 text-foreground"
            : "border-border bg-card text-foreground hover:bg-sidebar-accent"
        )}
      >
        {icon}
        <span className="font-medium">{getDisplayLabel()}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-muted-foreground transition-transform",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-1.5 min-w-[220px] rounded-xl border border-border bg-popover p-1.5 shadow-lg">
          {/* Search Input */}
          {searchable && (
            <div className="relative mb-1.5">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full rounded-lg border border-border bg-background py-2 pl-8 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-1 focus:ring-ring/30"
                autoFocus
              />
            </div>
          )}

          {/* Options List */}
          <div className="max-h-[240px] overflow-auto">
            {filteredOptions.length === 0 ? (
              <p className="px-3 py-2 text-center text-sm text-muted-foreground">
                Nenhum resultado
              </p>
            ) : (
              filteredOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleSelect(option.value)}
                  className={cn(
                    "flex w-full items-start gap-2 rounded-lg px-3 py-2 text-left transition-colors",
                    isSelected(option.value)
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  {multiple && (
                    <div
                      className={cn(
                        "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
                        isSelected(option.value)
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-muted-foreground/30"
                      )}
                    >
                      {isSelected(option.value) && <Check className="h-3 w-3" />}
                    </div>
                  )}
                  <div className="flex-1">
                    <p className={cn(
                      "text-sm",
                      isSelected(option.value) ? "font-medium" : "font-normal"
                    )}>
                      {option.label}
                    </p>
                    {option.description && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {option.description}
                      </p>
                    )}
                  </div>
                  {!multiple && isSelected(option.value) && (
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  )}
                </button>
              ))
            )}
          </div>

          {/* Clear Button for Multiple */}
          {multiple && selectedValues.length > 0 && (
            <div className="mt-1.5 border-t border-border pt-1.5">
              <button
                onClick={() => onChange([])}
                className="w-full rounded-lg px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-sidebar-accent"
              >
                Limpar selecao
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
