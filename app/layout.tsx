import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Link from 'next/link'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Order Relay - 発注書・納品書生成システム',
  description: '中間卸業者向け発注書・納品書自動生成',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body className={inter.className}>
        <nav className="bg-blue-700 text-white shadow-lg">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center h-14">
              <Link href="/" className="font-bold text-lg mr-8 hover:text-blue-200">📦 Order Relay</Link>
              <div className="flex gap-1 text-sm flex-wrap">
                <Link href="/companies" className="px-3 py-1 rounded hover:bg-blue-600">取引先</Link>
                <Link href="/products" className="px-3 py-1 rounded hover:bg-blue-600">商品</Link>
                <Link href="/prices" className="px-3 py-1 rounded hover:bg-blue-600">価格</Link>
                <Link href="/flows" className="px-3 py-1 rounded hover:bg-blue-600">商流</Link>
                <Link href="/templates" className="px-3 py-1 rounded hover:bg-blue-600">テンプレ</Link>
                <Link href="/orders/new" className="px-3 py-2 bg-orange-500 rounded font-semibold hover:bg-orange-400">＋発注</Link>
              </div>
            </div>
          </div>
        </nav>
        <main className="max-w-7xl mx-auto px-4 py-6">
          {children}
        </main>
      </body>
    </html>
  )
}
