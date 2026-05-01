import client from './client'

export const getActivities = (params) => client.get('/activities', { params })

export const getActivity = (id) => client.get(`/activities/${id}`)

export const createActivity = (data) => client.post('/activities', data)

export const updateActivity = (id, data) => client.patch(`/activities/${id}`, data)

export const updateStatus = (id, { status, note }) =>
  client.patch(`/activities/${id}/status`, { new_status: status, notes: note })

export const getHistory = (id) => client.get(`/activities/${id}/history`)

export const getVerifications = (id) => client.get(`/activities/${id}/verifications`)

export const submitVerification = (id, data) =>
  client.post(`/activities/${id}/verifications`, data)
