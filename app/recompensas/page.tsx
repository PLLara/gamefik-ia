"use client"

import { useState, useMemo } from "react"
import Image from "next/image"
import {
  Plus,
  Search,
  MoreVertical,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Check,
  X,
  Package,
  Clock,
  CheckCircle2,
  XCircle,
  Truck,
  FileEdit,
  CreditCard,
  Settings,
} from "lucide-react"
import { gerarRecompensas, gerarPedidos, gerarTurmas, gerarAlunos } from "@/lib/data"
import type { Recompensa, Pedido } from "@/lib/data"

const AVATAR_MENINO = "/images/avatar-menino.jpeg"
const AVATAR_MENINA = "/images/avatar-menina.jpeg"

// Helper to get consistent avatar based on gender detection
function getAvatarForName(nome: string): string {
  const nomesFemininos = new Set([
    "Fernanda", "Lara", "Vitória", "Brenda", "Marina",
    "Isabela", "Ana", "Julia", "Sophia", "Valentina",
    "Helena", "Alice", "Laura", "Cecilia", "Manuela",
    "Maria", "Lorena", "Beatriz", "Emanuelly", "Livia",
    "Isadora", "Clara", "Camila", "Eloá", "Yasmin", "Nicole",
  ])
  const primeiro = nome.split(" ")[0]
  return nomesFemininos.has(primeiro) ? AVATAR_MENINA : AVATAR_MENINO
}
import { cn } from "@/lib/utils"
import { CriarRecompensaWizard } from "@/components/criar-recompensa-wizard"
import type { Turma } from "@/lib/data"

