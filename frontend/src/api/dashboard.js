import client from './client'

export const getKpis = (params) => client.get('/dashboard/kpis', { params })

export const getWorkload = (params) => client.get('/dashboard/workload', { params })

export const getOverdue = (params) => client.get('/dashboard/overdue', { params })

export const getVerificationQueue = (params) =>
  client.get('/dashboard/verification-queue', { params })

export const getUnassigned = (params) => client.get('/dashboard/unassigned', { params })

export const getMySummary = () => client.get('/dashboard/my-summary')
