'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import {
  PieChart, Pie, Cell,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts'

type Period = 'today' | 'week' | 'month' | 'all'

type FlowStep = { role: string; company_id: string; label?: string; step?: number }

type Stats = {
  involved: number
  awaitingMe: number
  myProcessedThisMonth: number
  completedInvolved: number
}

type OrderRow = {
  id: string
  order_no: string
  status: string
  current_step: number
  approved_steps: number[]
  flow_id: string | null
  delivery_date: string | null
  myStepIndex: number | null
  isMyTurn: boolean
}

const STATUS_LABEL: Record<string, string> = {
  draft: '下書き', confirmed: '確認済み', in_progress: '進行中',
  completed: '完了', cancelled: 'キャンセル',
}

const STATUS_COLOR: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  confirmed: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-amber-100 text-amber-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
}

const PIE_COLORS = ['#10b981', '#f59e0b', '#3b82f6', '#ef4444', '#a855f7']

export default function IntermediaryDashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [statsLoading, setStatsLoading] = useState(true)
  const [userEmail, setUserEmail] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [companyName, setCompanyName] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [period, setPeriod] = useState<Period>('month')
  const [stats, setStats] = useState<Stats>({ involved: 0, awaitingMe: 0, myProcessedThisMonth: 0, completedInvolved: 0 })
  const [statusBreakdown, setStatusBreakdown] = useState<{ name: string; value: number }[]>([])
  const [orders, setOrders] = useState<OrderRow[]>([])

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

      const allowed = ['admin', 'intermediary', 'partner']
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

      const { data: flowsAll } = await supabase
        .from('flows').select('id, name, steps')

      const myFlowMap: Record<string, number> = {}
      ;(flowsAll || []).forEach((f: any) => {
        const steps: FlowStep[] = Array.isArray(f.steps) ? f.steps : []
        if (isAdmin) {
          myFlowMap[f.id] = -1
        } else if (companyId) {
          const idx = steps.findIndex(s => s.company_id === companyId)
          if (idx >= 0) myFlowMap[f.id] = idx
        }
      })

      const myFlowIds = Object.keys(myFlowMap)

      if (myFlowIds.length === 0 && !isAdmin) {
        setStats({ involved: 0, awaitingMe: 0, myProcessedThisMonth: 0, completedInvolved: 0 })
        setStatusBreakdown([])
        setOrders([])
        setStatsLoading(false)
        return
      }

      let q = supabase
        .from('orders')
        .select('id, order_no, status, current_step, approved_steps, flow_id, delivery_date, created_at, updated_at')
        .order('created_at', { ascending: false })

      if (!isAdmin) q = q.in('flow_id', myFlowIds)
      if (periodFilter) q = q.gte('created_at', periodFilter)

      const { data: ordersData } = await q

      const enriched: OrderRow[] = (ordersData || []).map((o: any) => {
        const myStepIndex = isAdmin ? null : (o.flow_id ? (myFlowMap[o.flow_id] ?? null) : null)
        const isMyTurn = !isAdmin && myStepIndex !== null && o.current_step === myStepIndex && o.status !== 'completed'
        return {
          id: o.id,
          order_no: o.order_no,
          status: o.status,
          current_step: o.current_step,
          approved_steps: o.approved_steps || [],
          flow_id: o.flow_id,
          delivery_date: o.delivery_date,
          myStepIndex,
          isMyTurn,
        }
      })

      const involvedCount = enriched.length
      const awaitingMeCount = enriched.filter(r => r.isMyTurn).length
      const completedInvolvedCount = enriched.filter(r => r.status === 'completed').length

      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
      let processedQ = supabase
        .from('orders')
        .select('approved_steps, flow_id, updated_at')
        .gte('updated_at', monthStart)

      if (!isAdmin) processedQ = processedQ.in('flow_id', myFlowIds)
      const { data: processedData } = await processedQ

      const myProcessedCount = (processedData || []).filter((o: any) => {
        if (isAdmin) return (o.approved_steps || []).length > 0
        const idx = o.flow_id ? myFlowMap[o.flow_id] : null
        if (idx === null || idx === undefined) return false
        return (o.approved_steps || []).includes(idx)
      }).length

      setStats({
        involved: involvedCount,
        awaitingMe: awaitingMeCount,
        myProcessedThisMonth: myProcessedCount,
        completedInvolved: completedInvolvedCount,
      })

      const statusCount: Record<string, number> = {}
      enriched.forEach(r => {
        statusCount[r.status] = (statusCount[r.status] || 0) + 1
      })
      setStatusBreakdown(
        Object.entries(statusCount).map(([status, count]) => ({
          name: STATUS_LABEL[status] || status,
          value: count,
        }))
      )

      setOrders(enriched.slice(0, 15))
    } catch (e) {
      console.error('[intermediary] fetchData error:', e)
    } finally {
      setStatsLoading(false)
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="text-gray-500">読み込み中...</div></div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-8 py-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">中間者ダッシュボード</h1>
            <p className="text-emerald-100 text-sm mt-1">{companyName}</p>
          </div>
          <div className="text-right">
            <span className="bg-white/20 px-3 py-1 rounded-full text-sm">
              {isAdmin ? '管理者' : '中間者'}
            </span>
            <p className="text-emerald-100 text-xs mt-1">{displayName || userEmail}</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex gap-2 mb-6">
          {([
            { v: 'today', l: '本日' }, { v: 'week', l: '今週' },
            { v: 'month', l: '今月' }, { v: 'all', l: '全期間' },
          ] as const).map(t => (
            <button key={t.v} onClick={() => setPeriod(t.v)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                period === t.v ? 'bg-emerald-600 text-white shadow' : 'bg-white text-gray-600 border hover:bg-gray-50'
              }`}>{t.l}</button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard label="自社関与の発注" value={stats.involved} unit="件" loading={statsLoading} color="teal" />
          <StatCard label="承認待ち（自分の番）" value={stats.awaitingMe} unit="件" loading={statsLoading} color="amber" highlight={stats.awaitingMe > 0} />
          <StatCard label="自社処理済み（今月）" value={stats.myProcessedThisMonth} unit="件" loading={statsLoading} color="blue" />
          <StatCard label="完了発注" value={stats.completedInvolved} unit="件" loading={statsLoading} color="green" />
        </div>

        <div className="bg-white rounded-xl shadow p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">ステータス内訳</h2>
          <div className="h-64">
            {statusBreakdown.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-400">データなし</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                    {statusBreakdown.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">受発注リスト（自社関与）</h2>
          {orders.length === 0 ? (
            <div className="text-center text-gray-400 py-12">関与する発注はまだありません</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-gray-500 text-left">
                    <th className="py-3 px-2">発注No</th>
                    <th className="py-3 px-2">納品日</th>
                    <th className="py-3 px-2 text-center">現ステップ</th>
                    <th className="py-3 px-2 text-center">自社の番</th>
                    <th className="py-3 px-2">状態</th>
                    <th className="py-3 px-2 text-center">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map(o => (
                    <tr key={o.id} className={`border-b hover:bg-gray-50 ${o.isMyTurn ? 'bg-amber-50' : ''}`}>
                      <td className="py-3 px-2 font-medium text-gray-700">{o.order_no}</td>
                      <td className="py-3 px-2 text-gray-600">{o.delivery_date || '-'}</td>
                      <td className="py-3 px-2 text-center text-gray-700">step {o.current_step}</td>
                      <td className="py-3 px-2 text-center">
                        {o.isMyTurn ? (
                          <span className="bg-amber-500 text-white px-2 py-1 rounded-full text-xs font-bold">承認待ち</span>
                        ) : o.myStepIndex !== null ? (
                          <span className="text-xs text-gray-400">step {o.myStepIndex}</span>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </td>
                      <td className="py-3 px-2">
                        <span className={`px-2 py-1 rounded-full text-xs ${STATUS_COLOR[o.status] || 'bg-gray-100 text-gray-700'}`}>
                          {STATUS_LABEL[o.status] || o.status}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-center">
                        <Link href={`/orders/${o.id}`} className="text-emerald-600 hover:underline">詳細</Link>
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

function StatCard({ label, value, unit, loading, color, highlight }: {
  label: string; value: number; unit: string; loading: boolean
  color: 'teal' | 'amber' | 'blue' | 'green'
  highlight?: boolean
}) {
  const colorMap = {
    teal: 'from-teal-500 to-emerald-500',
    amber: 'from-amber-500 to-orange-500',
    blue: 'from-blue-500 to-cyan-500',
    green: 'from-green-500 to-emerald-500',
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