// Draft Configuration Modal Component
function DraftConfigModal({
  recompensa,
  turmas,
  onClose,
  onSave,
}: {
  recompensa: Recompensa
  turmas: Turma[]
  onClose: () => void
  onSave: (config: {
    valorMoedas: number
    quantidadeDisponivel: number
    limitePorAluno: number
    turmasIds: string[]
  }) => void
}) {
  const [config, setConfig] = useState({
    valorMoedas: recompensa.giftcardValor ? recompensa.giftcardValor * 10 : 100,
    quantidadeDisponivel: recompensa.quantidadeDisponivel,
    limitePorAluno: 1,
    turmasIds: [] as string[],
  })

  const toggleTurma = (turmaId: string) => {
    setConfig((prev) => ({
      ...prev,
      turmasIds: prev.turmasIds.includes(turmaId)
        ? prev.turmasIds.filter((id) => id !== turmaId)
        : [...prev.turmasIds, turmaId],
    }))
  }

  const selectAllTurmas = () => {
    setConfig((prev) => ({
      ...prev,
      turmasIds: prev.turmasIds.length === turmas.length ? [] : turmas.map((t) => t.id),
    }))
  }

  const canSave = config.valorMoedas > 0 && config.turmasIds.length > 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative flex w-full max-w-lg flex-col rounded-2xl border border-border bg-card shadow-xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-600">
              <Settings className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">Configurar Recompensa</h2>
              <p className="text-xs text-muted-foreground">{recompensa.nome}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted-foreground hover:bg-sidebar-accent hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6 space-y-5">
          {/* Gift Card Info */}
          <div className="rounded-xl border border-border bg-muted/30 p-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-muted">
                <Image
                  src={recompensa.imagem}
                  alt={recompensa.nome}
                  width={48}
                  height={48}
                  className="h-full w-full object-cover"
                />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{recompensa.nome}</p>
                <p className="text-xs text-muted-foreground">
                  Valor do gift card: <span className="font-semibold text-emerald-600">R$ {recompensa.giftcardValor || 0},00</span>
                </p>
              </div>
            </div>
          </div>

          {/* Valor em Moedas */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-foreground">
              Valor em Moedas <span className="text-destructive">*</span>
            </label>
            <input
              type="number"
              min={1}
              value={config.valorMoedas}
              onChange={(e) => setConfig((prev) => ({ ...prev, valorMoedas: Math.max(1, parseInt(e.target.value) || 0) }))}
              className="h-11 w-full rounded-xl border border-border bg-card px-4 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30 transition-colors"
            />
            <p className="text-xs text-muted-foreground">Quantas moedas o aluno precisa para resgatar</p>
          </div>

          {/* Quantidade e Limite */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-foreground">Estoque</label>
              <input
                type="number"
                min={1}
                value={config.quantidadeDisponivel}
                onChange={(e) => setConfig((prev) => ({ ...prev, quantidadeDisponivel: Math.max(1, parseInt(e.target.value) || 0) }))}
                className="h-11 w-full rounded-xl border border-border bg-card px-4 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30 transition-colors"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-foreground">Limite por aluno</label>
              <input
                type="number"
                min={1}
                value={config.limitePorAluno}
                onChange={(e) => setConfig((prev) => ({ ...prev, limitePorAluno: Math.max(1, parseInt(e.target.value) || 0) }))}
                className="h-11 w-full rounded-xl border border-border bg-card px-4 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30 transition-colors"
              />
            </div>
          </div>

          {/* Turmas */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-foreground">
                Turmas <span className="text-destructive">*</span>
              </label>
              <span className="text-xs text-muted-foreground">
                {config.turmasIds.length} de {turmas.length} selecionada{config.turmasIds.length !== 1 ? "s" : ""}
              </span>
            </div>

            {/* Select All Toggle */}
            <button
              onClick={selectAllTurmas}
              className={cn(
                "flex items-center justify-between rounded-xl border px-4 py-3 transition-colors",
                config.turmasIds.length === turmas.length
                  ? "border-primary bg-primary/5"
                  : "border-border bg-muted/30 hover:bg-sidebar-accent/50"
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-md border-2 transition-colors",
                  config.turmasIds.length === turmas.length
                    ? "border-primary bg-primary text-white"
                    : "border-border bg-card"
                )}>
                  {config.turmasIds.length === turmas.length && <Check className="h-3 w-3" />}
                </div>
                <span className="text-sm font-medium text-foreground">Selecionar todas as turmas</span>
              </div>
            </button>

            {/* Turmas List */}
            <div className="flex flex-col gap-1.5 rounded-xl border border-border bg-muted/20 p-2 max-h-48 overflow-auto">
              {turmas.map((turma) => {
                const isSelected = config.turmasIds.includes(turma.id)
                return (
                  <button
                    key={turma.id}
                    onClick={() => toggleTurma(turma.id)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors text-left",
                      isSelected
                        ? "bg-primary/10"
                        : "hover:bg-sidebar-accent"
                    )}
                  >
                    <div className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors",
                      isSelected
                        ? "border-primary bg-primary text-white"
                        : "border-border bg-card"
                    )}>
                      {isSelected && <Check className="h-3 w-3" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className={cn(
                        "text-sm font-medium block truncate",
                        isSelected ? "text-primary" : "text-foreground"
                      )}>
                        {turma.nome}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-sidebar-accent transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => onSave(config)}
            disabled={!canSave}
            className={cn(
              "flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-semibold transition-all",
              canSave
                ? "bg-primary text-primary-foreground hover:opacity-90"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            )}
          >
            <Check className="h-4 w-4" />
            Ativar Recompensa
          </button>
        </div>
      </div>
    </div>
  )
}

// Edit Reward Modal Component
function EditRewardModal({
  recompensa,
  turmas,
  onClose,
  onSave,
}: {
  recompensa: Recompensa
  turmas: Turma[]
  onClose: () => void
  onSave: (updates: Partial<Recompensa>) => void
}) {
  const [formData, setFormData] = useState({
    nome: recompensa.nome,
    descricao: recompensa.descricao || "",
    valorMoedas: recompensa.valorMoedas,
    quantidadeDisponivel: recompensa.quantidadeDisponivel,
    limitePorAluno: recompensa.limitePorAluno,
    turmasIds: recompensa.turmasIds,
    ativo: recompensa.ativo,
  })

  const toggleTurma = (turmaId: string) => {
    setFormData((prev) => ({
      ...prev,
      turmasIds: prev.turmasIds.includes(turmaId)
        ? prev.turmasIds.filter((id) => id !== turmaId)
        : [...prev.turmasIds, turmaId],
    }))
  }

  const selectAllTurmas = () => {
    setFormData((prev) => ({
      ...prev,
      turmasIds: prev.turmasIds.length === turmas.length ? [] : turmas.map((t) => t.id),
    }))
  }

  const canSave = formData.nome.trim().length >= 3 && formData.valorMoedas > 0 && formData.turmasIds.length > 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative flex w-full max-w-lg flex-col rounded-2xl border border-border bg-card shadow-xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Pencil className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">Editar Recompensa</h2>
              <p className="text-xs text-muted-foreground">Modifique os detalhes da recompensa</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted-foreground hover:bg-sidebar-accent hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6 space-y-5">
          {/* Reward Preview */}
          <div className="rounded-xl border border-border bg-muted/30 p-4">
            <div className="flex items-center gap-3">
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-muted">
                <Image
                  src={recompensa.imagem}
                  alt={recompensa.nome}
                  width={56}
                  height={56}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="flex-1">
                <input
                  type="text"
                  value={formData.nome}
                  onChange={(e) => setFormData((prev) => ({ ...prev, nome: e.target.value }))}
                  className="w-full bg-transparent text-sm font-semibold text-foreground outline-none border-b border-transparent focus:border-ring transition-colors"
                  placeholder="Nome da recompensa"
                />
                {recompensa.tipo === "giftcard" && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Gift Card - R$ {recompensa.giftcardValor || 0},00
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Descricao */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-foreground">Descricao</label>
            <textarea
              value={formData.descricao}
              onChange={(e) => setFormData((prev) => ({ ...prev, descricao: e.target.value }))}
              placeholder="Descricao opcional..."
              rows={2}
              className="w-full resize-none rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/30 transition-colors"
            />
          </div>

          {/* Valor em Moedas */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-foreground">
              Valor em Moedas <span className="text-destructive">*</span>
            </label>
            <input
              type="number"
              min={1}
              value={formData.valorMoedas}
              onChange={(e) => setFormData((prev) => ({ ...prev, valorMoedas: Math.max(1, parseInt(e.target.value) || 0) }))}
              className="h-11 w-full rounded-xl border border-border bg-card px-4 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30 transition-colors"
            />
          </div>

          {/* Quantidade e Limite */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-foreground">Estoque</label>
              <input
                type="number"
                min={0}
                value={formData.quantidadeDisponivel}
                onChange={(e) => setFormData((prev) => ({ ...prev, quantidadeDisponivel: Math.max(0, parseInt(e.target.value) || 0) }))}
                className="h-11 w-full rounded-xl border border-border bg-card px-4 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30 transition-colors"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-foreground">Limite por aluno</label>
              <input
                type="number"
                min={1}
                value={formData.limitePorAluno}
                onChange={(e) => setFormData((prev) => ({ ...prev, limitePorAluno: Math.max(1, parseInt(e.target.value) || 0) }))}
                className="h-11 w-full rounded-xl border border-border bg-card px-4 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30 transition-colors"
              />
            </div>
          </div>

          {/* Status Toggle */}
          <div className="flex items-center justify-between rounded-xl border border-border bg-muted/30 px-4 py-3">
            <div>
              <span className="text-sm font-medium text-foreground">Recompensa ativa</span>
              <p className="text-xs text-muted-foreground">Alunos podem ver e resgatar</p>
            </div>
            <button
              onClick={() => setFormData((prev) => ({ ...prev, ativo: !prev.ativo }))}
              className={cn(
                "flex h-6 w-11 items-center rounded-full p-1 transition-colors",
                formData.ativo ? "bg-primary" : "bg-border"
              )}
            >
              <div className={cn(
                "h-4 w-4 rounded-full bg-white transition-transform",
                formData.ativo && "translate-x-5"
              )} />
            </button>
          </div>

          {/* Turmas */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-foreground">
                Turmas <span className="text-destructive">*</span>
              </label>
              <span className="text-xs text-muted-foreground">
                {formData.turmasIds.length} de {turmas.length} selecionadas
              </span>
            </div>

            {/* Select All Toggle */}
            <button
              onClick={selectAllTurmas}
              className={cn(
                "flex items-center justify-between rounded-xl border px-4 py-3 transition-colors",
                formData.turmasIds.length === turmas.length
                  ? "border-primary bg-primary/5"
                  : "border-border bg-muted/30 hover:bg-sidebar-accent/50"
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-md border-2 transition-colors",
                  formData.turmasIds.length === turmas.length
                    ? "border-primary bg-primary text-white"
                    : "border-border bg-card"
                )}>
                  {formData.turmasIds.length === turmas.length && <Check className="h-3 w-3" />}
                </div>
                <span className="text-sm font-medium text-foreground">Selecionar todas</span>
              </div>
            </button>

            {/* Turmas List */}
            <div className="flex flex-col gap-1.5 rounded-xl border border-border bg-muted/20 p-2 max-h-40 overflow-auto">
              {turmas.map((turma) => {
                const isSelected = formData.turmasIds.includes(turma.id)
                return (
                  <button
                    key={turma.id}
                    onClick={() => toggleTurma(turma.id)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors text-left",
                      isSelected ? "bg-primary/10" : "hover:bg-sidebar-accent"
                    )}
                  >
                    <div className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors",
                      isSelected ? "border-primary bg-primary text-white" : "border-border bg-card"
                    )}>
                      {isSelected && <Check className="h-3 w-3" />}
                    </div>
                    <span className={cn(
                      "text-sm font-medium truncate",
                      isSelected ? "text-primary" : "text-foreground"
                    )}>
                      {turma.nome}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-sidebar-accent transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => onSave(formData)}
            disabled={!canSave}
            className={cn(
              "flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-semibold transition-all",
              canSave
                ? "bg-primary text-primary-foreground hover:opacity-90"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            )}
          >
            <Check className="h-4 w-4" />
            Salvar Alteracoes
          </button>
        </div>
      </div>
    </div>
  )
}

// Delete Confirmation Modal Component
function DeleteConfirmModal({
  recompensa,
  onClose,
  onConfirm,
}: {
  recompensa: Recompensa
  onClose: () => void
  onConfirm: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-sm rounded-2xl border border-border bg-card shadow-xl overflow-hidden">
        {/* Content */}
        <div className="p-6 text-center">
          {/* Warning Icon */}
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
            <Trash2 className="h-7 w-7 text-destructive" />
          </div>

          <h2 className="text-lg font-semibold text-foreground">Excluir Recompensa</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Tem certeza que deseja excluir <span className="font-semibold text-foreground">{recompensa.nome}</span>? Esta acao nao pode ser desfeita.
          </p>

          {/* Reward Preview */}
          <div className="mt-4 flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-3">
            <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-muted">
              <Image
                src={recompensa.imagem}
                alt={recompensa.nome}
                width={40}
                height={40}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-medium text-foreground truncate">{recompensa.nome}</p>
              <p className="text-xs text-muted-foreground">
                {recompensa.valorMoedas} moedas - {recompensa.quantidadeDisponivel} em estoque
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 border-t border-border px-6 py-4">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground hover:bg-sidebar-accent transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-destructive px-4 py-2.5 text-sm font-semibold text-destructive-foreground hover:opacity-90 transition-opacity"
          >
            <Trash2 className="h-4 w-4" />
            Excluir
          </button>
        </div>
      </div>
    </div>
  )
}

type Tab = "recompensas" | "pedidos"
type StatusFilter = "todos" | "pendente" | "aceito" | "entregue" | "cancelado"

const statusConfig = {
  pendente: { label: "Pendente", color: "bg-amber-100 text-amber-700", icon: Clock },
  aceito: { label: "Aceito", color: "bg-blue-100 text-blue-700", icon: CheckCircle2 },
  entregue: { label: "Entregue", color: "bg-emerald-100 text-emerald-700", icon: Truck },
  cancelado: { label: "Cancelado", color: "bg-red-100 text-red-700", icon: XCircle },
}

export default function RecompensasPage() {
  const [activeTab, setActiveTab] = useState<Tab>("recompensas")
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("todos")
  const [showCreateWizard, setShowCreateWizard] = useState(false)
  const [recompensas, setRecompensas] = useState<Recompensa[]>(() => gerarRecompensas())
  const [showConfigModal, setShowConfigModal] = useState<Recompensa | null>(null)
  const [showEditModal, setShowEditModal] = useState<Recompensa | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState<Recompensa | null>(null)
  const [pedidos, setPedidos] = useState<Pedido[]>(() => gerarPedidos())
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null)

  const handleMenuOpen = (e: React.MouseEvent, recompensaId: string) => {
    e.stopPropagation()
    if (menuOpenId === recompensaId) {
      setMenuOpenId(null)
      setMenuPosition(null)
    } else {
      const rect = (e.target as HTMLElement).getBoundingClientRect()
      setMenuPosition({
        top: rect.bottom + 4,
        left: rect.right - 144, // 144px is the menu width (w-36)
      })
      setMenuOpenId(recompensaId)
    }
  }

  const closeMenu = () => {
    setMenuOpenId(null)
    setMenuPosition(null)
  }

  const turmas = useMemo(() => gerarTurmas(), [])

  const filteredRecompensas = useMemo(() => {
    return recompensas.filter((r) =>
      r.nome.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [recompensas, searchQuery])

  const filteredPedidos = useMemo(() => {
    let result = pedidos
    if (searchQuery) {
      result = result.filter(
        (p) =>
          p.alunoNome.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.recompensaNome.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }
    if (statusFilter !== "todos") {
      result = result.filter((p) => p.status === statusFilter)
    }
    return result
  }, [pedidos, searchQuery, statusFilter])

  const updatePedidoStatus = (pedidoId: string, newStatus: Pedido["status"]) => {
    setPedidos((prev) =>
      prev.map((p) =>
        p.id === pedidoId
          ? { ...p, status: newStatus, dataAtualizacao: "12/03/2026" }
          : p
      )
    )
  }

  const pendingCount = pedidos.filter((p) => p.status === "pendente").length
  const draftCount = recompensas.filter((r) => r.status === "rascunho").length

  // Handle creating new rewards from wizard
  const handleCreateReward = (formData: {
    tipo: "normal" | "giftcard"
    nome: string
    descricao: string
    imagem: string | null
    valorMoedas: number
    quantidadeDisponivel: number
    limitePorAluno: number
    turmasIds: string[]
    giftcards: { id: string; marca: string; valor: number; quantidade: number }[]
  }) => {
    if (formData.tipo === "giftcard") {
      // Create draft rewards for each giftcard
      const newRewards: Recompensa[] = formData.giftcards.map((gc, index) => ({
        id: `giftcard-${Date.now()}-${index}`,
        nome: `Gift Card ${gc.marca.charAt(0).toUpperCase() + gc.marca.slice(1)}`,
        descricao: `Gift card de R$ ${gc.valor},00`,
        imagem: `https://api.dicebear.com/9.x/initials/svg?seed=${gc.marca}`,
        valorMoedas: 0, // To be configured
        quantidadeDisponivel: gc.quantidade,
        limitePorAluno: 1,
        turmasIds: [], // To be configured
        ativo: false,
        status: "rascunho" as const,
        tipo: "giftcard" as const,
        giftcardMarca: gc.marca,
        giftcardValor: gc.valor,
      }))
      setRecompensas((prev) => [...newRewards, ...prev])
    } else {
      // Create normal reward (active)
      const newReward: Recompensa = {
        id: `reward-${Date.now()}`,
        nome: formData.nome,
        descricao: formData.descricao || undefined,
        imagem: formData.imagem || `https://api.dicebear.com/9.x/shapes/svg?seed=${formData.nome}`,
        valorMoedas: formData.valorMoedas,
        quantidadeDisponivel: formData.quantidadeDisponivel,
        limitePorAluno: formData.limitePorAluno,
        turmasIds: formData.turmasIds,
        ativo: true,
        status: "ativo",
        tipo: "normal",
      }
      setRecompensas((prev) => [newReward, ...prev])
    }
  }

  // Handle finalizing draft configuration
  const handleFinalizeDraft = (recompensaId: string, config: {
    valorMoedas: number
    quantidadeDisponivel: number
    limitePorAluno: number
    turmasIds: string[]
  }) => {
    setRecompensas((prev) =>
      prev.map((r) =>
        r.id === recompensaId
          ? {
              ...r,
              ...config,
              ativo: true,
              status: "ativo" as const,
            }
          : r
      )
    )
    setShowConfigModal(null)
  }

  // Handle editing reward
  const handleEditReward = (recompensaId: string, updates: Partial<Recompensa>) => {
    setRecompensas((prev) =>
      prev.map((r) =>
        r.id === recompensaId
          ? { ...r, ...updates }
          : r
      )
    )
    setShowEditModal(null)
  }

  // Handle deleting reward
  const handleDeleteReward = (recompensaId: string) => {
    setRecompensas((prev) => prev.filter((r) => r.id !== recompensaId))
    setShowDeleteModal(null)
  }

  // Handle toggling reward active status
  const handleToggleActive = (recompensaId: string) => {
    setRecompensas((prev) =>
      prev.map((r) =>
        r.id === recompensaId
          ? { ...r, ativo: !r.ativo }
          : r
      )
    )
    closeMenu()
  }

  return (
    <div className="flex flex-col h-full p-6 gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Recompensas</h1>
        {activeTab === "recompensas" && (
          <button
            onClick={() => setShowCreateWizard(true)}
            className="flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
          >
            <Plus className="h-4 w-4" />
            Nova Recompensa
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-border">
        <button
          onClick={() => setActiveTab("recompensas")}
          className={cn(
            "px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px",
            activeTab === "recompensas"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          Recompensas
        </button>
        <button
          onClick={() => setActiveTab("pedidos")}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px",
            activeTab === "pedidos"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          Pedidos
          {pendingCount > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-xs font-bold text-white">
              {pendingCount}
            </span>
          )}
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder={activeTab === "recompensas" ? "Buscar recompensa..." : "Buscar pedido..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 w-full rounded-lg border border-border bg-card pl-10 pr-4 text-sm outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/30 transition-colors"
          />
        </div>

        {activeTab === "pedidos" && (
          <div className="flex items-center gap-2">
            {(["todos", "pendente", "aceito", "entregue", "cancelado"] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                  statusFilter === status
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-sidebar-accent/80"
                )}
              >
                {status === "todos" ? "Todos" : statusConfig[status].label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {activeTab === "recompensas" ? (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8">
            {/* Add Card */}
            <button
              onClick={() => setShowCreateWizard(true)}
              className="flex aspect-[4/5] flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-border bg-accent/20 p-2 transition-colors hover:bg-accent/40"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-primary text-primary">
                <Plus className="h-4 w-4" />
              </div>
              <span className="text-[11px] font-medium text-primary text-center leading-tight">Nova Recompensa</span>
            </button>

            {/* Reward Cards */}
            {filteredRecompensas.map((recompensa, index) => {
              const isDraft = recompensa.status === "rascunho"
              const isGiftcard = recompensa.tipo === "giftcard"
              const isAboveFold = index < 8 // First 8 images are likely above the fold

              return (
                <div
                  key={recompensa.id}
                  className={cn(
                    "group relative flex aspect-[4/5] flex-col rounded-xl border bg-card shadow-card transition-all hover:shadow-md overflow-hidden",
                    isDraft
                      ? "border-amber-300 border-dashed"
                      : recompensa.ativo
                      ? "border-border"
                      : "border-border/50 opacity-60"
                  )}
                >
                  {/* Draft Badge */}
                  {isDraft && (
                    <div className="absolute left-1 top-1 z-10">
                      <span className="flex items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-semibold text-amber-700">
                        <FileEdit className="h-2 w-2" />
                        Rascunho
                      </span>
                    </div>
                  )}

                  {/* Giftcard indicator (for active ones) */}
                  {isGiftcard && !isDraft && (
                    <div className="absolute left-1 top-1 z-10">
                      <span className="flex items-center gap-0.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold text-primary">
                        <CreditCard className="h-2 w-2" />
                        Gift
                      </span>
                    </div>
                  )}

                  {/* Menu Button */}
                  <div className="absolute right-1 top-1 z-10">
                    <button
                      onClick={(e) => handleMenuOpen(e, recompensa.id)}
                      className="flex h-5 w-5 items-center justify-center rounded-full bg-card/80 text-muted-foreground opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100 hover:bg-sidebar-accent"
                    >
                      <MoreVertical className="h-3 w-3" />
                    </button>
                  </div>

                  {/* Image */}
                  <div className="relative flex-1 overflow-hidden bg-muted">
                    <Image
                      src={recompensa.imagem}
                      alt={recompensa.nome}
                      fill
                      priority={isAboveFold}
                      className={cn("object-cover", isDraft && "opacity-70")}
                    />
                    {!recompensa.ativo && !isDraft && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                        <span className="rounded-full bg-white/90 px-1.5 py-0.5 text-[9px] font-medium text-foreground">
                          Inativo
                        </span>
                      </div>
                    )}
                    {/* Configure overlay for drafts */}
                    {isDraft && (
                      <button
                        onClick={() => setShowConfigModal(recompensa)}
                        className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <span className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[11px] font-semibold text-foreground shadow-md">
                          <Settings className="h-3 w-3" />
                          Configurar
                        </span>
                      </button>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex flex-col gap-0.5 p-1.5">
                    <h3 className="text-[11px] font-semibold text-foreground line-clamp-1">{recompensa.nome}</h3>
                    <div className="flex items-center justify-between">
                      {isDraft ? (
                        <span className="text-[10px] text-amber-600 font-medium">
                          R$ {recompensa.giftcardValor || 0}
                        </span>
                      ) : (
                        <span className="flex items-center gap-0.5 text-[11px] font-medium text-amber-600">
                          <span className="text-[9px]">🪙</span>
                          {recompensa.valorMoedas}
                        </span>
                      )}
                      <span className="flex items-center gap-0.5 text-[9px] text-muted-foreground">
                        <Package className="h-2 w-2" />
                        {recompensa.quantidadeDisponivel}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}

            {/* Floating Menu Portal */}
            {menuOpenId && menuPosition && (
              <>
                <div className="fixed inset-0 z-40" onClick={closeMenu} />
                <div
                  className="fixed z-50 w-36 rounded-lg border border-border bg-card p-1 shadow-xl"
                  style={{ top: menuPosition.top, left: Math.max(8, menuPosition.left) }}
                >
                  {(() => {
                    const recompensa = recompensas.find((r) => r.id === menuOpenId)
                    if (!recompensa) return null
                    const isDraft = recompensa.status === "rascunho"
                    return (
                      <>
                        {isDraft && (
                          <button
                            onClick={() => {
                              setShowConfigModal(recompensa)
                              closeMenu()
                            }}
                            className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-primary font-medium hover:bg-primary/10 transition-colors"
                          >
                            <Settings className="h-3.5 w-3.5" />
                            Configurar
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setShowEditModal(recompensa)
                            closeMenu()
                          }}
                          className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-foreground hover:bg-sidebar-accent transition-colors"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Editar
                        </button>
                        {!isDraft && (
                          <button
                            onClick={() => handleToggleActive(recompensa.id)}
                            className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-foreground hover:bg-sidebar-accent transition-colors"
                          >
                            {recompensa.ativo ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                            {recompensa.ativo ? "Desativar" : "Ativar"}
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setShowDeleteModal(recompensa)
                            closeMenu()
                          }}
                          className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-destructive hover:bg-sidebar-accent transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Excluir
                        </button>
                      </>
                    )
                  })()}
                </div>
              </>
            )}
          </div>
        ) : (
          /* Orders List */
          <div className="flex flex-col gap-3">
            {filteredPedidos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Package className="h-12 w-12 mb-3" />
                <p className="text-sm">Nenhum pedido encontrado</p>
              </div>
            ) : (
              filteredPedidos.map((pedido) => {
                const StatusIcon = statusConfig[pedido.status].icon
                return (
                  <div
                    key={pedido.id}
                    className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-card transition-all hover:shadow-md"
                  >
                    {/* Student Avatar */}
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full border border-border bg-muted">
                      <Image
                        src={getAvatarForName(pedido.alunoNome)}
                        alt={pedido.alunoNome}
                        width={48}
                        height={48}
                        className="h-full w-full object-cover"
                      />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-foreground truncate">{pedido.alunoNome}</h3>
                        <span className="text-xs text-muted-foreground">• {pedido.turmaNome}</span>
                      </div>
                      <p className="mt-0.5 text-sm text-muted-foreground truncate">
                        Solicitou: <span className="font-medium text-foreground">{pedido.recompensaNome}</span>
                      </p>
                      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                        <span>🪙 {pedido.valorMoedas}</span>
                        <span>•</span>
                        <span>{pedido.dataPedido}</span>
                      </div>
                    </div>

                    {/* Reward Image */}
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
                      <Image
                        src={pedido.recompensaImagem}
                        alt={pedido.recompensaNome}
                        width={56}
                        height={56}
                        className="h-full w-full object-cover"
                      />
                    </div>

                    {/* Status */}
                    <div className={cn(
                      "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium",
                      statusConfig[pedido.status].color
                    )}>
                      <StatusIcon className="h-3.5 w-3.5" />
                      {statusConfig[pedido.status].label}
                    </div>

                    {/* Actions */}
                    {pedido.status === "pendente" && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updatePedidoStatus(pedido.id, "aceito")}
                          className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 hover:bg-emerald-200 transition-colors"
                          title="Aceitar"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => updatePedidoStatus(pedido.id, "cancelado")}
                          className="flex h-9 w-9 items-center justify-center rounded-full bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
                          title="Recusar"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    )}

                    {pedido.status === "aceito" && (
                      <button
                        onClick={() => updatePedidoStatus(pedido.id, "entregue")}
                        className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
                      >
                        <Truck className="h-3.5 w-3.5" />
                        Marcar Entregue
                      </button>
                    )}
                  </div>
                )
              })
            )}
          </div>
        )}
      </div>

      {/* Create Wizard */}
      {showCreateWizard && (
        <CriarRecompensaWizard
          turmas={turmas}
          onClose={() => setShowCreateWizard(false)}
          onSave={handleCreateReward}
        />
      )}

      {/* Draft Configuration Modal */}
      {showConfigModal && (
        <DraftConfigModal
          recompensa={showConfigModal}
          turmas={turmas}
          onClose={() => setShowConfigModal(null)}
          onSave={(config) => handleFinalizeDraft(showConfigModal.id, config)}
        />
      )}

      {/* Edit Reward Modal */}
      {showEditModal && (
        <EditRewardModal
          recompensa={showEditModal}
          turmas={turmas}
          onClose={() => setShowEditModal(null)}
          onSave={(updates) => handleEditReward(showEditModal.id, updates)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <DeleteConfirmModal
          recompensa={showDeleteModal}
          onClose={() => setShowDeleteModal(null)}
          onConfirm={() => handleDeleteReward(showDeleteModal.id)}
        />
      )}
    </div>
  )
}
