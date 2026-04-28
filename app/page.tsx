import Link from 'next/link'

export default function Home() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-2">Order Relay</h1>
      <p className="text-gray-500 mb-8">中間卸業者の発注書・納品書を自動生成するシステム</p>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          { href: '/orders/new', icon: '📝', label: '新規発注', desc: '発注入力・PDF生成', color: 'bg-orange-50 border-orange-200 hover:bg-orange-100' },
          { href: '/companies', icon: '🏢', label: '取引先管理', desc: '取引先の登録・CSV取込', color: 'bg-blue-50 border-blue-200 hover:bg-blue-100' },
          { href: '/products', icon: '📦', label: '商品管理', desc: '商品マスタの登録・CSV取込', color: 'bg-green-50 border-green-200 hover:bg-green-100' },
          { href: '/prices', icon: '💴', label: '価格管理', desc: '取引先別価格のCSV取込', color: 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100' },
          { href: '/flows', icon: '🔄', label: '商流定義', desc: 'A→B→C の流れを定義', color: 'bg-cyan-50 border-cyan-200 hover:bg-cyan-100' },
          { href: '/templates', icon: '📄', label: 'PDFテンプレ', desc: 'テンプレ登録・座標設定', color: 'bg-pink-50 border-pink-200 hover:bg-pink-100' },
        ].map(({ href, icon, label, desc, color }) => (
          <Link
            key={href}
            href={href}
            className={`border rounded-xl p-4 flex flex-col items-start gap-2 transition ${color}`}
          >
            <span className="text-2xl">{icon}</span>
            <div>
              <div className="font-semibold text-gray-700">{label}</div>
              <div className="text-xs text-gray-500">{desc}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* 使い方 */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-700 mb-2">使い方</h2>
        <ol className="list-decimal list-inside text-sm text-gray-600 space-y-1">
          <li>取引先・商品・価格をCSVで一括登録</li>
          <li>商流（A社→B社→C社）を定義</li>
          <li>発注入力で商品・数量を入力</li>
          <li>「PDF一括生成」ボタンで全書類をまとめてダウンロード</li>
        </ol>
      </div>

      {/* サンプルCSVダウンロード */}
      <div className="mt-8 p-4 bg-gray-50 border border-gray-200 rounded-xl">
        <h2 className="text-lg font-semibold text-gray-700 mb-1">📥 サンプルCSVダウンロード</h2>
        <p className="text-xs text-gray-500 mb-3">各CSVをダウンロードして内容を入力後、対応する管理画面からCSV取込を行ってください。</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <a
            href="/sample_companies.csv"
            download="sample_companies.csv"
            className="flex items-center gap-2 px-4 py-2 bg-white border border-blue-200 rounded-lg text-sm text-blue-700 hover:bg-blue-50 transition"
          >
            <span>🏢</span>
            <div>
              <div className="font-medium">取引先サンプル</div>
              <div className="text-xs text-gray-400">sample_companies.csv</div>
            </div>
          </a>
          <a
            href="/sample_products.csv"
            download="sample_products.csv"
            className="flex items-center gap-2 px-4 py-2 bg-white border border-green-200 rounded-lg text-sm text-green-700 hover:bg-green-50 transition"
          >
            <span>📦</span>
            <div>
              <div className="font-medium">商品サンプル</div>
              <div className="text-xs text-gray-400">sample_products.csv</div>
            </div>
          </a>
          <a
            href="/sample_prices.csv"
            download="sample_prices.csv"
            className="flex items-center gap-2 px-4 py-2 bg-white border border-yellow-200 rounded-lg text-sm text-yellow-700 hover:bg-yellow-50 transition"
          >
            <span>💴</span>
            <div>
              <div className="font-medium">価格サンプル</div>
              <div className="text-xs text-gray-400">sample_prices.csv</div>
            </div>
          </a>
        </div>
      </div>
    </div>
  )
}
