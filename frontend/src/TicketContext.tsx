import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '')

export type Priority = 'Low' | 'Medium' | 'High'
export type Status = 'Open' | 'In Progress' | 'Resolved' | 'Closed'

export interface User {
  id: string
  name: string
  email: string
}

export interface Project {
  id: string
  name: string
  key: string
}

export interface Ticket {
  id: string
  title: string
  description: string
  projectId: string
  priority: Priority
  status: Status
  assigneeId: string | null
  createdAt: string
  updatedAt: string
}

export interface TicketFilters {
  search: string
  status: Status | ''
  priority: Priority | ''
  assigneeId: string
  projectId: string
}

interface TicketContextValue {
  tickets: Ticket[]
  users: User[]
  projects: Project[]
  filters: TicketFilters
  selectedTicket: Ticket | null
  setFilters: (f: TicketFilters) => void
  setSelectedTicket: (t: Ticket | null) => void
  refreshTickets: () => Promise<void>
  createTicket: (payload: Partial<Ticket> & { title: string; description: string; projectId: string }) => Promise<void>
  updateTicket: (id: string, payload: Partial<Ticket>) => Promise<void>
}

const TicketContext = createContext<TicketContextValue | undefined>(undefined)

export const useTickets = () => {
  const ctx = useContext(TicketContext)
  if (!ctx) {
    throw new Error('useTickets must be used within TicketProvider')
  }
  return ctx
}

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  })
  if (!res.ok) {
    const msg = await res.text()
    throw new Error(msg || 'Request failed')
  }
  return res.json()
}

export function TicketProvider({ children }: { children: ReactNode }) {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [filters, setFilters] = useState<TicketFilters>({
    search: '',
    status: '',
    priority: '',
    assigneeId: '',
    projectId: '',
  })

  const buildQuery = () => {
    const params = new URLSearchParams()
    if (filters.search) params.set('search', filters.search)
    if (filters.status) params.set('status', filters.status)
    if (filters.priority) params.set('priority', filters.priority)
    if (filters.assigneeId) params.set('assigneeId', filters.assigneeId)
    if (filters.projectId) params.set('projectId', filters.projectId)
    const qs = params.toString()
    return qs ? `/api/tickets?${qs}` : '/api/tickets'
  }

  const refreshTickets = async () => {
    const url = buildQuery()
    const data = await fetchJson<any[]>(url)
    // Normalise IDs from backend (numbers) into strings for the UI
    const normalised: Ticket[] = data.map((t) => ({
      id: String(t.id),
      title: t.title,
      description: t.description,
      projectId: String(t.projectId),
      priority: t.priority as Priority,
      status: t.status as Status,
      assigneeId: t.assigneeId == null ? null : String(t.assigneeId),
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    }))
    setTickets(normalised)
  }

  const loadLookups = async () => {
    const [usersData, projectsData] = await Promise.all([
      fetchJson<any[]>('/api/users'),
      fetchJson<any[]>('/api/projects'),
    ])
    setUsers(
      usersData.map(
        (u) =>
          ({
            id: String(u.id),
            name: u.name,
            email: u.email,
          }) satisfies User,
      ),
    )
    setProjects(
      projectsData.map(
        (p) =>
          ({
            id: String(p.id),
            name: p.name,
            key: p.key,
          }) satisfies Project,
      ),
    )
  }

  const createTicket = async (payload: Partial<Ticket> & { title: string; description: string; projectId: string }) => {
    await fetchJson<Ticket>('/api/tickets', {
      method: 'POST',
      body: JSON.stringify({
        title: payload.title,
        description: payload.description,
        projectId: Number(payload.projectId),
        assigneeId: payload.assigneeId ? Number(payload.assigneeId) : undefined,
        priority: (payload.priority as Priority) ?? 'Medium',
      }),
    })
    await refreshTickets()
  }

  const updateTicket = async (id: string, payload: Partial<Ticket>) => {
    await fetchJson<Ticket>(`/api/tickets/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        ...payload,
        projectId: payload.projectId ? Number(payload.projectId) : undefined,
        assigneeId: payload.assigneeId ? Number(payload.assigneeId) : payload.assigneeId,
      }),
    })
    await refreshTickets()
  }

  useEffect(() => {
    loadLookups().catch((err) => console.error(err))
  }, [])

  useEffect(() => {
    refreshTickets().catch((err) => console.error(err))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.search, filters.status, filters.priority, filters.assigneeId, filters.projectId])

  const value: TicketContextValue = {
    tickets,
    users,
    projects,
    filters,
    selectedTicket,
    setFilters,
    setSelectedTicket,
    refreshTickets,
    createTicket,
    updateTicket,
  }

  return <TicketContext.Provider value={value}>{children}</TicketContext.Provider>
}

