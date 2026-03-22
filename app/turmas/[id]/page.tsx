"use client"

import { useState, useMemo, use } from "react"
import Link from "next/link"
import {
  ChevronDown,
  Pencil,
  Link2,
  MoreVertical,
  Zap,
  ArrowRight,
  Trash2,
  KeyRound,
  Smartphone,
} from "lucide-react"
import { gerarTurmas, gerarAlunos } from "@/lib/data"
import { Toolbar } from "@/components/toolbar"
import { PaginationBar } from "@/components/pagination-bar"
import { AlunoCard, NovoAlunoCard } from "@/components/aluno-card"
import { LancarModal } from "@/components/lancar-modal"
import { NovoAlunoModal } from "@/components/novo-aluno-modal"
import { EditarTurmaModal } from "@/components/editar-turma-modal"
import { EditarAlunoModal } from "@/components/editar-aluno-modal"
import { VerAlunoModal } from "@/components/ver-aluno-modal"
import { MoverAlunosModal } from "@/components/mover-alunos-modal"
import { ImportarAlunosModal } from "@/components/importar-alunos-modal"
import type { Aluno } from "@/lib/data"
import { cn } from "@/lib/utils"

const ITEMS_PER_PAGE = 32

const allTurmas = gerarTurmas()

export default function TurmaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)

  const turma = allTurmas.find((t) => t.id === id) ?? allTurmas[0]
  const [alunos] = useState(() => gerarAlunos(turma.id, turma.nome))

  const [searchQuery, setSearchQuery] = useState("")
  const [sortOrder, setSortOrder] = useState("asc")
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [currentPage, setCurrentPage] = useState(1)
  const [activeTab, setActiveTab] = useState<"lancamentos" | "atividades" | "comunicacao">("lancamentos")
  const [showActionsMenu, setShowActionsMenu] = useState(false)
  const [showTurmaDropdown, setShowTurmaDropdown] = useState(false)
  const [showCopyTooltip, setShowCopyTooltip] = useState(false)
  const [showLancarModal, setShowLancarModal] = useState(false)
  const [showNovoAlunoModal, setShowNovoAlunoModal] = useState(false)
  const [showEditarTurmaModal, setShowEditarTurmaModal] = useState(false)
  const [alunoParaEditar, setAlunoParaEditar] = useState<Aluno | null>(null)
  const [alunoParaVer, setAlunoParaVer] = useState<Aluno | null>(null)
  const [showMoverAlunosModal, setShowMoverAlunosModal] = useState(false)
  const [showImportarAlunosModal, setShowImportarAlunosModal] = useState(false)

  const selectedAlunos = useMemo(
    () => alunos.filter((a) => selectedIds.has(a.id)),
    [alunos, selectedIds]
  )

  const filteredAlunos = useMemo(() => {
    let result = alunos.filter((a) =>
      a.nome.toLowerCase().includes(searchQuery.toLowerCase())
    )
    result.sort((a, b) =>
      sortOrder === "asc"
        ? a.nome.localeCompare(b.nome)
        : b.nome.localeCompare(a.nome)
    )
    return result
  }, [alunos, searchQuery, sortOrder])

  const totalPages = Math.ceil(filteredAlunos.length / ITEMS_PER_PAGE)
  const paginatedAlunos = filteredAlunos.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  const allSelected =
    filteredAlunos.length > 0 &&
    filteredAlunos.every((a) => selectedIds.has(a.id))

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredAlunos.map((a) => a.id)))
    }
  }

  return (
    <div className="flex flex-col h-full p-6 gap-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <button
            onClick={() => setShowTurmaDropdown(!showTurmaDropdown)}
            className="flex items-center gap-1.5 text-2xl font-bold text-foreground"
          >
            {turma.nome}
            <ChevronDown className="h-5 w-5" />
          </button>

          {showTurmaDropdown && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowTurmaDropdown(false)}
              />
              <div className="absolute left-0 top-full z-20 mt-1 w-52 max-h-72 overflow-auto rounded-xl border border-border bg-card p-1 shadow-gamefik">
                {allTurmas.map((t) => (
                  <Link
                    key={t.id}
                    href={`/turmas/${t.id}`}
                    onClick={() => setShowTurmaDropdown(false)}
                    className={cn(
                      "block rounded-lg px-3 py-2 text-sm transition-colors",
                      t.id === turma.id
                        ? "bg-accent text-accent-foreground font-medium"
                        : "text-foreground hover:bg-sidebar-accent"
                    )}
                  >
                    {t.nome}
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>

        <button
          onClick={() => setShowEditarTurmaModal(true)}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-foreground hover:bg-sidebar-accent transition-colors"
          aria-label="Editar turma"
        >
          <Pencil className="h-4 w-4" />
        </button>

        <div className="relative">
          <button
            onClick={() => {
              setShowCopyTooltip(true)
              setTimeout(() => setShowCopyTooltip(false), 2000)
            }}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-foreground hover:bg-sidebar-accent transition-colors"
            aria-label="Copiar link da turma"
          >
            <Link2 className="h-4 w-4" />
          </button>
          {showCopyTooltip && (
            <div className="absolute -top-9 left-1/2 -translate-x-1/2 rounded-lg bg-foreground px-3 py-1.5 text-xs text-card whitespace-nowrap">
              Copiar link da turma
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-border">
        {([
          { key: "lancamentos", label: "Lancamentos" },
          { key: "atividades", label: "Atividades" },
          { key: "comunicacao", label: "Comunicação" },
        ] as const).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px",
              activeTab === tab.key
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <Toolbar
        searchQuery={searchQuery}
        onSearchChange={(v) => {
          setSearchQuery(v)
          setCurrentPage(1)
        }}
        sortOrder={sortOrder}
        onSortChange={setSortOrder}
        allSelected={allSelected}
        onSelectAll={toggleSelectAll}
        selectionMode={true}
      >
        <button
          onClick={() => {
            if (selectedIds.size > 0) setShowLancarModal(true)
          }}
          className={cn(
            "flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold transition-all",
            selectedIds.size > 0
              ? "bg-primary text-primary-foreground hover:opacity-90"
              : "bg-muted text-muted-foreground cursor-not-allowed"
          )}
        >
          Lançar ({selectedIds.size})
        </button>

            <button
              className="flex h-9 w-9 items-center justify-center rounded-full text-amber-500"
              aria-label="Conquistas"
            >
              <Zap className="h-5 w-5" />
            </button>

            <div className="relative">
              <button
                onClick={() => setShowActionsMenu(!showActionsMenu)}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-foreground hover:bg-sidebar-accent transition-colors"
                aria-label="Mais ações"
              >
                <MoreVertical className="h-4 w-4" />
              </button>

              {showActionsMenu && selectedIds.size > 0 && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowActionsMenu(false)}
                  />
                  <div className="absolute right-0 top-full z-20 mt-1 w-56 rounded-xl border border-border bg-card p-2 shadow-gamefik">
                    <button
                      onClick={() => {
                        setShowMoverAlunosModal(true)
                        setShowActionsMenu(false)
                      }}
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-sidebar-accent transition-colors"
                    >
                      <ArrowRight className="h-4 w-4" />
                      Mover de turma ({selectedIds.size})
                    </button>
                    <button className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-sidebar-accent transition-colors">
                      <KeyRound className="h-4 w-4" />
                      Acesso alunos ({selectedIds.size})
                    </button>
                    {selectedIds.size === 1 && (
                      <button className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-sidebar-accent transition-colors">
                        <Smartphone className="h-4 w-4" />
                        App Aluno
                      </button>
                    )}
                    <button className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-destructive hover:bg-sidebar-accent transition-colors">
                      <Trash2 className="h-4 w-4" />
                      Excluir ({selectedIds.size})
                    </button>
                  </div>
                </>
              )}
            </div>
      </Toolbar>

      {/* Tab Content */}
      <div className="flex-1">
        {activeTab === "lancamentos" ? (
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-9">
            <NovoAlunoCard onClick={() => setShowNovoAlunoModal(true)} />
            {paginatedAlunos.map((aluno) => (
              <AlunoCard
                key={aluno.id}
                aluno={aluno}
                selected={selectedIds.has(aluno.id)}
                onToggleSelect={() => toggleSelect(aluno.id)}
                onEdit={() => setAlunoParaEditar(aluno)}
                onView={() => setAlunoParaVer(aluno)}
              />
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">
            {activeTab === "atividades"
              ? "Funcionalidade de atividades em desenvolvimento."
              : "Funcionalidade de comunicação em desenvolvimento."}
          </div>
        )}
      </div>

      {/* Pagination */}
      <PaginationBar
        selectedCount={selectedIds.size}
        totalCount={filteredAlunos.length}
        label="aluno(s)"
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />

      {/* Lancar Modal */}
      {showLancarModal && selectedAlunos.length > 0 && (
        <LancarModal
          alunos={selectedAlunos}
          onClose={() => setShowLancarModal(false)}
        />
      )}

      {/* Novo Aluno Modal */}
      {showNovoAlunoModal && (
        <NovoAlunoModal
          turmaNome={turma.nome}
          onClose={() => setShowNovoAlunoModal(false)}
          onOpenImport={() => {
            setShowNovoAlunoModal(false)
            setShowImportarAlunosModal(true)
          }}
        />
      )}

      {/* Editar Turma Modal */}
      {showEditarTurmaModal && (
        <EditarTurmaModal
          turma={turma}
          onClose={() => setShowEditarTurmaModal(false)}
        />
      )}

      {/* Editar Aluno Modal */}
      {alunoParaEditar && (
        <EditarAlunoModal
          aluno={alunoParaEditar}
          onClose={() => setAlunoParaEditar(null)}
        />
      )}

      {/* Ver Aluno Modal */}
      {alunoParaVer && (
        <VerAlunoModal
          aluno={alunoParaVer}
          onClose={() => setAlunoParaVer(null)}
          onEdit={() => {
            setAlunoParaEditar(alunoParaVer)
            setAlunoParaVer(null)
          }}
        />
      )}

      {/* Mover Alunos Modal */}
      {showMoverAlunosModal && selectedAlunos.length > 0 && (
        <MoverAlunosModal
          alunos={selectedAlunos}
          turmaAtualId={turma.id}
          onClose={() => setShowMoverAlunosModal(false)}
        />
      )}

      {/* Importar Alunos Modal */}
      {showImportarAlunosModal && (
        <ImportarAlunosModal
          turmaNome={turma.nome}
          onClose={() => setShowImportarAlunosModal(false)}
        />
      )}
    </div>
  )
}
