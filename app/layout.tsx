import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from 'sonner'
import { ClickRippleProvider } from '@/components/click-ripple-provider'
import './globals.css'

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" })
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" })

export const metadata: Metadata = {
  title: 'Gamefik - Chat IA',
  description: 'Crie atividades educacionais com inteligencia artificial',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body
        className={`${geist.variable} ${geistMono.variable} font-sans antialiased`}
        suppressHydrationWarning
      >
        <ClickRippleProvider />
        <main className="min-h-screen">
          {children}
        </main>
        <Toaster richColors position="top-right" />
        <Analytics />
      </body>
    </html>
  )
}
