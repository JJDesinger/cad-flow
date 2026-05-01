export const STATUS_LABELS = {
  requested: 'Solicitado',
  in_progress: 'Em Andamento',
  verification: 'Verificação',
  approved: 'Aprovado',
  completed: 'Concluído',
  hold: 'Hold',
}

export const STATUS_COLORS = {
  requested: 'bg-gray-100 text-gray-700',
  in_progress: 'bg-blue-100 text-blue-700',
  verification: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  completed: 'bg-emerald-100 text-emerald-700',
  hold: 'bg-orange-100 text-orange-700',
}

export const PRODUCT_LINES = [
  { value: 'flow_control', label: 'Flow Control' },
  { value: 'well_control', label: 'Well Control' },
]

export const ERROR_TYPES = [
  { code: 'E01', label: 'Falta de atenção' },
  { code: 'E02', label: 'Conhecimento de métodos e processos' },
  { code: 'E03', label: 'Falta de informação de processo' },
  { code: 'E04', label: 'Alteração de escopo' },
  { code: 'E99', label: 'Outros' },
]

export const ROLES = [
  { value: 'admin', label: 'Admin' },
  { value: 'manager', label: 'Gestor' },
  { value: 'planner', label: 'Planejador' },
  { value: 'designer', label: 'Projetista' },
  { value: 'verifier', label: 'Verificador' },
]

export const STATUS_TRANSITIONS = {
  requested: ['in_progress', 'hold'],
  in_progress: ['verification', 'hold'],
  verification: ['approved', 'in_progress', 'hold'],
  approved: ['completed', 'hold'],
  hold: ['requested', 'in_progress', 'verification', 'approved'],
  completed: [],
}
