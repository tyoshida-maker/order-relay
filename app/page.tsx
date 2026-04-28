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
          { href: '/flows', icon: '🔄', label: '商流定義', desc: 'A→B→C の流れを定義', color: 'bg-purple-50 border-purple-200 hover:bg-purple-100' },
          { href: '/templates', icon: '📄', label: 'PDFテンプレ', desc: 'テンプレ登録・座標設定', color: 'bg-pink-50 border-pink-200 hover:bg-pink-100' },
        ].map(item => (
          <Link key={item.href} href={item.href} className={`border-2 rounded-xl p-5 transition ${item.color}`}>
            <div className="text-3xl mb-2">{item.icon}</div>
            <div className="font-bold text-gray-800">{item.label}</div>
            <div className="text-sm text-gray-500 mt-1">{item.desc}</div>
          </Link>
        ))}
      </div>
      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <h2 className="font-semibold text-gray-700 mb-2">使い方</h2>
        <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
          <li>取引先・商品・価格をCSVで一括登録</li>
          <li>商流（A社→B社→C社）を定義</li>
          <li>発注入力で商品・数量を入力</li>
          <li>「PDF一括生成」ボタンで全書類をまとめてダウンロード</li>
        </ol>
      </div>
    </div>
  )
}
