import { FormEvent, useEffect, useState } from 'react'
import { useTickets } from './TicketContext'
import type { Priority, Status, Ticket } from './TicketContext'

interface Props {
  mode: 'create' | 'edit'
}

export function TicketForm({ mode }: Props) {
  const { users, projects, selectedTicket, setSelectedTicket, createTicket, updateTicket } = useTickets()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [projectId, setProjectId] = useState('')
  const [priority, setPriority] = useState<Priority>('Medium')
  const [status, setStatus] = useState<Status>('Open')
  const [assigneeId, setAssigneeId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (mode === 'edit' && selectedTicket) {
      setTitle(selectedTicket.title)
      setDescription(selectedTicket.description)
      setProjectId(selectedTicket.projectId)
      setPriority(selectedTicket.priority)
      setStatus(selectedTicket.status)
      setAssigneeId(selectedTicket.assigneeId || '')
    } else if (mode === 'create') {
      setTitle('')
      setDescription('')
      setProjectId(projects[0]?.id || '')
      setPriority('Medium')
      setStatus('Open')
      setAssigneeId('')
    }
  }, [mode, selectedTicket, projects])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!title.trim() || !description.trim() || !projectId) {
      setError('Title, description and project are required.')
      return
    }

    try {
      setSubmitting(true)
      if (mode === 'create') {
        await createTicket({
          title: title.trim(),
          description: description.trim(),
          projectId,
          priority,
          assigneeId: assigneeId || null,
        })
        setTitle('')
        setDescription('')
        setAssigneeId('')
      } else if (mode === 'edit' && selectedTicket) {
        const payload: Partial<Ticket> = {
          title: title.trim(),
          description: description.trim(),
          projectId,
          priority,
          status,
          assigneeId: assigneeId || null,
        }
        await updateTicket(selectedTicket.id, payload)
        setSelectedTicket(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save ticket.')
    } finally {
      setSubmitting(false)
    }
  }

  const heading = mode === 'create' ? 'Create Ticket' : 'Edit Ticket'
  const descriptionText =
    mode === 'create' ? 'Capture a new bug, task, or enhancement.' : 'Update status, priority, or ownership.'

  return (
    <form className="ticket-form" onSubmit={handleSubmit}>
      <div>
        <div className="field-label">{heading}</div>
        <p className="subtle">{descriptionText}</p>
      </div>

      <div>
        <div className="field-label">Title</div>
        <input
          className="field-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Short summary of the issue"
        />
      </div>

      <div>
        <div className="field-label">Description</div>
        <textarea
          className="field-textarea"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Steps to reproduce, expected vs actual behaviour, links, etc."
        />
      </div>

      <div className="ticket-form-row">
        <div>
          <div className="field-label">Project</div>
          <select className="field-select" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
            <option value="">Select project</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.key} — {p.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <div className="field-label">Assignee</div>
          <select className="field-select" value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
            <option value="">Unassigned</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="ticket-form-row">
        <div>
          <div className="field-label">Priority</div>
          <select
            className="field-select"
            value={priority}
            onChange={(e) => setPriority(e.target.value as Priority)}
          >
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
          </select>
        </div>
        {mode === 'edit' && (
          <div>
            <div className="field-label">Status</div>
            <select className="field-select" value={status} onChange={(e) => setStatus(e.target.value as Status)}>
              <option value="Open">Open</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
              <option value="Closed">Closed</option>
            </select>
          </div>
        )}
      </div>

      <div className="ticket-form-footer">
        {mode === 'edit' && (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setSelectedTicket(null)}
            disabled={submitting}
          >
            Cancel
          </button>
        )}
        <button type="submit" className="btn btn-primary btn-sm" disabled={submitting}>
          {submitting ? 'Saving…' : mode === 'create' ? 'Create Ticket' : 'Save Changes'}
        </button>
      </div>

      {error && <div className="subtle" style={{ color: '#fca5a5' }}>{error}</div>}
    </form>
  )
}

