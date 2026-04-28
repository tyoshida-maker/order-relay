import Link from 'next/link'

export default function Home() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-2">Order Relay</h1>
      <p className="text-gray-500 mb-8">ä¸­éå¸æ¥­èã®çºæ³¨æ¸ã»ç´åæ¸ãèªåçæããã·ã¹ãã </p>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          { href: '/orders/new', icon: 'ð', label: 'æ°è¦çºæ³¨', desc: 'çºæ³¨å¥åã»PDFçæ', color: 'bg-orange-50 border-orange-200 hover:bg-orange-100' },
          { href: '/companies', icon: 'ð¢', label: 'åå¼åç®¡ç', desc: 'åå¼åã®ç»é²ã»CSVåè¾¼', color: 'bg-blue-50 border-blue-200 hover:bg-blue-100' },
          { href: '/products', icon: 'ð¦', label: 'ååç®¡ç', desc: 'ååãã¹ã¿ã®ç»é²ã»CSVåè¾¼', color: 'bg-green-50 border-green-200 hover:bg-green-100' },
          { href: '/prices', icon: 'ð´', label: 'ä¾¡æ ¼ç®¡ç', desc: 'åå¼åå¥ä¾¡æ ¼ã®CSVåè¾¼', color: 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100' },
          { href: '/flows', icon: 'ð', label: 'åæµå®ç¾©', desc: 'AâBâC ã®æµããå®ç¾©', color: 'bg-cyan-50 border-cyan-200 hover:bg-cyan-100' },
          { href: '/templates', icon: 'ð', label: 'PDFãã³ãã¬', desc: 'ãã³ãã¬ç»é²ã»åº§æ¨è¨­å®', color: 'bg-pink-50 border-pink-200 hover:bg-pink-100' },
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

      {/* ä½¿ãæ¹ */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-700 mb-2">ä½¿ãæ¹</h2>
        <ol className="list-decimal list-inside text-sm text-gray-600 space-y-1">
          <li>åå¼åã»ååã»ä¾¡æ ¼ãCSVã§ä¸æ¬ç»é²</li>
          <li>åæµï¼Aç¤¾âBç¤¾âCç¤¾ï¼ãå®ç¾©</li>
          <li>çºæ³¨å¥åã§ååã»æ°éãå¥å</li>
          <li>ãPDFä¸æ¬çæããã¿ã³ã§å¨æ¸é¡ãã¾ã¨ãã¦ãã¦ã³ã­ã¼ã</li>
        </ol>
      </div>

      {/* ãµã³ãã«CSVãã¦ã³ã­ã¼ã */}
      <div className="mt-8 p-4 bg-gray-50 border border-gray-200 rounded-xl">
        <h2 className="text-lg font-semibold text-gray-700 mb-1">ð¥ ãµã³ãã«CSVãã¦ã³ã­ã¼ã</h2>
        <p className="text-xs text-gray-500 mb-3">åCSVããã¦ã³ã­ã¼ããã¦åå®¹ãå¥åå¾ãå¯¾å¿ããç®¡çç»é¢ããCSVåè¾¼ãè¡ã£ã¦ãã ããã</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <a
            href="/sample_companies.csv"
            download="sample_companies.csv"
            className="flex items-center gap-2 px-4 py-2 bg-white border border-blue-200 rounded-lg text-sm text-blue-700 hover:bg-blue-50 transition"
          >
            <span>ð¢</span>
            <div>
              <div className="font-medium">åå¼åãµã³ãã«</div>
              <div className="text-xs text-gray-400">sample_companies.csv</div>
            </div>
          </a>
          <a
            href="/sample_products.csv"
            download="sample_products.csv"
            className="flex items-center gap-2 px-4 py-2 bg-white border border-green-200 rounded-lg text-sm text-green-700 hover:bg-green-50 transition"
          >
            <span>ð¦</span>
            <div>
              <div className="font-medium">ååãµã³ãã«</div>
              <div className="text-xs text-gray-400">sample_products.csv</div>
            </div>
          </a>
          <a
            href="/sample_prices.csv"
            download="sample_prices.csv"
            className="flex items-center gap-2 px-4 py-2 bg-white border border-yellow-200 rounded-lg text-sm text-yellow-700 hover:bg-yellow-50 transition"
          >
            <span>ð´</span>
            <div>
              <div className="font-medium">ä¾¡æ ¼ãµã³ãã«</div>
              <div className="text-xs text-gray-400">sample_prices.csv</div>
            </div>
          </a>
        </div>
      </div>
    </div>
  )
}
