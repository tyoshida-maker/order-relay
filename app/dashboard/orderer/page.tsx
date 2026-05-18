'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts'

type Period = 'today' | 'week' | 'month' | 'all'

type Stats = {
  total: number
  inProgress: number
  completed: number
  monthlyAmount: number
}

type RecentOrder = {
  id: string
  order_no: string
  delivery_date: string | null
  status: string
  current_step: number
  total_amount: number
}

type MonthlyTrend = { month: string; count: number }

const STATUS_LABEL: Record<string, string> = {
  draft: '下書き',
  confirmed: '確認済み',
  in_progress: '進行中',
  completed: '完了',
  cancelled: 'キャンセル',
}

const STATUS_COLOR: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  confirmed: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-amber-100 text-amber-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
}

export default function OrdererDashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [statsLoading, setStatsLoading] = useState(true)
  const [userEmail, setUserEmail] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [companyName, setCompanyName] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [period, setPeriod] = useState<Period>('month')
  const [stats, setStats] = useState<Stats>({ total: 0, inProgress: 0, completed: 0, monthlyAmount: 0 })
  const [trend, setTrend] = useState<MonthlyTrend[]>([])
  const [recent, setRecent] = useState<RecentOrder[]>([])

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

      const allowedRoles = ['admin', 'partner', 'orderer']
      if (!allowedRoles.includes(profile.role)) {
        router.push('/login'); return
      }

      setUserEmail(user.email || '')
      setDisplayName(profile.display_name || '')
      setIsAdmin(profile.role === 'admin')
      setCompanyId(profile.company_id)

      if (profile.company_id) {
        const { data: company } = await supabase
          .from('companies')
          .select('name')
          .eq('id', profile.company_id)
          .single()
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
  }, [loading, period, companyId, isAdmin])

  const getPeriodFilter = (): string | null => {
    const now = new Date()
    if (period === 'today') {
      return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
    }
    if (period === 'week') {
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
    }
    if (period === 'month') {
      return new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    }
    return null
  }

  const fetchData = async () => {
    setStatsLoading(true)
    try {
      const periodFilter = getPeriodFilter()

      const applyScope = (q: any) => {
        if (!isAdmin && companyId) return q.eq('from_company_id', companyId)
        return q
      }

      let totalQ = applyScope(supabase.from('orders').select('*', { count: 'exact' }))
      if (periodFilter) totalQ = totalQ.gte('created_at', periodFilter)
      const { count: totalCount } = await totalQ

      let progressQ = applyScope(
        supabase.from('orders').select('*', { count: 'exact' })
          .in('status', ['confirmed', 'in_progress'])
      )
      if (periodFilter) progressQ = progressQ.gte('created_at', periodFilter)
      const { count: progressCount } = await progressQ

      let completedQ = applyScope(
        supabase.from('orders').select('*', { count: 'exact' })
          .eq('status', 'completed')
      )
      if (periodFilter) completedQ = completedQ.gte('created_at', periodFilter)
      const { count: completedCount } = await completedQ

      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
      let amountOrdersQ = applyScope(
        supabase.from('orders').select('id').gte('created_at', monthStart)
      )
      const { data: amountOrders } = await amountOrdersQ

      const orderIds = (amountOrders || []).map((o: any) => o.id)
      let monthlyAmount = 0
      if (orderIds.length > 0) {
        const { data: items } = await supabase
          .from('order_items')
          .select('quantity, unit_price, order_id')
          .in('order_id', orderIds)
        monthlyAmount = (items || []).reduce((sum: number, it: any) => {
          const q = Number(it.quantity) || 0
          const p = Number(it.unit_price) || 0
          return sum + q * p
        }, 0)
      }

      setStats({
        total: totalCount || 0,
        inProgress: progressCount || 0,
        completed: completedCount || 0,
        monthlyAmount,
      })

      const sixMonthsAgo = new Date()
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5)
      sixMonthsAgo.setDate(1)
      sixMonthsAgo.setHours(0, 0, 0, 0)

      let trendQ = applyScope(
        supabase.from('orders').select('created_at')
          .gte('created_at', sixMonthsAgo.toISOString())
      )
      const { data: trendData } = await trendQ

      const trendMap: Record<string, number> = {}
      for (let i = 5; i >= 0; i--) {
        const d = new Date()
        d.setMonth(d.getMonth() - i)
        const key = `${d.getFullYear()}/${d.getMonth() + 1}`
        trendMap[key] = 0
      }
      ;(trendData || []).forEach((row: any) => {
        const d = new Date(row.created_at)
        const key = `${d.getFullYear()}/${d.getMonth() + 1}`
        if (key in trendMap) trendMap[key]++
      })
      setTrend(Object.entries(trendMap).map(([month, count]) => ({ month, count })))

      let recentQ = applyScope(
        supabase.from('orders')
          .select('id, order_no, delivery_date, status, current_step')
          .order('created_at', { ascending: false })
          .limit(10)
      )
      const { data: recentData } = await recentQ

      const recentIds = (recentData || []).map((o: any) => o.id)
      const amountMap: Record<string, number> = {}
      if (recentIds.length > 0) {
        const { data: recentItems } = await supabase
          .from('order_items')
          .select('order_id, quantity, unit_price')
          .in('order_id', recentIds)
        ;(recentItems || []).forEach((it: any) => {
          const q = Number(it.quantity) || 0
          const p = Number(it.unit_price) || 0
          amountMap[it.order_id] = (amountMap[it.order_id] || 0) + q * p
        })
      }

      setRecent((recentData || []).map((o: any) => ({
        id: o.id,
        order_no: o.order_no,
        delivery_date: o.delivery_date,
        status: o.status,
        current_step: o.current_step,
        total_amount: amountMap[o.id] || 0,
      })))

    } catch (e) {
      console.error('[orderer] fetchData error:', e)
    } finally {
      setStatsLoading(false)
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
      <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-8 py-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">発注者ダッシュボード</h1>
            <p className="text-blue-100 text-sm mt-1">{companyName}</p>
          </div>
          <div className="text-right">
            <span className="bg-white/20 px-3 py-1 rounded-full text-sm">
              {isAdmin ? '管理者' : '発注者'}
            </span>
            <p className="text-blue-100 text-xs mt-1">{displayName || userEmail}</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex gap-2 mb-6">
          {([
            { v: 'today', l: '本日' },
            { v: 'week', l: '今週' },
            { v: 'month', l: '今月' },
            { v: 'all', l: '全期間' },
          ] as const).map(t => (
            <button
              key={t.v}
              onClick={() => setPeriod(t.v)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                period === t.v
                  ? 'bg-blue-600 text-white shadow'
                  : 'bg-white text-gray-600 border hover:bg-gray-50'
              }`}
            >
              {t.l}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard label="発注数" value={stats.total} unit="件" loading={statsLoading} color="blue" />
          <StatCard label="進行中" value={stats.inProgress} unit="件" loading={statsLoading} color="amber" />
          <StatCard label="完了済み" value={stats.completed} unit="件" loading={statsLoading} color="green" />
          <StatCard
            label="今月の請求額"
            value={stats.monthlyAmount}
            unit="円"
            loading={statsLoading}
            color="purple"
            prefix="¥"
          />
        </div>

        <div className="bg-white rounded-xl shadow p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">直近6ヶ月の発注推移</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" stroke="#6b7280" />
                <YAxis stroke="#6b7280" allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="count" name="発注数" stroke="#3b82f6" strokeWidth={3} dot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-gray-800">直近の発注</h2>
            <Link href="/orders/new" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
              + 新規発注
            </Link>
          </div>
          {recent.length === 0 ? (
            <div className="text-center text-gray-400 py-12">発注はまだありません</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-gray-500 text-left">
                    <th className="py-3 px-2">発注No</th>
                    <th className="py-3 px-2">納品日</th>
                    <th className="py-3 px-2 text-right">金額</th>
                    <th className="py-3 px-2">状態</th>
                    <th className="py-3 px-2 text-center">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map(o => (
                    <tr key={o.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-2 font-medium text-gray-700">{o.order_no}</td>
                      <td className="py-3 px-2 text-gray-600">{o.delivery_date || '-'}</td>
                      <td className="py-3 px-2 text-right text-gray-700">¥{o.total_amount.toLocaleString()}</td>
                      <td className="py-3 px-2">
                        <span className={`px-2 py-1 rounded-full text-xs ${STATUS_COLOR[o.status] || 'bg-gray-100 text-gray-700'}`}>
                          {STATUS_LABEL[o.status] || o.status}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-center">
                        <Link href={`/orders/${o.id}`} className="text-blue-600 hover:underline">
                          詳細
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, unit, loading, color, prefix }: {
  label: string; value: number; unit: string; loading: boolean
  color: 'indigo' | 'amber' | 'green' | 'blue' | 'purple'
  prefix?: string
}) {
  const colorMap = {
    indigo: 'from-indigo-500 to-indigo-600',
    amber: 'from-amber-500 to-orange-500',
    green: 'from-green-500 to-emerald-500',
    blue: 'from-blue-500 to-cyan-500',
    purple: 'from-purple-500 to-pink-500',
  }

  return (
    <div className="bg-white rounded-xl shadow p-6 hover:shadow-md transition">
      <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${colorMap[color]} mb-4`} />
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      {loading ? (
        <div className="h-9 bg-gray-200 rounded animate-pulse" />
      ) : (
        <p className="text-3xl font-bold text-gray-800">
          {prefix || ''}{value.toLocaleString()}
          <span className="text-base font-normal text-gray-500 ml-1">{unit}</span>
        </p>
      )}
    </div>
  )
}
