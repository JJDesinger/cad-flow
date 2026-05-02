import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import AutoLogin from './pages/AutoLogin'
import AccessRequest from './pages/AccessRequest'
import Activities from './pages/Activities'
import ActivityDetail from './pages/ActivityDetail'
import Dashboard from './pages/Dashboard'
import Users from './pages/Users'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/auto-login" element={<AutoLogin />} />
          <Route path="/access-request" element={<AccessRequest />} />
          <Route path="/activities" element={<ProtectedRoute><Activities /></ProtectedRoute>} />
          <Route path="/activities/:id" element={<ProtectedRoute><ActivityDetail /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route
            path="/users"
            element={
              <ProtectedRoute roles={['admin', 'manager']}>
                <Users />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/activities" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
