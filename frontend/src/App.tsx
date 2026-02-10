import './App.css'
import { TicketFilters } from './TicketFilters'
import { TicketTable } from './TicketTable'
import { TicketForm } from './TicketForm'
import { useTickets } from './TicketContext'

function App() {
  const { tickets, selectedTicket, users } = useTickets()

  const openCount = tickets.filter((t) => t.status === 'Open').length
  const inProgressCount = tickets.filter((t) => t.status === 'In Progress').length
  const resolvedCount = tickets.filter((t) => t.status === 'Resolved').length
  const currentUser = users[0]

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-title-group">
          <h1>Mini Jira — Bug Tracking</h1>
          <p>Track bugs, assign owners, and keep your team in sync.</p>
          <div className="chip-row">
            <span className="chip">Open: {openCount}</span>
            <span className="chip">In Progress: {inProgressCount}</span>
            <span className="chip">Resolved: {resolvedCount}</span>
          </div>
        </div>
        <div>
          <div className="badge">Signed in as {currentUser?.name ?? 'Guest'}</div>
        </div>
      </header>

      <main className="layout-main">
        <TicketFilters />
        <section>
          <div className="ticket-header">
            <div>
              <h2>Tickets</h2>
              <p className="ticket-meta">
                Manage bugs and work items across your projects. Use filters on the left to focus your view.
              </p>
            </div>
          </div>
          <TicketTable />
          <div style={{ marginTop: '1.2rem' }}>
            <TicketForm mode={selectedTicket ? 'edit' : 'create'} />
          </div>
        </section>
      </main>
    </div>
  )
}

export default App
