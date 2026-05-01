import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getActivities } from '../api/activities'
import { getUsers } from '../api/users'
import { useAuth } from '../context/AuthContext'
import Layout from '../components/Layout'
import StatusBadge from '../components/StatusBadge'
import Spinner from '../components/Spinner'
import { formatDate } from '../utils/format'
import { STATUS_LABELS, PRODUCT_LINES } from '../utils/constants'

const STATUSES = Object.keys(STATUS_LABELS)

export default function Activities() {
  const { hasAnyRole } = useAuth()
  const navigate = useNavigate()
  const [activities, setActivities] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    status: '',
    product_line: '',
    project: '',
    executor_id: '',
    date_from: '',
    date_to: '',
  })

  const canCreate = hasAnyRole(['admin', 'manager', 'planner'])

  const fetchActivities = useCallback(async () => {
    setLoading(true)
    try {
      const params = Object.fromEntries(
        Object.entries(filters).filter(([, v]) => v !== '')
      )
      const res = await getActivities(params)
      setActivities(res.data)
    } catch {
      setActivities([])
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    fetchActivities()
  }, [fetchActivities])

  useEffect(() => {
    if (hasAnyRole(['admin', 'manager', 'planner'])) {
      getUsers().then((res) => setUsers(res.data)).catch(() => {})
    }
  }, [hasAnyRole])

  function setFilter(key, value) {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  function clearFilters() {
    setFilters({ status: '', product_line: '', project: '', executor_id: '', date_from: '', date_to: '' })
  }

  const hasActiveFilters = Object.values(filters).some((v) => v !== '')

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">Atividades</h1>
          {canCreate && (
            <button
              onClick={() => navigate('/activities/new')}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
            >
              + Nova Atividade
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <select
              value={filters.status}
              onChange={(e) => setFilter('status', e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos os status</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
              ))}
            </select>
            <select
              value={filters.product_line}
              onChange={(e) => setFilter('product_line', e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todas as linhas</option>
              {PRODUCT_LINES.map((l) => (
                <option key={l.value} value={l.value}>{l.label}</option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Projeto"
              value={filters.project}
              onChange={(e) => setFilter('project', e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {hasAnyRole(['admin', 'manager', 'planner']) && (
              <select
                value={filters.executor_id}
                onChange={(e) => setFilter('executor_id', e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos os executores</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            )}
            <input
              type="date"
              value={filters.date_from}
              onChange={(e) => setFilter('date_from', e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="date"
              value={filters.date_to}
              onChange={(e) => setFilter('date_to', e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="mt-3 text-xs text-gray-500 hover:text-red-600 transition-colors"
            >
              Limpar filtros
            </button>
          )}
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-16">
              <Spinner />
            </div>
          ) : activities.length === 0 ? (
            <div className="text-center py-16 text-gray-400 text-sm">
              Nenhuma atividade encontrada.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {['Nº Doc', 'Linha', 'Projeto', 'Equipamento', 'Executor', 'Status', 'Prazo Entrega', ''].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {activities.map((a) => (
                    <tr
                      key={a.id}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => navigate(`/activities/${a.id}`)}
                    >
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {a.document_number ?? <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{a.product_line ?? '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{a.project ?? '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{a.equipment ?? '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{a.executor_name ?? '—'}</td>
                      <td className="px-4 py-3"><StatusBadge status={a.status} /></td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {formatDate(a.planned_completion_date)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-blue-600 text-sm hover:underline">Ver →</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {!loading && (
          <p className="text-xs text-gray-400 text-right">{activities.length} atividade(s)</p>
        )}
      </div>
    </Layout>
  )
}
