'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'

type Period = 'today' | 'week' | 'month' | 'all'

type Stats = {
  total: number
  inProgress: number
  completed: number
  companyCount: number
}

type DailyTrend = { date: string; count: number }
type CompanyRank = { name: string; count: number }

export default function AdminPage() {
  const router = useRouter()
  const [userEmail, setUserEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<Period>('month')
  const [stats, setStats] = useState<Stats>({ total: 0, inProgress: 0, completed: 0, companyCount: 0 })
  const [trend, setTrend] = useState<DailyTrend[]>([])
  const [ranking, setRanking] = useState<CompanyRank[]>([])
  const [statsLoading, setStatsLoading] = useState(true)

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: profile } = await supabase
        .from('or_user_profiles').select('role')
        .eq('id', user.id).single()
      if (profile?.role !== 'admin') { router.push('/login'); return }
      setUserEmail(user.email || '')
      setLoading(false)
    }
    checkAdmin()
  }, [router])

  useEffect(() => {
    if (loading) return
    fetchStats()
  }, [loading, period])

  const getPeriodFilter = (): string | null => {
    const now = new Date()
    if (period === 'today') {
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      return today.toISOString()
    }
    if (period === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      return weekAgo.toISOString()
    }
    if (period === 'month') {
      const monthAgo = new Date(now.getFullYear(), now.getMonth(), 1)
      return monthAgo.toISOString()
    }
    return null
  }

  const fetchStats = async () => {
    setStatsLoading(true)
    try {
      const periodFilter = getPeriodFilter()

      let totalQuery = supabase.from('orders').select('*', { count: 'exact', head: true })
      if (periodFilter) totalQuery = totalQuery.gte('created_at', periodFilter)
      const { count: totalCount } = await totalQuery

      let progressQuery = supabase
        .from('orders').select('*', { count: 'exact', head: true })
        .in('status', ['confirmed', 'in_progress'])
      if (periodFilter) progressQuery = progressQuery.gte('created_at', periodFilter)
      const { count: progressCount } = await progressQuery

      let completedQuery = supabase
        .from('orders').select('*', { count: 'exact', head: true })
        .eq('status', 'completed')
      if (periodFilter) completedQuery = completedQuery.gte('created_at', periodFilter)
      const { count: completedCount } = await completedQuery

      const { count: companyCount } = await supabase
        .from('companies').select('*', { count: 'exact', head: true })

      setStats({
        total: totalCount || 0,
        inProgress: progressCount || 0,
        completed: completedCount || 0,
        companyCount: companyCount || 0,
      })

      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      const { data: trendData } = await supabase
        .from('orders').select('created_at')
        .gte('created_at', sevenDaysAgo)
        .order('created_at', { ascending: true })

      const trendMap: Record<string, number> = {}
      for (let i = 6; i >= 0; i--) {
        const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
        const key = `${d.getMonth() + 1}/${d.getDate()}`
        trendMap[key] = 0
      }
      ;(trendData || []).forEach(row => {
        const d = new Date(row.created_at)
        const key = `${d.getMonth() + 1}/${d.getDate()}`
        if (key in trendMap) trendMap[key]++
      })
      setTrend(Object.entries(trendMap).map(([date, count]) => ({ date, count })))

      const { data: companies } = await supabase.from('companies').select('id, name')
      let ordersForRank = supabase.from('orders').select('from_company_id')
      if (periodFilter) ordersForRank = ordersForRank.gte('created_at', periodFilter)
      const { data: ordersRank } = await ordersForRank

      const rankMap: Record<string, number> = {}
      ;(ordersRank || []).forEach(o => {
        if (o.from_company_id) rankMap[o.from_company_id] = (rankMap[o.from_company_id] || 0) + 1
      })
      const rankingData = (companies || [])
        .map(c => ({ name: c.name, count: rankMap[c.id] || 0 }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
      setRanking(rankingData)

    } catch (e) {
      console.error('[admin] fetchStats error:', e)
    } finally {
      setStatsLoading(false)
    }
  }

  const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Order Relay</h1>
            <p className="text-indigo-100 text-sm mt-1">管理者ダッシュボード</p>
          </div>
          <div className="text-right">
            <span className="bg-white/20 px-3 py-1 rounded-full text-sm">管理者</span>
            <p className="text-indigo-100 text-xs mt-1">{userEmail}</p>
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
                  ? 'bg-indigo-600 text-white shadow'
                  : 'bg-white text-gray-600 border hover:bg-gray-50'
              }`}
            >
              {t.l}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard label="総発注数" value={stats.total} unit="件" loading={statsLoading} color="indigo" />
          <StatCard label="進行中" value={stats.inProgress} unit="件" loading={statsLoading} color="amber" />
          <StatCard label="完了率" value={completionRate} unit="%" loading={statsLoading} color="green" />
          <StatCard label="登録会社数" value={stats.companyCount} unit="社" loading={statsLoading} color="blue" />
        </div>

        <div className="bg-white rounded-xl shadow p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">直近7日の発注推移</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" stroke="#6b7280" />
                <YAxis stroke="#6b7280" allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="count" name="発注数" stroke="#6366f1" strokeWidth={3} dot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">会社別発注数 TOP5</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ranking} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" stroke="#6b7280" allowDecimals={false} />
                <YAxis dataKey="name" type="category" stroke="#6b7280" width={140} />
                <Tooltip />
                <Bar dataKey="count" name="発注数" fill="#8b5cf6" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, unit, loading, color }: {
  label: string; value: number; unit: string; loading: boolean
  color: 'indigo' | 'amber' | 'green' | 'blue'
}) {
  const colorMap = {
    indigo: 'from-indigo-500 to-indigo-600',
    amber: 'from-amber-500 to-orange-500',
    green: 'from-green-500 to-emerald-500',
    blue: 'from-blue-500 to-cyan-500',
  }

  return (
    <div className="bg-white rounded-xl shadow p-6 hover:shadow-md transition">
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
