import type { ChangeEvent } from 'react'
import { useTickets } from './TicketContext'
import type { Priority, Status } from './TicketContext'

const PRIORITIES: (Priority | '')[] = ['', 'Low', 'Medium', 'High']
const STATUSES: (Status | '')[] = ['', 'Open', 'In Progress', 'Resolved', 'Closed']

export function TicketFilters() {
  const { filters, setFilters, users, projects } = useTickets()

  const onChange =
    (field: keyof typeof filters) =>
    (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setFilters({ ...filters, [field]: e.target.value })
    }

  return (
    <div className="sidebar">
      <h2>Filters</h2>
      <div className="filters-grid">
        <div>
          <div className="field-label">Search</div>
          <input
            className="field-input"
            placeholder="Search title or description"
            value={filters.search}
            onChange={onChange('search')}
          />
        </div>
        <div>
          <div className="field-label">Project</div>
          <select className="field-select" value={filters.projectId} onChange={onChange('projectId')}>
            <option value="">All projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.key} — {p.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <div className="field-label">Assignee</div>
          <select className="field-select" value={filters.assigneeId} onChange={onChange('assigneeId')}>
            <option value="">Anyone</option>
            <option value="unassigned">Unassigned</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <div className="field-label">Status</div>
          <select className="field-select" value={filters.status} onChange={onChange('status')}>
            {STATUSES.map((s) => (
              <option key={s || 'any'} value={s}>
                {s || 'Any'}
              </option>
            ))}
          </select>
        </div>
        <div>
          <div className="field-label">Priority</div>
          <select className="field-select" value={filters.priority} onChange={onChange('priority')}>
            {PRIORITIES.map((p) => (
              <option key={p || 'any'} value={p}>
                {p || 'Any'}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}

