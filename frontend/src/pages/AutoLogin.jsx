import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getMe } from '../api/auth'
import Spinner from '../components/Spinner'

export default function AutoLogin() {
  const [searchParams] = useSearchParams()
  const { login } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState('')

  useEffect(() => {
    const token = searchParams.get('token')
    if (!token) {
      setError('Token de acesso não encontrado.')
      return
    }

    localStorage.setItem('token', token)

    getMe()
      .then((res) => {
        const user = res.data
        login(token, { ...user, roles: user.role ?? user.roles ?? [] })
        navigate('/activities', { replace: true })
      })
      .catch(() => {
        localStorage.removeItem('token')
        setError('Token inválido ou expirado. Faça login manualmente.')
      })
  }, [])

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center space-y-4">
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</p>
          <a href="/login" className="text-sm text-blue-600 hover:underline">Ir para o login</a>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center space-y-3">
        <Spinner className="h-8 w-8 mx-auto text-blue-600" />
        <p className="text-sm text-gray-500">Autenticando, aguarde...</p>
      </div>
    </div>
  )
}
