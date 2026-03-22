"use client"

import { useState, useEffect } from "react"

import {
  Users,
  TrendingUp,
  Clock,
  Flame,
  BookOpen,
  ChevronDown,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
} from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Tooltip,
  Legend,
} from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { cn } from "@/lib/utils"
import { FilterDropdown } from "@/components/filter-dropdown"

// Mock data for reports
const statsCards = [
  {
    title: "Total de Alunos",
    value: 342,
    change: +12,
    changeLabel: "vs. mes anterior",
    icon: Users,
    color: "bg-primary/10 text-primary",
  },
  {
    title: "Altamente Engajados",
    value: 156,
    change: +8,
    changeLabel: "vs. mes anterior",
    icon: Flame,
    color: "bg-accent text-accent-foreground",
  },
  {
    title: "Tempo Medio de Estudo",
    value: "2h 34min",
    change: +15,
    changeLabel: "vs. mes anterior",
    icon: Clock,
    color: "bg-secondary text-secondary-foreground",
  },
  {
    title: "Atividades Concluidas",
    value: 1847,
    change: -3,
    changeLabel: "vs. mes anterior",
    icon: BookOpen,
    color: "bg-muted text-muted-foreground",
  },
]

// Chart colors using CSS variables (computed at runtime)
const getChartColors = () => {
  if (typeof window === "undefined") {
    // SSR fallback colors
    return {
      primary: "oklch(0.45 0.20 292)",
      chart1: "oklch(0.45 0.20 292)",
      chart2: "oklch(0.90 0.17 162)",
      chart3: "oklch(0.62 0.19 260)",
      chart4: "oklch(0.55 0.22 263)",
      chart5: "oklch(0.49 0.22 264)",
      border: "oklch(0.922 0 0)",
      muted: "oklch(0.556 0 0)",
    }
  }
  const style = getComputedStyle(document.documentElement)
  return {
    primary: style.getPropertyValue("--primary").trim() || "oklch(0.45 0.20 292)",
    chart1: style.getPropertyValue("--chart-1").trim() || "oklch(0.45 0.20 292)",
    chart2: style.getPropertyValue("--chart-2").trim() || "oklch(0.90 0.17 162)",
    chart3: style.getPropertyValue("--chart-3").trim() || "oklch(0.62 0.19 260)",
    chart4: style.getPropertyValue("--chart-4").trim() || "oklch(0.55 0.22 263)",
    chart5: style.getPropertyValue("--chart-5").trim() || "oklch(0.49 0.22 264)",
    border: style.getPropertyValue("--border").trim() || "oklch(0.922 0 0)",
    muted: style.getPropertyValue("--muted-foreground").trim() || "oklch(0.556 0 0)",
  }
}

// Topics data for pie chart - colors will be applied dynamically
const topicsDataBase = [
  { name: "Matematica", value: 35, colorKey: "chart1" },
  { name: "Portugues", value: 25, colorKey: "chart2" },
  { name: "Ciencias", value: 20, colorKey: "chart3" },
  { name: "Historia", value: 12, colorKey: "chart4" },
  { name: "Geografia", value: 8, colorKey: "chart5" },
]

// Engagement over time data
const engagementData = [
  { month: "Jan", engajados: 120, total: 300 },
  { month: "Fev", engajados: 135, total: 310 },
  { month: "Mar", engajados: 142, total: 320 },
  { month: "Abr", engajados: 138, total: 325 },
  { month: "Mai", engajados: 150, total: 335 },
  { month: "Jun", engajados: 156, total: 342 },
]

// Study time by class
const studyTimeByClass = [
  { turma: "6A", tempo: 180 },
  { turma: "6B", tempo: 165 },
  { turma: "7A", tempo: 210 },
  { turma: "7B", tempo: 145 },
  { turma: "8A", tempo: 195 },
  { turma: "8B", tempo: 170 },
  { turma: "9A", tempo: 220 },
  { turma: "9B", tempo: 155 },
]

// Top performing students
const topStudents = [
  { nome: "Ana Clara", turma: "7A", pontos: 2450, avatar: "AC" },
  { nome: "Pedro Henrique", turma: "9A", pontos: 2380, avatar: "PH" },
  { nome: "Julia Santos", turma: "8A", pontos: 2290, avatar: "JS" },
  { nome: "Lucas Oliveira", turma: "7A", pontos: 2150, avatar: "LO" },
  { nome: "Maria Eduarda", turma: "6A", pontos: 2080, avatar: "ME" },
]

type Period = "7dias" | "30dias" | "90dias" | "ano"

