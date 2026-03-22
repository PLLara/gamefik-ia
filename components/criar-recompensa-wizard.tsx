"use client"

import { useState } from "react"
import Image from "next/image"
import {
  X,
  ChevronLeft,
  ChevronRight,
  Upload,
  ImageIcon,
  Check,
  Coins,
  Package,
  Users,
  FileText,
  Gift,
  CreditCard,
  ShoppingCart,
  Plus,
  Trash2,
  Info,
  ExternalLink,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { Turma } from "@/lib/data"

interface CriarRecompensaWizardProps {
  turmas: Turma[]
  onClose: () => void
  onSave?: (data: RecompensaFormData) => void
}

type RecompensaTipo = "normal" | "giftcard"

interface GiftcardItem {
  id: string
  marca: string
  valor: number
  quantidade: number
}

interface GiftcardBrandInfo {
  id: string
  nome: string
  logo: string
  descricao: string
  ondeUsar: string[]
  instrucoes: string
  termos: string
  valoresDisponiveis: number[]
}

const giftcardBrands: GiftcardBrandInfo[] = [
  {
    id: "nike",
    nome: "Nike",
    logo: "https://api.dicebear.com/9.x/initials/svg?seed=Nike",
    descricao: "Gift card para compras em lojas Nike e Nike.com.br",
    ondeUsar: ["https://www.nike.com.br", "Lojas Nike"],
    instrucoes: "Va para nike.com.br, adicione produtos ao carrinho e aplique o codigo do gift card no checkout. O saldo restante pode ser usado em compras futuras.",
    termos: "https://www.nike.com.br/termos-gift-card",
    valoresDisponiveis: [50, 100, 150, 200],
  },
  {
    id: "mcdonalds",
    nome: "McDonald's",
    logo: "https://api.dicebear.com/9.x/initials/svg?seed=McD",
    descricao: "Gift card para refeicoes no McDonald's",
    ondeUsar: ["Restaurantes McDonald's", "App McDonald's"],
    instrucoes: "Apresente o codigo no caixa ou insira no app McDonald's para pagar seu pedido. Valido em todos os restaurantes participantes.",
    termos: "https://www.mcdonalds.com.br/termos",
    valoresDisponiveis: [25, 50, 100],
  },
  {
    id: "ifood",
    nome: "iFood",
    logo: "https://api.dicebear.com/9.x/initials/svg?seed=iFood",
    descricao: "Creditos para pedidos no iFood",
    ondeUsar: ["App iFood", "https://www.ifood.com.br"],
    instrucoes: "Acesse o app iFood, va em Carteira > Adicionar creditos e insira o codigo. Os creditos serao adicionados automaticamente.",
    termos: "https://www.ifood.com.br/termos-gift-card",
    valoresDisponiveis: [25, 50, 100, 150],
  },
  {
    id: "spotify",
    nome: "Spotify",
    logo: "https://api.dicebear.com/9.x/initials/svg?seed=Spotify",
    descricao: "Assinatura Premium do Spotify",
    ondeUsar: ["https://www.spotify.com/redeem"],
    instrucoes: "Acesse spotify.com/redeem, faca login e insira o codigo. Os meses de Premium serao adicionados a sua conta.",
    termos: "https://www.spotify.com/br/legal/gift-card-terms",
    valoresDisponiveis: [25, 50, 100],
  },
  {
    id: "netflix",
    nome: "Netflix",
    logo: "https://api.dicebear.com/9.x/initials/svg?seed=Netflix",
    descricao: "Creditos para assinatura Netflix",
    ondeUsar: ["https://www.netflix.com/redeem"],
    instrucoes: "Acesse netflix.com/redeem, faca login e insira o codigo do gift card. O valor sera aplicado como credito na sua conta.",
    termos: "https://help.netflix.com/pt/node/32950",
    valoresDisponiveis: [50, 100, 150],
  },
  {
    id: "amazon",
    nome: "Amazon",
    logo: "https://api.dicebear.com/9.x/initials/svg?seed=Amazon",
    descricao: "Gift card para compras na Amazon.com.br",
    ondeUsar: ["https://www.amazon.com.br"],
    instrucoes: "Acesse amazon.com.br/gc/redeem, faca login e insira o codigo. O saldo sera adicionado a sua conta automaticamente.",
    termos: "https://www.amazon.com.br/gp/help/customer/display.html?nodeId=201936990",
    valoresDisponiveis: [25, 50, 100, 200],
  },
  {
    id: "roblox",
    nome: "Roblox",
    logo: "https://api.dicebear.com/9.x/initials/svg?seed=Roblox",
    descricao: "Robux para o jogo Roblox",
    ondeUsar: ["https://www.roblox.com/redeem"],
    instrucoes: "Va para www.roblox.com/redeem. Faca seu login ou crie uma conta. Digite o PIN do cartao. Clique em Redeem para adicionar o credito ou Robux a sua conta.",
    termos: "https://en.help.roblox.com/hc/pt-br/articles/115004647846",
    valoresDisponiveis: [25, 40, 50, 60, 100, 150],
  },
  {
    id: "playstation",
    nome: "PlayStation",
    logo: "https://api.dicebear.com/9.x/initials/svg?seed=PS",
    descricao: "Creditos para PlayStation Store",
    ondeUsar: ["PlayStation Store", "https://store.playstation.com"],
    instrucoes: "Acesse a PlayStation Store no seu console ou navegador, va em Resgatar Codigos e insira o codigo do gift card.",
    termos: "https://www.playstation.com/pt-br/legal/gift-card-terms",
    valoresDisponiveis: [50, 100, 150, 200],
  },
  {
    id: "xbox",
    nome: "Xbox",
    logo: "https://api.dicebear.com/9.x/initials/svg?seed=Xbox",
    descricao: "Creditos para Xbox e Microsoft Store",
    ondeUsar: ["Xbox Console", "https://redeem.microsoft.com"],
    instrucoes: "Acesse redeem.microsoft.com, faca login com sua conta Microsoft e insira o codigo de 25 caracteres.",
    termos: "https://www.xbox.com/pt-BR/legal/gift-card-terms",
    valoresDisponiveis: [25, 50, 100, 200],
  },
  {
    id: "steam",
    nome: "Steam",
    logo: "https://api.dicebear.com/9.x/initials/svg?seed=Steam",
    descricao: "Creditos para compras na Steam",
    ondeUsar: ["https://store.steampowered.com"],
    instrucoes: "Abra o cliente Steam, va em Jogos > Resgatar um codigo do produto Steam e insira o codigo do gift card.",
    termos: "https://store.steampowered.com/steam_refunds",
    valoresDisponiveis: [25, 50, 100, 200],
  },
]

const giftcardValues = [25, 40, 50, 60, 100, 150, 200]

interface RecompensaFormData {
  tipo: RecompensaTipo
  nome: string
  descricao: string
  imagem: string | null
  valorMoedas: number
  quantidadeDisponivel: number
  limitePorAluno: number
  turmasIds: string[]
  // Giftcard specific
  giftcards: GiftcardItem[]
}

type Step = 1 | 2 | 3 | 4 | 5

const stepInfoNormal = [
  { number: 1, title: "Tipo", icon: Gift },
  { number: 2, title: "Detalhes", icon: FileText },
  { number: 3, title: "Valores", icon: Coins },
  { number: 4, title: "Turmas", icon: Users },
]

const stepInfoGiftcard = [
  { number: 1, title: "Tipo", icon: Gift },
  { number: 2, title: "Gift Cards", icon: CreditCard },
  { number: 3, title: "Checkout", icon: ShoppingCart },
]

export function CriarRecompensaWizard({ turmas, onClose, onSave }: CriarRecompensaWizardProps) {
  const [currentStep, setCurrentStep] = useState<Step>(1)
  const [formData, setFormData] = useState<RecompensaFormData>({
    tipo: "normal",
    nome: "",
    descricao: "",
    imagem: null,
    valorMoedas: 100,
    quantidadeDisponivel: 10,
    limitePorAluno: 1,
    turmasIds: [],
    giftcards: [],
  })

  const [selectAllTurmas, setSelectAllTurmas] = useState(false)
  const [showBrandInfo, setShowBrandInfo] = useState<string | null>(null)

  const selectedBrandInfo = showBrandInfo ? giftcardBrands.find(b => b.id === showBrandInfo) : null

  const stepInfo = formData.tipo === "normal" ? stepInfoNormal : stepInfoGiftcard
  const totalSteps = stepInfo.length

  const updateFormData = <K extends keyof RecompensaFormData>(
    key: K,
    value: RecompensaFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [key]: value }))
  }

  const addGiftcardRow = () => {
    const newGiftcard: GiftcardItem = {
      id: `gc-${Date.now()}`,
      marca: giftcardBrands[0].id,
      valor: giftcardValues[1],
      quantidade: 1,
    }
    setFormData((prev) => ({
      ...prev,
      giftcards: [...prev.giftcards, newGiftcard],
    }))
  }

  const updateGiftcard = (id: string, field: keyof GiftcardItem, value: string | number) => {
    setFormData((prev) => ({
      ...prev,
      giftcards: prev.giftcards.map((gc) =>
        gc.id === id ? { ...gc, [field]: value } : gc
      ),
    }))
  }

  const removeGiftcard = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      giftcards: prev.giftcards.filter((gc) => gc.id !== id),
    }))
  }



  const totalGiftcardValue = formData.giftcards.reduce(
    (sum, gc) => sum + gc.valor * gc.quantidade,
    0
  )

  const canProceed = () => {
    if (formData.tipo === "normal") {
      switch (currentStep) {
        case 1:
          return true // Type selection
        case 2:
          return formData.nome.trim().length >= 3 // Details step (name + image)
        case 3:
          return formData.valorMoedas > 0 && formData.quantidadeDisponivel > 0 && formData.limitePorAluno > 0
        case 4:
          return formData.turmasIds.length > 0
        default:
          return false
      }
    } else {
      // Giftcard flow: Type -> Gift Cards -> Checkout (creates as draft)
      switch (currentStep) {
        case 1:
          return true // Type selection
        case 2:
          return formData.giftcards.length > 0
        case 3:
          return true // Checkout - ready to pay
        default:
          return false
      }
    }
  }

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep((prev) => (prev + 1) as Step)
    } else {
      onSave?.(formData)
      onClose()
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as Step)
    }
  }

  const toggleTurma = (turmaId: string) => {
    setFormData((prev) => ({
      ...prev,
      turmasIds: prev.turmasIds.includes(turmaId)
        ? prev.turmasIds.filter((id) => id !== turmaId)
        : [...prev.turmasIds, turmaId],
    }))
  }

  const handleSelectAllTurmas = () => {
    if (selectAllTurmas) {
      setFormData((prev) => ({ ...prev, turmasIds: [] }))
    } else {
      setFormData((prev) => ({ ...prev, turmasIds: turmas.map((t) => t.id) }))
    }
    setSelectAllTurmas(!selectAllTurmas)
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        updateFormData("imagem", event.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative flex w-full max-w-2xl flex-col rounded-2xl border border-border bg-card shadow-xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            {currentStep > 1 && (
              <button
                onClick={handleBack}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                aria-label="Voltar"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
            <h2 className="text-lg font-semibold text-foreground">Nova Recompensa</h2>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-1 border-b border-border px-6 py-4 overflow-x-auto">
          {stepInfo.map((step, index) => (
            <div key={step.number} className="flex items-center shrink-0">
              <button
                onClick={() => step.number < currentStep && step.number > 1 && setCurrentStep(step.number as Step)}
                disabled={step.number > currentStep || step.number === 1}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-medium transition-colors",
                  step.number === currentStep
                    ? "bg-primary text-primary-foreground"
                    : step.number < currentStep
                    ? "bg-emerald-100 text-emerald-700 cursor-pointer hover:bg-emerald-200"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {step.number < currentStep ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <step.icon className="h-3 w-3" />
                )}
                <span className="hidden sm:inline">{step.title}</span>
              </button>
              {index < stepInfo.length - 1 && (
                <div className={cn(
                  "mx-1.5 h-px w-4 sm:w-6",
                  step.number < currentStep ? "bg-emerald-300" : "bg-border"
                )} />
              )}
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {/* Step 1: Type Selection */}
          {currentStep === 1 && (
            <div className="flex flex-col gap-6">
              <div className="text-center">
                <h3 className="text-base font-semibold text-foreground">Tipo de Recompensa</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Escolha o tipo de recompensa que deseja criar.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 max-w-lg mx-auto">
                <button
                  onClick={() => updateFormData("tipo", "normal")}
                  className={cn(
                    "flex flex-col items-center gap-3 rounded-xl border-2 p-6 transition-all",
                    formData.tipo === "normal"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-ring hover:bg-sidebar-accent"
                  )}
                >
                  <div className={cn(
                    "flex h-14 w-14 items-center justify-center rounded-full",
                    formData.tipo === "normal" ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                  )}>
                    <Gift className="h-7 w-7" />
                  </div>
                  <div className="text-center">
                    <h4 className="font-semibold text-foreground">Recompensa Normal</h4>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Adesivos, brindes, privilegios e outras recompensas
                    </p>
                  </div>
                </button>

                <button
                  onClick={() => {
                    updateFormData("tipo", "giftcard")
                    // Initialize with one row if empty
                    if (formData.giftcards.length === 0) {
                      setFormData((prev) => ({
                        ...prev,
                        tipo: "giftcard",
                        giftcards: [{
                          id: `gc-${Date.now()}`,
                          marca: giftcardBrands[0].id,
                          valor: giftcardValues[1],
                          quantidade: 1,
                        }],
                      }))
                    }
                  }}
                  className={cn(
                    "flex flex-col items-center gap-3 rounded-xl border-2 p-6 transition-all",
                    formData.tipo === "giftcard"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-ring hover:bg-sidebar-accent"
                  )}
                >
                  <div className={cn(
                    "flex h-14 w-14 items-center justify-center rounded-full",
                    formData.tipo === "giftcard" ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                  )}>
                    <CreditCard className="h-7 w-7" />
                  </div>
                  <div className="text-center">
                    <h4 className="font-semibold text-foreground">Gift Card</h4>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Compre gift cards para seus alunos resgatarem
                    </p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Normal Flow - Step 2: Details (Image + Info) */}
          {formData.tipo === "normal" && currentStep === 2 && (
            <div className="flex flex-col gap-5">
              <div className="text-center">
                <h3 className="text-base font-semibold text-foreground">Detalhes da Recompensa</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Adicione a imagem, nome e descricao da recompensa.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-5">
                {/* Image Upload - First */}
                <div className="flex flex-col items-center gap-3 sm:w-40 shrink-0">
                  <label className="text-sm font-medium text-foreground self-start sm:self-center">Imagem</label>
                  {formData.imagem ? (
                    <div className="relative h-32 w-32 overflow-hidden rounded-xl border border-border bg-muted">
                      <Image
                        src={formData.imagem}
                        alt="Preview"
                        fill
                        className="object-cover"
                      />
                      <button
                        onClick={() => updateFormData("imagem", null)}
                        className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground hover:opacity-90"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex h-32 w-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/30 transition-colors hover:border-ring hover:bg-sidebar-accent">
                      <Upload className="h-6 w-6 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Enviar</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                  <p className="text-[10px] text-muted-foreground text-center">Opcional</p>
                </div>

                {/* Info Fields */}
                <div className="flex flex-col gap-4 flex-1">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-foreground">
                      Nome da recompensa <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.nome}
                      onChange={(e) => updateFormData("nome", e.target.value)}
                      placeholder="Ex: Adesivo Especial"
                      className="h-11 w-full rounded-xl border border-border bg-card px-4 text-sm outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/30 transition-colors"
                    />
                    {formData.nome.length > 0 && formData.nome.length < 3 && (
                      <p className="text-xs text-destructive">O nome deve ter pelo menos 3 caracteres</p>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-foreground">
                      Descricao <span className="text-muted-foreground">(opcional)</span>
                    </label>
                    <textarea
                      value={formData.descricao}
                      onChange={(e) => updateFormData("descricao", e.target.value)}
                      placeholder="Descreva a recompensa para os alunos..."
                      rows={3}
                      className="w-full resize-none rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/30 transition-colors"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Normal Flow - Step 3: Values */}
          {formData.tipo === "normal" && currentStep === 3 && (
            <div className="flex flex-col gap-5">
              <div className="text-center">
                <h3 className="text-base font-semibold text-foreground">Valores e Quantidades</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Defina o valor em moedas e a disponibilidade da recompensa.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-foreground">
                    Valor em moedas <span className="text-destructive">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-500">🪙</span>
                    <input
                      type="number"
                      min={1}
                      value={formData.valorMoedas}
                      onChange={(e) => updateFormData("valorMoedas", Math.max(1, parseInt(e.target.value) || 0))}
                      className="h-11 w-full rounded-xl border border-border bg-card pl-10 pr-4 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30 transition-colors"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-foreground">
                    Quantidade disponivel <span className="text-destructive">*</span>
                  </label>
                  <div className="relative">
                    <Package className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="number"
                      min={1}
                      value={formData.quantidadeDisponivel}
                      onChange={(e) => updateFormData("quantidadeDisponivel", Math.max(1, parseInt(e.target.value) || 0))}
                      className="h-11 w-full rounded-xl border border-border bg-card pl-10 pr-4 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30 transition-colors"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-foreground">
                    Limite por aluno <span className="text-destructive">*</span>
                  </label>
                  <div className="relative">
                    <Users className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="number"
                      min={1}
                      value={formData.limitePorAluno}
                      onChange={(e) => updateFormData("limitePorAluno", Math.max(1, parseInt(e.target.value) || 0))}
                      className="h-11 w-full rounded-xl border border-border bg-card pl-10 pr-4 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30 transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Preview */}
              <div className="rounded-xl border border-border bg-muted/30 p-4">
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">{formData.quantidadeDisponivel}</span> unidades disponiveis,
                  cada aluno pode resgatar ate <span className="font-medium text-foreground">{formData.limitePorAluno}</span> vez{formData.limitePorAluno !== 1 ? "es" : ""} por{" "}
                  <span className="font-medium text-amber-600">🪙 {formData.valorMoedas}</span> moedas cada.
                </p>
              </div>
            </div>
          )}

          {/* Normal Flow - Step 4: Classes */}
          {formData.tipo === "normal" && currentStep === 4 && (
            <div className="flex flex-col gap-5">
              <div className="text-center">
                <h3 className="text-base font-semibold text-foreground">Selecione as Turmas</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Escolha quais turmas terao acesso a esta recompensa.
                </p>
              </div>

              {/* Counter */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">{formData.turmasIds.length}</span> de {turmas.length} turmas selecionadas
                </span>
              </div>

              {/* Select All Toggle */}
              <button
                onClick={handleSelectAllTurmas}
                className={cn(
                  "flex items-center justify-between rounded-xl border px-4 py-3 transition-colors",
                  selectAllTurmas
                    ? "border-primary bg-primary/5"
                    : "border-border bg-muted/30 hover:bg-sidebar-accent"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "flex h-5 w-5 items-center justify-center rounded-md border-2 transition-colors",
                    selectAllTurmas
                      ? "border-primary bg-primary text-white"
                      : "border-border bg-card"
                  )}>
                    {selectAllTurmas && <Check className="h-3 w-3" />}
                  </div>
                  <span className="text-sm font-medium text-foreground">Selecionar todas as turmas</span>
                </div>
              </button>

              {/* Turmas List */}
              <div className="flex flex-col gap-1.5 rounded-xl border border-border bg-muted/20 p-2 max-h-60 overflow-auto">
                {turmas.map((turma) => {
                  const isSelected = formData.turmasIds.includes(turma.id)
                  return (
                    <button
                      key={turma.id}
                      onClick={() => toggleTurma(turma.id)}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-3 transition-colors text-left",
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
          )}

          {/* Giftcard Flow - Step 2: Select Gift Cards */}
          {formData.tipo === "giftcard" && currentStep === 2 && (
            <div className="flex flex-col gap-5">
              <div className="text-center">
                <h3 className="text-base font-semibold text-foreground">Monte seus Gift Cards</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Selecione a marca, valor e quantidade de cada gift card.
                </p>
              </div>

              {/* Gift Card Rows */}
              <div className="flex flex-col gap-3">
                {/* Header */}
                <div className="hidden sm:grid sm:grid-cols-[1fr_100px_80px_40px] gap-2 px-1 text-xs font-medium text-muted-foreground">
                  <span>Marca</span>
                  <span>Valor</span>
                  <span>Qtd</span>
                  <span></span>
                </div>

                {/* Rows */}
                {formData.giftcards.map((gc, index) => {
                  const brand = giftcardBrands.find((b) => b.id === gc.marca)
                  return (
                    <div
                      key={gc.id}
                      className="flex flex-col sm:grid sm:grid-cols-[1fr_100px_80px_72px] gap-2 rounded-xl border border-border bg-card p-3 sm:p-2 sm:items-center"
                    >
                      {/* Brand Select */}
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 shrink-0 overflow-hidden rounded-lg bg-muted">
                          <Image
                            src={brand?.logo || ""}
                            alt={brand?.nome || ""}
                            width={32}
                            height={32}
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <select
                          value={gc.marca}
                          onChange={(e) => {
                            const newBrand = giftcardBrands.find(b => b.id === e.target.value)
                            updateGiftcard(gc.id, "marca", e.target.value)
                            // Reset value to first available if current value is not available
                            if (newBrand && !newBrand.valoresDisponiveis.includes(gc.valor)) {
                              updateGiftcard(gc.id, "valor", newBrand.valoresDisponiveis[0])
                            }
                          }}
                          className="flex-1 h-9 rounded-lg border border-border bg-background px-2 text-sm outline-none focus:border-ring"
                        >
                          {giftcardBrands.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.nome}
                            </option>
                          ))}
                        </select>
                        {/* Info Button */}
                        <button
                          onClick={() => setShowBrandInfo(gc.marca)}
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                          title="Ver informacoes"
                        >
                          <Info className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Value Select - Using brand-specific values */}
                      <select
                        value={gc.valor}
                        onChange={(e) => updateGiftcard(gc.id, "valor", Number(e.target.value))}
                        className="h-9 rounded-lg border border-border bg-background px-2 text-sm outline-none focus:border-ring"
                      >
                        {(brand?.valoresDisponiveis || giftcardValues).map((val) => (
                          <option key={val} value={val}>
                            R$ {val}
                          </option>
                        ))}
                      </select>

                      {/* Quantity */}
                      <input
                        type="number"
                        min={1}
                        max={50}
                        value={gc.quantidade}
                        onChange={(e) => updateGiftcard(gc.id, "quantidade", Math.max(1, Math.min(50, parseInt(e.target.value) || 1)))}
                        className="h-9 rounded-lg border border-border bg-background px-2 text-sm text-center outline-none focus:border-ring"
                      />

                      {/* Actions */}
                      <div className="flex items-center gap-1 self-end sm:self-auto">
                        <button
                          onClick={() => removeGiftcard(gc.id)}
                          disabled={formData.giftcards.length === 1}
                          className={cn(
                            "flex h-9 w-9 items-center justify-center rounded-lg transition-colors",
                            formData.giftcards.length === 1
                              ? "text-muted-foreground/30 cursor-not-allowed"
                              : "text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          )}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )
                })}

                {/* Add Row Button */}
                <button
                  onClick={addGiftcardRow}
                  className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border py-3 text-sm font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary hover:bg-primary/5"
                >
                  <Plus className="h-4 w-4" />
                  Adicionar outro gift card
                </button>
              </div>

              {/* Total */}
              {formData.giftcards.length > 0 && totalGiftcardValue > 0 && (
                <div className="flex items-center justify-between rounded-xl bg-primary/10 px-4 py-3">
                  <span className="text-sm font-medium text-foreground">
                    Total ({formData.giftcards.reduce((sum, gc) => sum + gc.quantidade, 0)} gift cards)
                  </span>
                  <span className="text-lg font-bold text-primary">
                    R$ {totalGiftcardValue.toLocaleString("pt-BR")},00
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Giftcard Flow - Step 3: Checkout */}
          {formData.tipo === "giftcard" && currentStep === 3 && (
            <div className="flex flex-col gap-5">
              <div className="text-center">
                <h3 className="text-base font-semibold text-foreground">Confirmar Compra</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Revise seu pedido antes de prosseguir para o pagamento.
                </p>
              </div>

              {/* Order Summary */}
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="border-b border-border bg-muted/30 px-4 py-3">
                  <h4 className="text-sm font-semibold text-foreground">Resumo do Pedido</h4>
                </div>
                <div className="p-4 space-y-3">
                  {formData.giftcards.map((gc) => {
                    const brand = giftcardBrands.find((b) => b.id === gc.marca)
                    return (
                      <div key={gc.id} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          {gc.quantidade}x {brand?.nome || "Gift Card"} R$ {gc.valor},00
                        </span>
                        <span className="font-medium text-foreground">
                          R$ {(gc.valor * gc.quantidade).toLocaleString("pt-BR")},00
                        </span>
                      </div>
                    )
                  })}
                  <div className="border-t border-border pt-3 flex items-center justify-between">
                    <span className="font-semibold text-foreground">Total a pagar</span>
                    <span className="text-xl font-bold text-primary">
                      R$ {totalGiftcardValue.toLocaleString("pt-BR")},00
                    </span>
                  </div>
                </div>
              </div>

              {/* Payment Info */}
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                <p className="text-sm text-blue-800">
                  <strong>Como funciona:</strong> Apos o pagamento, os gift cards serao adicionados como <strong>rascunho</strong> na sua lista de recompensas. Voce podera configurar turmas, valor em moedas e estoque antes de disponibilizar para os alunos.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border px-6 py-4">
          <button
            onClick={handleBack}
            disabled={currentStep === 1}
            className={cn(
              "rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors",
              currentStep === 1
                ? "opacity-50 cursor-not-allowed"
                : "hover:bg-sidebar-accent"
            )}
          >
            Voltar
          </button>

          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            Passo {currentStep} de {totalSteps}
          </div>

          <button
            onClick={handleNext}
            disabled={!canProceed()}
            className={cn(
              "flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-semibold transition-all",
              canProceed()
                ? "bg-primary text-primary-foreground hover:opacity-90"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            )}
          >
            {currentStep === totalSteps ? (
              <>
                {formData.tipo === "giftcard" ? (
                  <>
                    <ShoppingCart className="h-4 w-4" />
                    Pagar e Criar Rascunhos
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Criar Recompensa
                  </>
                )}
              </>
            ) : (
              <>
                Proximo
                <ChevronRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Brand Info Modal */}
      {showBrandInfo && selectedBrandInfo && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="relative w-full max-w-lg rounded-2xl border border-border bg-card shadow-xl max-h-[80vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-border px-6 py-4">
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-muted">
                <Image
                  src={selectedBrandInfo.logo}
                  alt={selectedBrandInfo.nome}
                  width={48}
                  height={48}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-foreground">{selectedBrandInfo.nome}</h3>
                <p className="text-sm text-muted-foreground">{selectedBrandInfo.nome}</p>
              </div>
              <button
                onClick={() => setShowBrandInfo(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto">
              <div className="border-t-4 border-primary" />
              <div className="flex flex-col gap-5 p-6">
                {/* Onde pode ser usado */}
                <div className="flex flex-col gap-1.5">
                  <h4 className="text-sm font-semibold text-foreground">Onde pode ser usado</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedBrandInfo.ondeUsar.map((local, idx) => (
                      <span key={idx} className="text-sm text-primary">
                        {local.startsWith("http") ? (
                          <a href={local} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:underline">
                            {local}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          local
                        )}
                        {idx < selectedBrandInfo.ondeUsar.length - 1 && <span className="text-muted-foreground ml-2">|</span>}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Descricao */}
                <div className="flex flex-col gap-1.5">
                  <h4 className="text-sm font-semibold text-foreground">Descricao</h4>
                  <p className="text-sm text-muted-foreground">{selectedBrandInfo.descricao}</p>
                </div>

                {/* Instrucoes */}
                <div className="flex flex-col gap-1.5">
                  <h4 className="text-sm font-semibold text-foreground">Instrucoes de resgate</h4>
                  <p className="text-sm text-muted-foreground">{selectedBrandInfo.instrucoes}</p>
                </div>

                {/* Termos */}
                <div className="flex flex-col gap-1.5">
                  <h4 className="text-sm font-semibold text-foreground">Termos e condicoes</h4>
                  <a
                    href={selectedBrandInfo.termos}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    Ver termos e condicoes
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>

                {/* Valores disponiveis */}
                <div className="flex flex-col gap-2">
                  <h4 className="text-sm font-semibold text-foreground">Valores disponiveis</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedBrandInfo.valoresDisponiveis.map((valor) => (
                      <span
                        key={valor}
                        className="rounded-lg border border-border bg-muted/50 px-3 py-1.5 text-sm font-medium text-foreground"
                      >
                        R$ {valor},00
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end border-t border-border px-6 py-4">
              <button
                onClick={() => setShowBrandInfo(null)}
                className="rounded-lg border border-border bg-card px-5 py-2 text-sm font-medium text-foreground hover:bg-sidebar-accent transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
