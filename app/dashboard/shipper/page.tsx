'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import {
  BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'

type Period = 'today' | 'week' | 'month' | 'all'

type FlowStep = { role: string; company_id: string; label?: string; step?: number }

type Stats = {
  awaitingShipment: number
  todayScheduled: number
  shippedThisMonth: number
  delayed: number
}

type OrderRow = {
  id: string
  order_no: string
  status: string
  delivery_date: string | null
  created_at: string
  from_company_name: string
  item_name: string
  item_qty: number
  isShipped: boolean
  isDelayed: boolean
}

const STATUS_LABEL: Record<string, string> = {
  draft: '下書き', confirmed: '確認済み', in_progress: '進行中',
  completed: '完了', cancelled: 'キャンセル',
  shipped: '発送済', approved: '承認済',
}

const STATUS_COLOR: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  confirmed: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-amber-100 text-amber-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
  shipped: 'bg-blue-100 text-blue-700',
  approved: 'bg-yellow-100 text-yellow-700',
}

export default function ShipperDashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [statsLoading, setStatsLoading] = useState(true)
  const [userEmail, setUserEmail] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [companyName, setCompanyName] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [period, setPeriod] = useState<Period>('month')
  const [stats, setStats] = useState<Stats>({ awaitingShipment: 0, todayScheduled: 0, shippedThisMonth: 0, delayed: 0 })
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [weeklyData, setWeeklyData] = useState<{ day: string; count: number }[]>([])

  // 出荷登録フォーム
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [carrier, setCarrier] = useState('')
  const [trackingNo, setTrackingNo] = useState('')
  const [shipping, setShipping] = useState(false)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: profile } = await supabase
        .from('or_user_profiles')
        .select('role, company_id, display_name')
        .eq('id', user.id)
        .single()

      if (!profile) { router.push('/login'); return }

      const allowed = ['admin', 'shipper', 'partner']
      if (!allowed.includes(profile.role)) { router.push('/login'); return }

      setUserEmail(user.email || '')
      setDisplayName(profile.display_name || '')
      setIsAdmin(profile.role === 'admin')
      setCompanyId(profile.company_id)

      if (profile.company_id) {
        const { data: company } = await supabase
          .from('companies').select('name').eq('id', profile.company_id).single()
        setCompanyName(company?.name || '')
      } else {
        setCompanyName('全社（管理者）')
      }

      setLoading(false)
    }
    init()
  }, [router])

  useEffect(() => {
    if (loading) return
    fetchData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, period, companyId, isAdmin])

  const getPeriodFilter = (): string | null => {
    const now = new Date()
    if (period === 'today') return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
    if (period === 'week') return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
    if (period === 'month') return new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    return null
  }

  const fetchData = async () => {
    setStatsLoading(true)
    try {
      const periodFilter = getPeriodFilter()
      const today = new Date().toISOString().split('T')[0]

      // 1. flows を取得して自社が seller として含まれる flow_id を抽出
      const { data: flowsAll } = await supabase
        .from('flows').select('id, steps')

      const myFlowIds: string[] = []
      ;(flowsAll || []).forEach((f: any) => {
        const steps: FlowStep[] = Array.isArray(f.steps) ? f.steps : []
        if (isAdmin) {
          myFlowIds.push(f.id)
        } else if (companyId) {
          const isSeller = steps.some(s => s.role === 'seller' && s.company_id === companyId)
          if (isSeller) myFlowIds.push(f.id)
        }
      })

      if (myFlowIds.length === 0 && !isAdmin) {
        setStats({ awaitingShipment: 0, todayScheduled: 0, shippedThisMonth: 0, delayed: 0 })
        setOrders([])
        setWeeklyData([])
        setStatsLoading(false)
        return
      }

      // 2. orders を取得（from_company_id JOIN で発注元社名も取得）
      let q = supabase
        .from('orders')
        .select('id, order_no, status, delivery_date, created_at, from_company_id, flow_id')
        .order('created_at', { ascending: false })

      if (!isAdmin) q = q.in('flow_id', myFlowIds)
      if (periodFilter) q = q.gte('created_at', periodFilter)

      const { data: ordersRaw } = await q

      // 3. from_company_id の会社名を一括取得
      const companyIds = [...new Set((ordersRaw || []).map((o: any) => o.from_company_id).filter(Boolean))]
      const companyMap: Record<string, string> = {}
      if (companyIds.length > 0) {
        const { data: companies } = await supabase
          .from('companies').select('id, name').in('id', companyIds)
        ;(companies || []).forEach((c: any) => { companyMap[c.id] = c.name })
      }

      // 4. 各orderのorder_itemsを取得（最初の1件のみ）
      const orderIds = (ordersRaw || []).map((o: any) => o.id)
      const itemMap: Record<string, { name: string; qty: number }> = {}
      if (orderIds.length > 0) {
        const { data: items } = await supabase
          .from('order_items')
          .select('order_id, quantity, products(name)')
          .in('order_id', orderIds)
          .limit(orderIds.length * 3)
        ;(items || []).forEach((it: any) => {
          if (!itemMap[it.order_id]) {
            itemMap[it.order_id] = {
              name: it.products?.name || '-',
              qty: it.quantity || 0,
            }
          }
        })
      }

      // 5. enriched rows 作成
      const enriched: OrderRow[] = (ordersRaw || []).map((o: any) => {
        const isShipped = ['shipped', 'completed'].includes(o.status)
        const isDelayed = !isShipped && o.delivery_date && o.delivery_date < today
        return {
          id: o.id,
          order_no: o.order_no,
          status: o.status,
          delivery_date: o.delivery_date,
          created_at: o.created_at,
          from_company_name: companyMap[o.from_company_id] || '-',
          item_name: itemMap[o.id]?.name || '-',
          item_qty: itemMap[o.id]?.qty || 0,
          isShipped,
          isDelayed: !!isDelayed,
        }
      })

      // 6. カード集計
      const awaitingShipment = enriched.filter(r => !r.isShipped && !r.isDelayed).length
      const todayScheduled = enriched.filter(r => r.delivery_date === today).length
      const delayed = enriched.filter(r => r.isDelayed).length

      // 今月の出荷済み（shipped）
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
      let shippedQ = supabase
        .from('orders')
        .select('id')
        .in('status', ['shipped', 'completed'])
        .gte('updated_at', monthStart)
      if (!isAdmin) shippedQ = shippedQ.in('flow_id', myFlowIds)
      const { data: shippedData } = await shippedQ
      const shippedThisMonth = (shippedData || []).length

      setStats({ awaitingShipment, todayScheduled, shippedThisMonth, delayed })

      // 7. 直近7日の出荷数グラフ
      const weekly: { day: string; count: number }[] = []
      for (let i = 6; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        const dayStr = d.toISOString().split('T')[0]
        const label = (d.getMonth() + 1) + '/' + d.getDate()
        const count = enriched.filter(r => r.created_at?.startsWith(dayStr)).length
        weekly.push({ day: label, count })
      }
      setWeeklyData(weekly)

      setOrders(enriched.slice(0, 20))
    } catch (e) {
      console.error('[shipper] fetchData error:', e)
    } finally {
      setStatsLoading(false)
    }
  }

  const handleShip = async () => {
    if (!selectedId || !carrier || !trackingNo) {
      alert('配送会社、追跡番号を入力してください')
      return
    }
    setShipping(true)
    try {
      const { error } = await supabase.from('shipments').insert({
        order_id: selectedId,
        carrier,
        tracking_number: trackingNo,
        status: 'shipped',
        shipped_at: new Date().toISOString(),
      })
      if (!error) {
        await supabase.from('orders')
          .update({ status: 'shipped', current_step: 2 })
          .eq('id', selectedId)
        alert('出荷登録が完了しました')
        setOrders(prev => prev.map(o =>
          o.id === selectedId ? { ...o, status: 'shipped', isShipped: true } : o
        ))
        setSelectedId(null)
        setCarrier('')
        setTrackingNo('')
        fetchData()
      } else {
        alert('エラー: ' + error.message)
      }
    } finally {
      setShipping(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-8 py-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">発送者ダッシュボード</h1>
            <p className="text-blue-100 text-sm mt-1">{companyName}</p>
          </div>
          <div className="text-right">
            <span className="bg-white/20 px-3 py-1 rounded-full text-sm">
              {isAdmin ? '管理者' : '発送者'}
            </span>
            <p className="text-blue-100 text-xs mt-1">{displayName || userEmail}</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* 期間タブ */}
        <div className="flex gap-2 mb-6">
          {([
            { v: 'today', l: '本日' }, { v: 'week', l: '今週' },
            { v: 'month', l: '今月' }, { v: 'all', l: '全期間' },
          ] as const).map(t => (
            <button key={t.v} onClick={() => setPeriod(t.v)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                period === t.v ? 'bg-blue-600 text-white shadow' : 'bg-white text-gray-600 border hover:bg-gray-50'
              }`}>{t.l}</button>
          ))}
        </div>

        {/* 数値カード */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard label="出荷待ち" value={stats.awaitingShipment} unit="件" loading={statsLoading} color="blue" />
          <StatCard label="本日出荷予定" value={stats.todayScheduled} unit="件" loading={statsLoading} color="cyan" highlight={stats.todayScheduled > 0} />
          <StatCard label="今月出荷済み" value={stats.shippedThisMonth} unit="件" loading={statsLoading} color="green" />
          <StatCard label="遅延中" value={stats.delayed} unit="件" loading={statsLoading} color="red" highlight={stats.delayed > 0} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左：出荷リスト＋グラフ */}
          <div className="lg:col-span-2 space-y-6">
            {/* 直近7日グラフ */}
            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-4">直近7日の発注数</h2>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="count" name="件数" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 出荷リスト */}
            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-4">出荷リスト（自社関与）</h2>
              {orders.length === 0 ? (
                <div className="text-center text-gray-400 py-12">関与する発注はまだありません</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-gray-500 text-left">
                        <th className="py-3 px-2">発注No</th>
                        <th className="py-3 px-2">発注元</th>
                        <th className="py-3 px-2">商品</th>
                        <th className="py-3 px-2 text-center">数量</th>
                        <th className="py-3 px-2">納品日</th>
                        <th className="py-3 px-2">状態</th>
                        <th className="py-3 px-2 text-center">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map(o => (
                        <tr key={o.id} className={`border-b hover:bg-gray-50 ${
                          selectedId === o.id ? 'bg-blue-50' : o.isDelayed ? 'bg-red-50' : ''
                        }`}>
                          <td className="py-3 px-2 font-medium text-blue-600">
                            <Link href={`/orders/${o.id}`} className="hover:underline">{o.order_no}</Link>
                          </td>
                          <td className="py-3 px-2 text-gray-600">{o.from_company_name}</td>
                          <td className="py-3 px-2 text-gray-600">{o.item_name}</td>
                          <td className="py-3 px-2 text-center text-gray-700">{o.item_qty}</td>
                          <td className="py-3 px-2 text-gray-600">
                            {o.delivery_date || '-'}
                            {o.isDelayed && <span className="ml-1 text-red-500 text-xs">⚠遅延</span>}
                          </td>
                          <td className="py-3 px-2">
                            <span className={`px-2 py-1 rounded-full text-xs ${STATUS_COLOR[o.status] || 'bg-gray-100 text-gray-700'}`}>
                              {STATUS_LABEL[o.status] || o.status}
                            </span>
                          </td>
                          <td className="py-3 px-2 text-center">
                            {!o.isShipped ? (
                              <button
                                onClick={() => setSelectedId(o.id)}
                                className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                              >
                                出荷登録
                              </button>
                            ) : (
                              <span className="text-xs text-gray-400">登録済</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* 右：出荷登録フォーム */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-4">出荷登録</h2>
              {selectedId ? (
                <p className="text-xs text-blue-600 mb-3 font-medium">
                  選択中: {orders.find(o => o.id === selectedId)?.order_no}
                </p>
              ) : (
                <p className="text-xs text-gray-400 mb-3">リストから「出荷登録」を選択してください</p>
              )}
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">① 配送会社を選択</label>
                  <select
                    value={carrier}
                    onChange={e => setCarrier(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="">選択してください</option>
                    <option>ヤマト運輸</option>
                    <option>佐川急便</option>
                    <option>日本郵便</option>
                    <option>福山通運</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">② 追跡番号を入力</label>
                  <input
                    value={trackingNo}
                    onChange={e => setTrackingNo(e.target.value)}
                    placeholder="追跡番号を入力"
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <button
                  onClick={handleShip}
                  disabled={!selectedId || shipping}
                  className={`w-full py-2 rounded-lg text-sm font-medium text-white transition ${
                    selectedId && !shipping
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-gray-300 cursor-not-allowed'
                  }`}
                >
                  {shipping ? '登録中...' : '③ 出荷完了にする'}
                </button>
              </div>
            </div>

            <div className="bg-blue-50 rounded-xl p-4 text-xs text-gray-700">
              <p className="font-medium mb-1">出荷ルール：平日</p>
              <p>12:00までの出荷登録で、翌日納品となります。</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, unit, loading, color, highlight }: {
  label: string; value: number; unit: string; loading: boolean
  color: 'blue' | 'cyan' | 'green' | 'red'
  highlight?: boolean
}) {
  const colorMap = {
    blue: 'from-blue-500 to-blue-600',
    cyan: 'from-cyan-500 to-blue-500',
    green: 'from-green-500 to-emerald-500',
    red: 'from-red-500 to-rose-500',
  }

  return (
    <div className={`bg-white rounded-xl shadow p-6 hover:shadow-md transition ${highlight ? 'ring-2 ring-amber-400' : ''}`}>
      <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${colorMap[color]} mb-4`} />
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      {loading ? (
        <div className="h-9 bg-gray-200 rounded animate-pulse" />
      ) : (
        <p className="text-3xl font-bold text-gray-800">
          {value.toLocaleString()}
          <span className="text-base font-normal text-gray-500 ml-1">{unit}</span>
        </p>
      )}
    </div>
  )
}
