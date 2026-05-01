export function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('pt-BR')
}

export function formatDateTime(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleString('pt-BR')
}

export function formatPercent(value) {
  if (value == null) return '—'
  return `${Number(value).toFixed(1)}%`
}

export function roleLabel(roleStr) {
  const map = {
    admin: 'Admin',
    manager: 'Gestor',
    planner: 'Planejador',
    designer: 'Projetista',
    verifier: 'Verificador',
  }
  if (!roleStr) return '—'
  const roles = Array.isArray(roleStr) ? roleStr : [roleStr]
  return roles.map((r) => map[r] ?? r).join(', ')
}
