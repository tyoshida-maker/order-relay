import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import NavBar from '@/components/NavBar'
import AuthGuard from '@/components/AuthGuard'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Order Relay - 商流・配送管理システム',
  description: '中間卵売業者の発注書・納品書を自動生成',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body className={inter.className}>
        <AuthGuard>
          <NavBar />
          <div className="max-w-7xl mx-auto px-4 py-6">
            {children}
          </div>
        </AuthGuard>
      </body>
    </html>
  )
}
