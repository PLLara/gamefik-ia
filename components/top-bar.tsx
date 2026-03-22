"use client"

import { useState } from "react"
import { Sparkles } from "lucide-react"

export function TopBar() {
  const [aiPrompt, setAiPrompt] = useState("")

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-card px-4">
      {/* Left - AI Creation Search with Glowing Border */}
      <div className="flex flex-1 items-center max-w-xl">
        <div className="group relative flex w-full items-center">
          {/* Animated glowing border container */}
          <div className="absolute -inset-[1.5px] rounded-full overflow-hidden">
            <div 
              className="absolute inset-0 animate-[spin_3s_linear_infinite]"
              style={{
                background: "conic-gradient(from 0deg, transparent 0%, transparent 60%, #67e8f9 70%, #f0abfc 80%, #fde047 90%, transparent 100%)",
              }}
            />
          </div>
          {/* Inner background to create border effect */}
          <div className="absolute inset-0 rounded-full bg-card" />
          {/* Input field */}
          <Sparkles className="absolute left-3 z-10 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            placeholder="Crie algo com IA... atividades, provas, planos de aula..."
            className="relative z-10 h-9 w-full rounded-full bg-secondary/50 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:bg-secondary/70 transition-all"
          />
        </div>
      </div>




    </header>
  )
}
