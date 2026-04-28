import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
    title: 'Order Relay - 発注中継システム',
    description: '中間卸業者向け発注・納品書自動生成システム',
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
          <html lang="ja">
                <body className="bg-gray-50 min-h-screen">
                        <nav className="bg-white shadow-sm border-b">
                                  <div className="max-w-7xl mx-auto px-4 py-3 flex gap-6">
                                              <a href="/" className="font-bold text-lg text-blue-600">OrderRelay</a>a>
                                              <a href="/companies" className="text-gray-600 hover:text-blue-600">取引先</a>a>
                                              <a href="/products" className="text-gray-600 hover:text-blue-600">商品</a>a>
                                              <a href="/prices" className="text-gray-600 hover:text-blue-600">価格</a>a>
                                              <a href="/flows" className="text-gray-600 hover:text-blue-600">商流</a>a>
                                              <a href="/orders/new" className="text-gray-600 hover:text-blue-600">発注入力</a>a>
                                              <a href="/orders" className="text-gray-600 hover:text-blue-600">発注一覧</a>a>
                                  </div>div>
                        </nav>nav>
                        <main className="max-w-7xl mx-auto px-4 py-6">
                          {children}
                        </main>main>
                </body>body>
          </html>html>
        )
}</html>
