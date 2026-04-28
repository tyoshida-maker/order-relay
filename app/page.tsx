export default function Home() {
  return (
      <div className="text-center py-20">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">発注リレーシステム</h1>
                  <p className="text-gray-600 mb-8">中間卸業者向け発注・納品書自動生成システム</p>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
                                <a href="/companies" className="bg-white p-6 rounded-lg shadow hover:shadow-md transition">
                                          <div className="text-3xl mb-2">🏢</div>
                                                    <div className="font-semibold">取引先管理</div>
                                                            </a>
                                                                    <a href="/products" className="bg-white p-6 rounded-lg shadow hover:shadow-md transition">
                                                                              <div className="text-3xl mb-2">📦</div>
                                                                                        <div className="font-semibold">商品管理
