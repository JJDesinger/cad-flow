import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { submitRequest } from '../api/accessRequests'
import Spinner from '../components/Spinner'

export default function AccessRequest() {
  const [params] = useSearchParams()
  const [type, setType] = useState(params.get('type') === 'password_reset' ? 'password_reset' : 'first_access')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  function handleTabChange(newType) {
    setType(newType)
    setError('')
    setPassword('')
    setConfirm('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('A senha deve ter pelo menos 8 caracteres.')
      return
    }
    if (password !== confirm) {
      setError('As senhas não coincidem.')
      return
    }

    setLoading(true)
    try {
      await submitRequest({
        type,
        name: type === 'first_access' ? name : undefined,
        email,
        password,
      })
      setSuccess(true)
    } catch (err) {
      setError(err.response?.data?.errors?.[0]?.msg ?? err.response?.data?.error ?? 'Erro ao enviar solicitação.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-blue-700">CAD Flow</h1>
          <p className="mt-1 text-sm text-gray-500">Gerenciamento de Atividades CAD</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          {success ? (
            <div className="text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-base font-semibold text-gray-900">Solicitação enviada!</h2>
              <p className="text-sm text-gray-500">
                O administrador foi notificado. Quando aprovado, acesse o sistema com o e-mail e a senha que você cadastrou.
              </p>
              <Link to="/login" className="inline-block text-sm text-blue-600 hover:underline">
                Voltar ao login
              </Link>
            </div>
          ) : (
            <>
              <div className="flex rounded-lg border border-gray-200 overflow-hidden mb-6">
                <button
                  type="button"
                  onClick={() => handleTabChange('first_access')}
                  className={`flex-1 py-2 text-sm font-medium transition-colors ${
                    type === 'first_access'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Primeiro acesso
                </button>
                <button
                  type="button"
                  onClick={() => handleTabChange('password_reset')}
                  className={`flex-1 py-2 text-sm font-medium transition-colors ${
                    type === 'password_reset'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Esqueci minha senha
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {type === 'first_access' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome completo</label>
                    <input
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Seu nome"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">E-mail corporativo</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="seu@empresa.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {type === 'first_access' ? 'Crie sua senha' : 'Nova senha'}
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Mínimo 8 caracteres"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar senha</label>
                  <input
                    type="password"
                    required
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Repita a senha"
                  />
                </div>

                <p className="text-xs text-gray-400">
                  {type === 'first_access'
                    ? 'O administrador aprovará seu cadastro. Após a aprovação, acesse com o e-mail e a senha acima.'
                    : 'O administrador aprovará a redefinição. Após a aprovação, acesse com o e-mail e a nova senha acima.'}
                </p>

                {error && (
                  <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 transition-colors"
                >
                  {loading && <Spinner className="h-4 w-4" />}
                  Enviar solicitação
                </button>
              </form>

              <div className="mt-5 text-center">
                <Link to="/login" className="text-sm text-gray-500 hover:text-gray-700">
                  Voltar ao login
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
