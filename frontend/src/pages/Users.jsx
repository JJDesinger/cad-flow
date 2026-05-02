import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getUsers, createUser, updateUser, deactivateUser } from '../api/users'
import { getRequests, processRequest } from '../api/accessRequests'
import Layout from '../components/Layout'
import Spinner from '../components/Spinner'
import { roleLabel } from '../utils/format'
import { ROLES } from '../utils/constants'

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>
        {children}
      </div>
    </div>
  )
}

const emptyForm = {
  name: '', email: '', password: '', windows_username: '', role: ['designer'], active: true,
}

function RequestsTab() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending')
  const [processing, setProcessing] = useState(null)
  const [modal, setModal] = useState(null)
  const [notes, setNotes] = useState('')
  const [role, setRole] = useState(['designer'])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function fetchRequests() {
    setLoading(true)
    getRequests(filter)
      .then((res) => setRequests(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchRequests() }, [filter])

  function openModal(request, action) {
    setModal({ request, action })
    setNotes('')
    setRole(['designer'])
    setError('')
  }

  function toggleRole(r) {
    setRole((prev) => prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r])
  }

  async function handleProcess() {
    setSaving(true)
    setError('')
    try {
      await processRequest(modal.request.id, {
        action: modal.action,
        notes: notes || undefined,
        role: modal.action === 'approved' && modal.request.type === 'first_access' ? role : undefined,
      })
      setModal(null)
      fetchRequests()
    } catch (err) {
      setError(err.response?.data?.error ?? 'Erro ao processar.')
    } finally {
      setSaving(false)
    }
  }

  const typeLabel = { first_access: 'Primeiro Acesso', password_reset: 'Recuperação de Senha' }
  const statusLabel = { pending: 'Pendente', approved: 'Aprovado', rejected: 'Rejeitado' }
  const statusStyle = {
    pending:  'bg-yellow-100 text-yellow-700',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-600',
  }

  return (
    <>
      <div className="flex gap-2 mb-4">
        {['pending', 'approved', 'rejected', 'all'].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              filter === s ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {s === 'all' ? 'Todas' : statusLabel[s]}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : requests.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-12">Nenhuma solicitação encontrada.</p>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['Nome', 'E-mail', 'Tipo', 'Status', 'Data', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {requests.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">{r.name ?? '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{r.email}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{typeLabel[r.type]}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyle[r.status]}`}>
                      {statusLabel[r.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {new Date(r.created_at).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {r.status === 'pending' && (
                      <div className="flex justify-end gap-2">
                        <button onClick={() => openModal(r, 'approved')} className="text-sm text-green-600 hover:underline font-medium">Aprovar</button>
                        <button onClick={() => openModal(r, 'rejected')} className="text-sm text-red-500 hover:underline">Rejeitar</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900">
                {modal.action === 'approved' ? 'Aprovar solicitação' : 'Rejeitar solicitação'}
              </h3>
              <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>

            <p className="text-sm text-gray-600">
              <strong>{modal.request.name ?? modal.request.email}</strong> — {typeLabel[modal.request.type]}
            </p>

            {modal.action === 'approved' && modal.request.type === 'first_access' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Perfis</label>
                <div className="flex flex-wrap gap-2">
                  {ROLES.map((r) => (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => toggleRole(r.value)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                        role.includes(r.value) ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-1">O usuário já definiu sua senha na solicitação.</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Observação {modal.action === 'rejected' ? '(motivo da rejeição)' : '(opcional)'}
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
            )}

            <div className="flex justify-end gap-2">
              <button onClick={() => setModal(null)} className="px-4 py-2 text-sm text-gray-600">Cancelar</button>
              <button
                onClick={handleProcess}
                disabled={saving}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 transition-colors ${
                  modal.action === 'approved' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-500 hover:bg-red-600'
                }`}
              >
                {saving && <Spinner className="h-4 w-4" />}
                {modal.action === 'approved' ? 'Aprovar' : 'Rejeitar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default function Users() {
  const [searchParams] = useSearchParams()
  const [tab, setTab] = useState(searchParams.get('tab') === 'requests' ? 'requests' : 'users')
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function fetchUsers() {
    setLoading(true)
    getUsers()
      .then((res) => setUsers(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchUsers() }, [])

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setError('')
    setModal(true)
  }

  function openEdit(user) {
    setEditing(user)
    setForm({
      name: user.name,
      email: user.email,
      password: '',
      windows_username: user.windows_username ?? '',
      role: user.role ?? ['designer'],
      active: user.is_active ?? true,
    })
    setError('')
    setModal(true)
  }

  function toggleRole(roleValue) {
    setForm((prev) => {
      const has = prev.role.includes(roleValue)
      return {
        ...prev,
        role: has
          ? prev.role.filter((r) => r !== roleValue)
          : [...prev.role, roleValue],
      }
    })
  }

  async function handleSave() {
    setSaving(true)
    setError('')
    try {
      const payload = { ...form }
      if (!payload.password) delete payload.password
      if (editing) {
        payload.is_active = payload.active
        delete payload.active
        await updateUser(editing.id, payload)
      } else {
        await createUser(payload)
      }
      setModal(false)
      fetchUsers()
    } catch (err) {
      setError(err.response?.data?.error ?? 'Erro ao salvar.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeactivate(user) {
    if (!confirm(`Desativar o usuário "${user.name}"?`)) return
    try {
      await deactivateUser(user.id)
      fetchUsers()
    } catch (err) {
      alert(err.response?.data?.error ?? 'Erro ao desativar.')
    }
  }

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex gap-1 border-b border-gray-200">
            <button
              onClick={() => setTab('users')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
                tab === 'users' ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Usuários
            </button>
            <button
              onClick={() => setTab('requests')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
                tab === 'requests' ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Solicitações de Acesso
            </button>
          </div>
          {tab === 'users' && (
            <button
              onClick={openCreate}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
            >
              + Novo Usuário
            </button>
          )}
        </div>

        {tab === 'requests' && <RequestsTab />}

        {tab === 'users' && <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-16"><Spinner /></div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {['Nome', 'E-mail', 'Perfis', 'Status', ''].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{u.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{u.email}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{roleLabel(u.role)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        u.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {u.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openEdit(u)}
                          className="text-sm text-blue-600 hover:underline"
                        >
                          Editar
                        </button>
                        {u.active && (
                          <button
                            onClick={() => handleDeactivate(u)}
                            className="text-sm text-red-500 hover:underline"
                          >
                            Desativar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>}
      </div>

      {modal && (
        <Modal
          title={editing ? `Editar: ${editing.name}` : 'Novo Usuário'}
          onClose={() => setModal(false)}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
              <input
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Senha {editing && <span className="text-gray-400 font-normal">(deixe em branco para manter)</span>}
              </label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Login Windows <span className="text-gray-400 font-normal">(para acesso pelo ícone)</span>
              </label>
              <input
                value={form.windows_username}
                onChange={(e) => setForm((p) => ({ ...p, windows_username: e.target.value.toLowerCase() }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="ex: joao.silva"
              />
              <p className="text-xs text-gray-400 mt-1">Nome de usuário do Windows (sem domínio). Deixe vazio para não vincular.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Perfis</label>
              <div className="flex flex-wrap gap-2">
                {ROLES.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => toggleRole(r.value)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                      form.role.includes(r.value)
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
            {editing && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="active"
                  checked={form.active}
                  onChange={(e) => setForm((p) => ({ ...p, active: e.target.checked }))}
                  className="rounded border-gray-300"
                />
                <label htmlFor="active" className="text-sm text-gray-700">Usuário ativo</label>
              </div>
            )}
            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
            )}
            <div className="flex justify-end gap-2">
              <button onClick={() => setModal(false)} className="px-4 py-2 text-sm text-gray-600">Cancelar</button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 transition-colors"
              >
                {saving && <Spinner className="h-4 w-4" />}
                Salvar
              </button>
            </div>
          </div>
        </Modal>
      )}
    </Layout>
  )
}
