import client from './client'

export const submitRequest = (data) => client.post('/access-requests', data)

export const getRequests = (status = 'pending') =>
  client.get('/access-requests', { params: { status } })

export const processRequest = (id, data) => client.patch(`/access-requests/${id}`, data)
