import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  getActivity, updateStatus, submitVerification, updateActivity,
} from '../api/activities'
import { getUsers } from '../api/users'
import { useAuth } from '../context/AuthContext'
import Layout from '../components/Layout'
import StatusBadge from '../components/StatusBadge'
import Spinner from '../components/Spinner'
import { formatDate, formatDateTime } from '../utils/format'
import {
  STATUS_LABELS, STATUS_TRANSITIONS, ERROR_TYPES, PRODUCT_LINES,
} from '../utils/constants'

function Section({ title, children }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
      <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">{title}</h2>
      {children}
    </div>
  )
}

function Field({ label, value }) {
  return (
    <div>
      <dt className="text-xs text-gray-400 mb-0.5">{label}</dt>
      <dd className="text-sm text-gray-900">{value ?? '—'}</dd>
    </div>
  )
}

export default function ActivityDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, hasAnyRole } = useAuth()
  const isNew = id === 'new'

  const [activity, setActivity] = useState(null)
  const [history, setHistory] = useState([])
  const [verifications, setVerifications] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(!isNew)
  const [activeTab, setActiveTab] = useState('info')

  const [statusModal, setStatusModal] = useState(false)
  const [newStatus, setNewStatus] = useState('')
  const [statusNote, setStatusNote] = useState('')

  const [verifModal, setVerifModal] = useState(false)
  const [verifResult, setVerifResult] = useState('approved')
  const [verifErrorType, setVerifErrorType] = useState('')
  const [verifNote, setVerifNote] = useState('')

  const [form, setForm] = useState({
    document_number: '', product_line: '', project: '', equipment: '',
    component: '', document_type: '', document_code: '', file_link: '',
    executor_id: '', verifier_id: '', approver_id: '',
    planned_start_date: '', planned_verification_date: '', planned_completion_date: '',
  })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const canAdmin = hasAnyRole(['admin', 'manager', 'planner'])
  const isVerifier = hasAnyRole(['verifier'])
  const transitions = activity ? STATUS_TRANSITIONS[activity.status] ?? [] : []

  useEffect(() => {
    if (isNew) {
      getUsers().then((r) => setUsers(r.data)).catch(() => {})
      return
    }
    setLoading(true)
    Promise.all([getActivity(id), getUsers().catch(() => ({ data: [] }))])
      .then(([actRes, usersRes]) => {
        const a = actRes.data
        setActivity(a)
        setHistory(a.history ?? [])
        setVerifications(a.verifications ?? [])
        setUsers(usersRes.data)
        setForm({
          document_number: a.document_number ?? '',
          product_line: a.product_line ?? '',
          project: a.project ?? '',
          equipment: a.equipment ?? '',
          component: a.component ?? '',
          document_type: a.document_type ?? '',
          document_code: a.document_code ?? '',
          file_link: a.file_link ?? '',
          executor_id: a.executor_id ?? '',
          verifier_id: a.verifier_id ?? '',
          approver_id: a.approver_id ?? '',
          planned_start_date: a.planned_start_date?.slice(0, 10) ?? '',
          planned_verification_date: a.planned_verification_date?.slice(0, 10) ?? '',
          planned_completion_date: a.planned_completion_date?.slice(0, 10) ?? '',
        })
      })
      .finally(() => setLoading(false))
  }, [id, isNew])

  async function handleSave() {
    setSaving(true)
    setFormError('')
    try {
      const payload = Object.fromEntries(
        Object.entries(form).filter(([, v]) => v !== '')
      )
      if (isNew) {
        const res = await (await import('../api/activities')).createActivity(payload)
        navigate(`/activities/${res.data.id}`)
      } else {
        const res = await updateActivity(id, payload)
        setActivity(res.data)
      }
    } catch (err) {
      setFormError(err.response?.data?.error ?? 'Erro ao salvar.')
    } finally {
      setSaving(false)
    }
  }

  async function handleStatusChange() {
    try {
      await updateStatus(id, { status: newStatus, note: statusNote })
      const res = await getActivity(id)
      setActivity(res.data)
      setHistory(res.data.history ?? [])
      setVerifications(res.data.verifications ?? [])
      setStatusModal(false)
      setStatusNote('')
    } catch (err) {
      alert(err.response?.data?.error ?? 'Erro ao mudar status.')
    }
  }

  async function handleVerification() {
    try {
      const payload = {
        result: verifResult,
        notes: verifNote,
        ...(verifResult === 'rejected' && { error_code: verifErrorType }),
      }
      await submitVerification(id, payload)
      const res = await getActivity(id)
      setActivity(res.data)
      setVerifications(res.data.verifications ?? [])
      setVerifModal(false)
      setVerifNote('')
      setVerifErrorType('')
    } catch (err) {
      alert(err.response?.data?.error ?? 'Erro ao enviar verificação.')
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center py-20">
          <Spinner />
        </div>
      </Layout>
    )
  }

  if (isNew) {
    return (
      <Layout>
        <div className="space-y-4 max-w-3xl">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/activities')} className="text-gray-400 hover:text-gray-600 text-sm">← Voltar</button>
            <h1 className="text-xl font-semibold text-gray-900">Nova Atividade</h1>
          </div>
          <Section title="Dados da Atividade">
            <ActivityForm form={form} setForm={setForm} users={users} />
          </Section>
          {formError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{formError}</p>
          )}
          <div className="flex justify-end gap-3">
            <button onClick={() => navigate('/activities')} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">Cancelar</button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 transition-colors"
            >
              {saving && <Spinner className="h-4 w-4" />}
              Criar Atividade
            </button>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="space-y-4 max-w-4xl">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/activities')} className="text-gray-400 hover:text-gray-600 text-sm">← Voltar</button>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                {activity.document_number ?? `Atividade #${activity.id}`}
              </h1>
              <p className="text-sm text-gray-400">
                {activity.project} · {activity.product_line}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={activity.status} />
            {transitions.length > 0 && (
              <button
                onClick={() => setStatusModal(true)}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Mudar Status
              </button>
            )}
            {activity.status === 'verification' && isVerifier && (
              <button
                onClick={() => setVerifModal(true)}
                className="rounded-lg bg-yellow-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-yellow-600 transition-colors"
              >
                Verificar
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-gray-200">
          {['info', 'history', 'verifications'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-blue-600 text-blue-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab === 'info' ? 'Informações' : tab === 'history' ? 'Histórico' : 'Verificações'}
            </button>
          ))}
        </div>

        {/* Info tab */}
        {activeTab === 'info' && (
          <div className="space-y-4">
            <Section title="Identificação">
              <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <Field label="Nº do Documento" value={activity.document_number} />
                <Field label="Linha de Produto" value={activity.product_line} />
                <Field label="Projeto" value={activity.project} />
                <Field label="Equipamento" value={activity.equipment} />
                <Field label="Componente" value={activity.component} />
                <Field label="Tipo de Documento" value={activity.document_type} />
                <Field label="Codificação" value={activity.document_coding} />
                <Field label="Arquivo">
                  {activity.file_link ? (
                    <a href={activity.file_link} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline text-sm">
                      Abrir no Teamcenter
                    </a>
                  ) : undefined}
                </Field>
              </dl>
            </Section>
            <Section title="Responsáveis">
              <dl className="grid grid-cols-3 gap-4">
                <Field label="Executor" value={activity.executor_name} />
                <Field label="Verificador" value={activity.verifier_name} />
                <Field label="Aprovador" value={activity.approver_name} />
              </dl>
            </Section>
            <Section title="Datas">
              <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <Field label="Início Planejado" value={formatDate(activity.planned_start_date)} />
                <Field label="Início Efetivo" value={formatDate(activity.actual_start_date)} />
                <Field label="Verificação Planejada" value={formatDate(activity.planned_verification_date)} />
                <Field label="Verificação Efetiva" value={formatDate(activity.actual_verification_date)} />
                <Field label="Conclusão Planejada" value={formatDate(activity.planned_completion_date)} />
                <Field label="Conclusão Efetiva" value={formatDate(activity.actual_completion_date)} />
              </dl>
            </Section>
            {canAdmin && (
              <div className="space-y-4">
                <Section title="Editar Atividade">
                  <ActivityForm form={form} setForm={setForm} users={users} />
                  {formError && (
                    <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{formError}</p>
                  )}
                  <div className="flex justify-end">
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 transition-colors"
                    >
                      {saving && <Spinner className="h-4 w-4" />}
                      Salvar Alterações
                    </button>
                  </div>
                </Section>
              </div>
            )}
          </div>
        )}

        {/* History tab */}
        {activeTab === 'history' && (
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
            {history.length === 0 ? (
              <p className="text-center py-10 text-sm text-gray-400">Sem histórico.</p>
            ) : (
              history.map((h) => (
                <div key={h.id} className="px-5 py-4 flex items-start gap-4">
                  <div className="flex flex-col items-center gap-1 mt-0.5">
                    <StatusBadge status={h.from_status} />
                    <span className="text-gray-400 text-xs">→</span>
                    <StatusBadge status={h.to_status} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-700">{h.changed_by_name}</p>
                    <p className="text-xs text-gray-400">{formatDateTime(h.changed_at)}</p>
                    {h.note && <p className="text-sm text-gray-500 mt-1 italic">{h.note}</p>}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Verifications tab */}
        {activeTab === 'verifications' && (
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
            {verifications.length === 0 ? (
              <p className="text-center py-10 text-sm text-gray-400">Sem verificações.</p>
            ) : (
              verifications.map((v) => (
                <div key={v.id} className="px-5 py-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-sm font-medium ${v.result === 'approved' ? 'text-green-700' : 'text-red-700'}`}>
                      {v.result === 'approved' ? 'Aprovado' : 'Reprovado'} — Iteração {v.iteration}
                    </span>
                    <span className="text-xs text-gray-400">{formatDateTime(v.created_at)}</span>
                  </div>
                  <p className="text-sm text-gray-600">{v.verifier_name}</p>
                  {v.error_type && (
                    <p className="text-xs text-red-500 mt-1">
                      {ERROR_TYPES.find((e) => e.code === v.error_type)?.label ?? v.error_type}
                    </p>
                  )}
                  {v.note && <p className="text-sm text-gray-400 mt-1 italic">{v.note}</p>}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Status change modal */}
      {statusModal && (
        <Modal title="Mudar Status" onClose={() => setStatusModal(false)}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Novo Status</label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Selecione...</option>
                {transitions.map((s) => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Observação (opcional)</label>
              <textarea
                rows={3}
                value={statusNote}
                onChange={(e) => setStatusNote(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setStatusModal(false)} className="px-4 py-2 text-sm text-gray-600">Cancelar</button>
              <button
                onClick={handleStatusChange}
                disabled={!newStatus}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 transition-colors"
              >
                Confirmar
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Verification modal */}
      {verifModal && (
        <Modal title="Submeter Verificação" onClose={() => setVerifModal(false)}>
          <div className="space-y-4">
            <div className="flex gap-3">
              {['approved', 'rejected'].map((r) => (
                <button
                  key={r}
                  onClick={() => setVerifResult(r)}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                    verifResult === r
                      ? r === 'approved'
                        ? 'bg-green-100 border-green-400 text-green-800'
                        : 'bg-red-100 border-red-400 text-red-800'
                      : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {r === 'approved' ? 'Aprovar' : 'Reprovar'}
                </button>
              ))}
            </div>
            {verifResult === 'rejected' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Erro</label>
                <select
                  value={verifErrorType}
                  onChange={(e) => setVerifErrorType(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecione...</option>
                  {ERROR_TYPES.map((e) => (
                    <option key={e.code} value={e.code}>{e.code} — {e.label}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Observação</label>
              <textarea
                rows={3}
                value={verifNote}
                onChange={(e) => setVerifNote(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setVerifModal(false)} className="px-4 py-2 text-sm text-gray-600">Cancelar</button>
              <button
                onClick={handleVerification}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
              >
                Enviar
              </button>
            </div>
          </div>
        </Modal>
      )}
    </Layout>
  )
}

function ActivityForm({ form, setForm, users }) {
  function set(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <label className="block text-xs text-gray-500 mb-1">Nº do Documento</label>
        <input value={form.document_number} onChange={(e) => set('document_number', e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Linha de Produto</label>
        <select value={form.product_line} onChange={(e) => set('product_line', e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Selecione...</option>
          {PRODUCT_LINES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Projeto</label>
        <input value={form.project} onChange={(e) => set('project', e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Equipamento</label>
        <input value={form.equipment} onChange={(e) => set('equipment', e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Componente</label>
        <input value={form.component} onChange={(e) => set('component', e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Tipo de Documento</label>
        <input value={form.document_type} onChange={(e) => set('document_type', e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Codificação</label>
        <input value={form.document_code} onChange={(e) => set('document_code', e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Link do Arquivo (Teamcenter)</label>
        <input value={form.file_link} onChange={(e) => set('file_link', e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Executor</label>
        <select value={form.executor_id} onChange={(e) => set('executor_id', e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Sem executor</option>
          {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Verificador</label>
        <select value={form.verifier_id} onChange={(e) => set('verifier_id', e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Sem verificador</option>
          {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Aprovador</label>
        <select value={form.approver_id} onChange={(e) => set('approver_id', e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Sem aprovador</option>
          {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Início Planejado</label>
        <input type="date" value={form.planned_start_date} onChange={(e) => set('planned_start_date', e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Verificação Planejada</label>
        <input type="date" value={form.planned_verification_date} onChange={(e) => set('planned_verification_date', e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Conclusão Planejada</label>
        <input type="date" value={form.planned_completion_date} onChange={(e) => set('planned_completion_date', e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>
    </div>
  )
}

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
