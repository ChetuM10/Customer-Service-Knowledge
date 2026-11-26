import { useState, useEffect } from 'react';
import { gapAPI, ticketAPI } from '../services/api';
import StatusBadge from '../components/StatusBadge';

const GAP_STATUSES = ['Open', 'Under Review', 'Article Required', 'Resolved', 'Closed'];
const GAP_PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];

const EMPTY_FORM = {
  ticketId: '',
  reason: '',
  priority: 'Medium',
  status: 'Open',
};

export default function KnowledgeGapsPage() {
  const [gaps, setGaps] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Create / Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGapId, setEditingGapId] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [gapsRes, ticketsRes] = await Promise.all([
        gapAPI.getAll(),
        ticketAPI.getAll(),
      ]);
      setGaps(gapsRes.data?.knowledgeGaps || []);
      setTickets(ticketsRes.data?.supportRequests || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load knowledge gaps. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openCreateModal = () => {
    setEditingGapId(null);
    setFormData({
      ...EMPTY_FORM,
      ticketId: tickets[0]?.ticketId ? String(tickets[0].ticketId) : '',
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (gap) => {
    setEditingGapId(gap.gapId);
    setFormData({
      ticketId: String(gap.ticketId),
      reason: gap.reason || '',
      priority: gap.priority || 'Medium',
      status: gap.status || 'Open',
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFormError('');

    try {
      if (editingGapId === null) {
        await gapAPI.create({
          ticketId: Number(formData.ticketId),
          reason: formData.reason,
          priority: formData.priority,
        });
      } else {
        await gapAPI.update(editingGapId, {
          reason: formData.reason,
          priority: formData.priority,
          status: formData.status,
        });
      }
      setIsModalOpen(false);
      await fetchData();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to save knowledge gap.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (gapId) => {
    if (!window.confirm(`Delete knowledge gap ${gapId}?`)) return;
    try {
      await gapAPI.delete(gapId);
      setGaps((prev) => prev.filter((g) => g.gapId !== gapId));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete knowledge gap.');
    }
  };

  const filteredGaps = gaps.filter((g) => {
    const matchesStatus = statusFilter === 'All' || g.status === statusFilter;
    const q = search.toLowerCase();
    const matchesSearch =
      g.gapId?.toLowerCase().includes(q) ||
      String(g.ticketId).includes(q) ||
      g.category?.toLowerCase().includes(q) ||
      g.reason?.toLowerCase().includes(q) ||
      g.issueDescription?.toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  const openCount = gaps.filter((g) => g.status === 'Open' || g.status === 'Article Required').length;
  const resolvedCount = gaps.filter((g) => g.status === 'Resolved' || g.status === 'Closed').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '16px' }}>
        <div className="card card-interactive">
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Total Gaps</div>
          <div style={{ fontSize: '28px', fontWeight: 700, marginTop: '6px' }}>{gaps.length}</div>
        </div>
        <div className="card card-interactive">
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Needs Action / Article</div>
          <div style={{ fontSize: '28px', fontWeight: 700, marginTop: '6px', color: 'var(--accent)' }}>{openCount}</div>
        </div>
        <div className="card card-interactive">
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Resolved / Closed</div>
          <div style={{ fontSize: '28px', fontWeight: 700, marginTop: '6px', color: '#22c55e' }}>{resolvedCount}</div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="card" style={{ padding: '16px 20px', display: 'flex', gap: '12px', justifyContent: 'space-between', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '10px', flex: '1 1 320px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1 1 220px', maxWidth: '340px' }}>
            <span
              className="material-symbols-outlined"
              style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '18px', color: 'var(--text-muted)' }}
            >
              search
            </span>
            <input
              type="text"
              className="form-input"
              placeholder="Search gap ID, ticket ID, category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '36px' }}
            />
          </div>

          <select
            className="form-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ width: 'auto', minWidth: '150px' }}
          >
            <option value="All">All Statuses</option>
            {GAP_STATUSES.map((st) => (
              <option key={st} value={st}>{st}</option>
            ))}
          </select>
        </div>

        <button className="btn btn-primary" onClick={openCreateModal}>
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
          Log Knowledge Gap
        </button>
      </div>

      {/* Gaps Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            Loading knowledge gaps...
          </div>
        ) : error ? (
          <div style={{ padding: '32px', textAlign: 'center', color: '#ef4444' }}>
            <p style={{ marginBottom: '12px' }}>{error}</p>
            <button className="btn" onClick={fetchData}>Retry</button>
          </div>
        ) : filteredGaps.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            No knowledge gaps found.
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Gap ID</th>
                  <th>Ticket</th>
                  <th>Category</th>
                  <th>Reason / Missing Topic</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredGaps.map((g) => (
                  <tr key={g._id}>
                    <td style={{ fontWeight: 600, color: 'var(--accent)' }}>{g.gapId}</td>
                    <td style={{ fontWeight: 500 }}>#{g.ticketId}</td>
                    <td><StatusBadge label={g.category} /></td>
                    <td style={{ maxWidth: '300px', color: 'var(--text-secondary)' }}>
                      <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {g.reason || g.issueDescription}
                      </div>
                    </td>
                    <td><StatusBadge label={g.priority} /></td>
                    <td><StatusBadge label={g.status} /></td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button
                        className="btn"
                        title="Update Gap"
                        onClick={() => openEditModal(g)}
                        style={{ marginRight: '8px', padding: '5px 10px' }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>edit</span>
                      </button>
                      <button
                        className="btn btn-danger"
                        title="Delete Gap"
                        onClick={() => handleDelete(g.gapId)}
                        style={{ padding: '5px 10px' }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>delete</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 600 }}>
                {editingGapId === null ? 'Log Knowledge Gap' : `Update ${editingGapId}`}
              </h2>
              <button className="btn" onClick={() => setIsModalOpen(false)} style={{ padding: '4px 8px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
              </button>
            </div>

            {formError && (
              <div style={{ padding: '10px 12px', borderRadius: '8px', background: 'rgba(239,68,68,0.12)', color: '#ef4444', fontSize: '13px', marginBottom: '14px' }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {editingGapId === null && (
                <div className="form-group">
                  <label className="form-label">Support Ticket *</label>
                  {tickets.length > 0 ? (
                    <select className="form-select" name="ticketId" value={formData.ticketId} onChange={handleChange} required>
                      <option value="">Select a ticket...</option>
                      {tickets.map((t) => (
                        <option key={t._id} value={t.ticketId}>
                          #{t.ticketId} — {t.subject}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      className="form-input"
                      type="number"
                      name="ticketId"
                      placeholder="Ticket ID (e.g. 1001)"
                      value={formData.ticketId}
                      onChange={handleChange}
                      required
                    />
                  )}
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Reason / Gap Description *</label>
                <textarea
                  className="form-textarea"
                  name="reason"
                  rows={3}
                  placeholder="Why existing knowledge articles did not cover this issue..."
                  value={formData.reason}
                  onChange={handleChange}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: editingGapId ? '1fr 1fr' : '1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Priority</label>
                  <select className="form-select" name="priority" value={formData.priority} onChange={handleChange}>
                    {GAP_PRIORITIES.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>

                {editingGapId !== null && (
                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select className="form-select" name="status" value={formData.status} onChange={handleChange}>
                      {GAP_STATUSES.map((st) => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" className="btn" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : editingGapId === null ? 'Create Gap' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
