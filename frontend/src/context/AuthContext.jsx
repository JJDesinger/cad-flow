import { createContext, useContext, useState, useEffect } from 'react'
import { getMe } from '../api/auth'

const AuthContext = createContext(null)

function normalize(userData) {
  if (!userData) return null
  return { ...userData, role: userData.role ?? userData.roles ?? [] }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) { setLoading(false); return }
    getMe()
      .then((res) => setUser(normalize(res.data)))
      .catch(() => localStorage.removeItem('token'))
      .finally(() => setLoading(false))
  }, [])

  function login(token, userData) {
    localStorage.setItem('token', token)
    setUser(normalize(userData))
  }

  function logout() {
    localStorage.removeItem('token')
    setUser(null)
  }

  function hasRole(role) {
    return user?.role?.includes(role) ?? false
  }

  function hasAnyRole(roles) {
    return roles.some((r) => hasRole(r))
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, hasRole, hasAnyRole }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
