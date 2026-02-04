import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Briwax - Portfolio de Equipamentos',
  description: 'Portfolio profissional de equipamentos técnicos',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">{children}</body>
    </html>
  )
}
