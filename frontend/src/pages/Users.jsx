import { useState, useEffect } from 'react'
import { getUsers, createUser, updateUser, deactivateUser } from '../api/users'
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
  name: '', email: '', password: '', role: ['designer'], active: true,
}

export default function Users() {
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
      role: user.role ?? ['designer'],
      active: user.active,
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
          <h1 className="text-xl font-semibold text-gray-900">Usuários</h1>
          <button
            onClick={openCreate}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
          >
            + Novo Usuário
          </button>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
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
        </div>
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
