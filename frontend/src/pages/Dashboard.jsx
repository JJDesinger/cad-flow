import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getKpis, getWorkload, getOverdue, getVerificationQueue, getMySummary } from '../api/dashboard'
import { useAuth } from '../context/AuthContext'
import Layout from '../components/Layout'
import StatusBadge from '../components/StatusBadge'
import Spinner from '../components/Spinner'
import { formatDate, formatPercent } from '../utils/format'
import { PRODUCT_LINES } from '../utils/constants'

function KpiCard({ label, value, sub }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

export default function Dashboard() {
  const { user, hasAnyRole } = useAuth()
  const navigate = useNavigate()
  const isManager = hasAnyRole(['admin', 'manager'])
  const isPlanner = hasAnyRole(['admin', 'manager', 'planner'])

  const [kpis, setKpis] = useState(null)
  const [workload, setWorkload] = useState([])
  const [overdue, setOverdue] = useState([])
  const [queue, setQueue] = useState([])
  const [mySummary, setMySummary] = useState(null)
  const [loading, setLoading] = useState(true)

  const [filters, setFilters] = useState({ product_line: '', date_from: '', date_to: '' })

  useEffect(() => {
    setLoading(true)
    const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== ''))

    const requests = [
      getKpis(params).catch(() => ({ data: null })),
      getMySummary().catch(() => ({ data: null })),
    ]
    if (isPlanner) {
      requests.push(getWorkload(params).catch(() => ({ data: [] })))
      requests.push(getOverdue(params).catch(() => ({ data: [] })))
    }
    if (hasAnyRole(['admin', 'manager', 'verifier'])) {
      requests.push(getVerificationQueue(params).catch(() => ({ data: [] })))
    }

    Promise.all(requests).then(([kpisRes, myRes, ...rest]) => {
      setKpis(kpisRes.data)
      setMySummary(myRes.data)
      let idx = 0
      if (isPlanner) {
        setWorkload(rest[idx++]?.data ?? [])
        setOverdue(rest[idx++]?.data ?? [])
      }
      if (hasAnyRole(['admin', 'manager', 'verifier'])) {
        setQueue(rest[idx]?.data ?? [])
      }
      setLoading(false)
    })
  }, [filters, isPlanner, hasAnyRole])

  function setFilter(key, value) {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
          <div className="flex gap-2">
            <select
              value={filters.product_line}
              onChange={(e) => setFilter('product_line', e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todas as linhas</option>
              {PRODUCT_LINES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
            <input type="date" value={filters.date_from} onChange={(e) => setFilter('date_from', e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <input type="date" value={filters.date_to} onChange={(e) => setFilter('date_to', e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Spinner /></div>
        ) : (
          <>
            {/* KPIs */}
            {kpis && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard label="OTD" value={formatPercent(kpis.otd)} sub="On Time Delivery" />
                <KpiCard label="Qualidade" value={formatPercent(kpis.quality_rate)} sub="Aprovado na 1ª verificação" />
                <KpiCard label="Volume" value={kpis.total_activities ?? '—'} sub="Total de atividades" />
                <KpiCard label="Concluídas" value={kpis.completed ?? '—'} sub="No período" />
              </div>
            )}

            {/* My summary */}
            {mySummary && (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Meu Resumo</h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-700">{mySummary.in_progress ?? 0}</p>
                    <p className="text-xs text-gray-400 mt-1">Em andamento</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-yellow-600">{mySummary.verification ?? 0}</p>
                    <p className="text-xs text-gray-400 mt-1">Em verificação</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-orange-500">{mySummary.overdue ?? 0}</p>
                    <p className="text-xs text-gray-400 mt-1">Atrasadas</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-emerald-600">{mySummary.completed ?? 0}</p>
                    <p className="text-xs text-gray-400 mt-1">Concluídas</p>
                  </div>
                </div>
              </div>
            )}

            {/* Verification queue */}
            {queue.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100">
                  <h2 className="text-sm font-semibold text-gray-700">Fila de Verificação ({queue.length})</h2>
                </div>
                <div className="divide-y divide-gray-100">
                  {queue.slice(0, 8).map((a) => (
                    <div
                      key={a.id}
                      className="px-5 py-3 flex items-center justify-between hover:bg-gray-50 cursor-pointer"
                      onClick={() => navigate(`/activities/${a.id}`)}
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">{a.document_number ?? `#${a.id}`}</p>
                        <p className="text-xs text-gray-400">{a.project} · {a.executor_name}</p>
                      </div>
                      <div className="text-right">
                        <StatusBadge status={a.status} />
                        <p className="text-xs text-gray-400 mt-1">{formatDate(a.planned_completion_date)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Overdue */}
            {overdue.length > 0 && (
              <div className="bg-white rounded-xl border border-red-200 overflow-hidden">
                <div className="px-5 py-3 border-b border-red-100 bg-red-50">
                  <h2 className="text-sm font-semibold text-red-700">Atividades Atrasadas ({overdue.length})</h2>
                </div>
                <div className="divide-y divide-gray-100">
                  {overdue.slice(0, 8).map((a) => (
                    <div
                      key={a.id}
                      className="px-5 py-3 flex items-center justify-between hover:bg-gray-50 cursor-pointer"
                      onClick={() => navigate(`/activities/${a.id}`)}
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">{a.document_number ?? `#${a.id}`}</p>
                        <p className="text-xs text-gray-400">{a.project} · {a.executor_name}</p>
                      </div>
                      <div className="text-right">
                        <StatusBadge status={a.status} />
                        <p className="text-xs text-red-500 mt-1">{formatDate(a.planned_completion_date)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Workload */}
            {workload.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
                  Carga por Executor
                </h2>
                <div className="space-y-3">
                  {workload.map((w) => {
                    const max = Math.max(...workload.map((x) => x.active_count ?? 0), 1)
                    const pct = Math.round(((w.active_count ?? 0) / max) * 100)
                    return (
                      <div key={w.executor_id}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-700">{w.executor_name}</span>
                          <span className="text-gray-400">{w.active_count} ativas</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-2 bg-blue-500 rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  )
}