export default function RelatoriosPage() {
  const [selectedPeriod, setSelectedPeriod] = useState<Period>("30dias")
  const [chartColors, setChartColors] = useState(getChartColors())

  // Update colors on mount to get computed CSS values
  useEffect(() => {
    setChartColors(getChartColors())
  }, [])

  // Topics data with dynamic colors
  const topicsData = topicsDataBase.map((topic) => ({
    ...topic,
    color: chartColors[topic.colorKey as keyof typeof chartColors],
  }))

  const periods: { value: Period; label: string }[] = [
    { value: "7dias", label: "Ultimos 7 dias" },
    { value: "30dias", label: "Ultimos 30 dias" },
    { value: "90dias", label: "Ultimos 90 dias" },
    { value: "ano", label: "Este ano" },
  ]

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Relatorios</h1>
          <p className="text-sm text-muted-foreground">
            Acompanhe o desempenho dos alunos e da escola
          </p>
        </div>

        {/* Period Selector */}
        <FilterDropdown
          label="Periodo"
          options={periods.map((p) => ({ value: p.value, label: p.label }))}
          value={selectedPeriod}
          onChange={(v) => setSelectedPeriod(v as Period)}
          icon={<Calendar className="h-4 w-4 text-muted-foreground" />}
        />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statsCards.map((stat) => (
          <div
            key={stat.title}
            className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 shadow-card"
          >
            <div className="flex items-center justify-between">
              <div className={cn(
                "flex h-10 w-10 items-center justify-center rounded-xl",
                stat.color
              )}>
                <stat.icon className="h-5 w-5" />
              </div>
              <div className={cn(
                "flex items-center gap-1 text-xs font-medium",
                stat.change >= 0 ? "text-primary" : "text-destructive"
              )}>
                {stat.change >= 0 ? (
                  <ArrowUpRight className="h-3.5 w-3.5" />
                ) : (
                  <ArrowDownRight className="h-3.5 w-3.5" />
                )}
                {Math.abs(stat.change)}%
              </div>
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.title}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Engagement Over Time */}
        <div className="flex flex-col rounded-2xl border border-border bg-card p-5 shadow-card">
          <div className="mb-4">
            <h3 className="text-base font-semibold text-foreground">Engajamento ao Longo do Tempo</h3>
            <p className="text-xs text-muted-foreground">Alunos engajados vs. total de alunos</p>
          </div>
          <ChartContainer
            config={{
              engajados: {
                label: "Engajados",
                color: chartColors.chart1,
              },
              total: {
                label: "Total",
                color: chartColors.border,
              },
            }}
            className="h-[280px]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={engagementData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12 }}
                  className="fill-muted-foreground"
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12 }}
                  className="fill-muted-foreground"
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke={chartColors.border}
                  strokeWidth={2}
                  dot={false}
                  name="Total"
                />
                <Line
                  type="monotone"
                  dataKey="engajados"
                  stroke={chartColors.chart1}
                  strokeWidth={2}
                  dot={{ fill: chartColors.chart1, strokeWidth: 0, r: 4 }}
                  activeDot={{ r: 6, fill: chartColors.chart1 }}
                  name="Engajados"
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>

        {/* Topics Distribution */}
        <div className="flex flex-col rounded-2xl border border-border bg-card p-5 shadow-card">
          <div className="mb-4">
            <h3 className="text-base font-semibold text-foreground">Temas Trabalhados</h3>
            <p className="text-xs text-muted-foreground">Distribuicao por disciplina</p>
          </div>
          <div className="flex flex-1 items-center gap-6">
            <ChartContainer
              config={{
                value: {
                  label: "Percentual",
                },
              }}
              className="h-[200px] w-[200px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={topicsData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {topicsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload
                        return (
                          <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-lg">
                            <p className="text-sm font-medium text-foreground">{data.name}</p>
                            <p className="text-xs text-muted-foreground">{data.value}%</p>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
            <div className="flex flex-col gap-2">
              {topicsData.map((topic) => (
                <div key={topic.name} className="flex items-center gap-2">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: topic.color }}
                  />
                  <span className="text-sm text-foreground">{topic.name}</span>
                  <span className="ml-auto text-sm font-medium text-muted-foreground">{topic.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Study Time by Class */}
        <div className="flex flex-col rounded-2xl border border-border bg-card p-5 shadow-card">
          <div className="mb-4">
            <h3 className="text-base font-semibold text-foreground">Tempo de Estudo por Turma</h3>
            <p className="text-xs text-muted-foreground">Media de minutos por semana</p>
          </div>
          <ChartContainer
            config={{
              tempo: {
                label: "Tempo (min)",
                color: chartColors.chart2,
              },
            }}
            className="h-[280px]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={studyTimeByClass} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
                <XAxis
                  dataKey="turma"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12 }}
                  className="fill-muted-foreground"
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12 }}
                  className="fill-muted-foreground"
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar
                  dataKey="tempo"
                  fill={chartColors.chart2}
                  radius={[6, 6, 0, 0]}
                  name="Tempo (min)"
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>

        {/* Top Students */}
        <div className="flex flex-col rounded-2xl border border-border bg-card p-5 shadow-card">
          <div className="mb-4">
            <h3 className="text-base font-semibold text-foreground">Top Alunos</h3>
            <p className="text-xs text-muted-foreground">Maiores pontuacoes do periodo</p>
          </div>
          <div className="flex flex-col gap-3">
            {topStudents.map((student, index) => (
              <div
                key={student.nome}
                className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-3"
              >
                <div className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold",
                  index === 0 ? "bg-accent text-accent-foreground" :
                  index === 1 ? "bg-secondary text-secondary-foreground" :
                  index === 2 ? "bg-primary/10 text-primary" :
                  "bg-muted text-muted-foreground"
                )}>
                  {index + 1}
                </div>
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {student.avatar}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{student.nome}</p>
                  <p className="text-xs text-muted-foreground">Turma {student.turma}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-foreground">{student.pontos.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">pontos</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
