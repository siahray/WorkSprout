export type SignupRow = {
  id: string
  email: string | null
  full_name: string | null
  profession: string | null
  created_at: string
  invited_at: string | null
}

export type AdminUser = {
  id: string
  email: string | null
  full_name: string | null
  business_name: string | null
  app_role: string
  banned: boolean
  last_sign_in_at: string | null
  created_at: string
  projects: number
  clients: number
  invoices: number
  todos: number
  time_minutes: number
}

export type UsageStats = {
  users: number
  admins: number
  signups: number
  signups_7d: number
  signups_30d: number
  invited: number
  clients: number
  projects: number
  active_projects: number
  tasks: number
  subtasks: number
  todos: number
  invoices: number
  payments: number
  time_entries: number
  time_minutes: number
  feedback_total: number
  feedback_new: number
}

export type FeedbackRow = {
  id: string
  user_id: string | null
  email: string | null
  message: string
  page: string | null
  status: 'new' | 'read' | 'resolved'
  created_at: string
  updated_at: string
}

export type AuditRow = {
  id: string
  actor_email: string | null
  action: string
  target: string | null
  metadata: Record<string, unknown> | null
  created_at: string
}

export type BroadcastRow = {
  id: string
  subject: string
  audience: string
  recipient_count: number
  provider: string | null
  status: string
  error: string | null
  created_at: string
}
