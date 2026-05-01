import client from './client'

export const login = (email, password) =>
  client.post('/auth/login', { email, password })

export const getMe = () => client.get('/auth/me')

export const changePassword = (current_password, new_password) =>
  client.patch('/auth/me/password', { current_password, new_password })
