import { useTickets } from './TicketContext'

function formatDate(value: string) {
  return new Date(value).toLocaleString()
}

export function TicketTable() {
  const { tickets, users, projects, setSelectedTicket } = useTickets()

  const getUserName = (id: string | null) => users.find((u) => u.id === id)?.name || 'Unassigned'
  const getProjectKey = (id: string) => projects.find((p) => p.id === id)?.key || id

  if (!tickets.length) {
    return <div className="ticket-empty">No tickets match these filters yet.</div>
  }

  return (
    <div className="ticket-table-wrapper">
      <table className="ticket-table">
        <thead>
          <tr>
            <th>Key</th>
            <th>Title</th>
            <th>Assignee</th>
            <th>Priority</th>
            <th>Status</th>
            <th>Updated</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {tickets.map((t) => (
            <tr key={t.id}>
              <td>{getProjectKey(t.projectId)}</td>
              <td>{t.title}</td>
              <td>{getUserName(t.assigneeId)}</td>
              <td>
                <span className={`pill pill-priority-${t.priority.toLowerCase()}`}>{t.priority}</span>
              </td>
              <td>
                <span className={`pill pill-status-${t.status.toLowerCase().replace(' ', '-')}`}>{t.status}</span>
              </td>
              <td>{formatDate(t.updatedAt)}</td>
              <td>
                <button className="btn btn-ghost btn-sm" onClick={() => setSelectedTicket(t)}>
                  Edit
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

