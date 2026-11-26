import { useState, useEffect } from 'react';
import { ticketAPI, customerAPI, resolutionAPI, feedbackAPI } from '../services/api';
import StatusBadge from '../components/StatusBadge';

const EMPTY_CREATE_FORM = {
  customerId: '',
  subject: '',
  description: '',
  priority: 'Medium',
  channel: 'Web',
};

const RESOLUTION_STATUSES = [
  'Generated',
  'NeedsClarification',
  'Escalated',
  'In Progress',
  'Resolved',
  'Rejected',
];

export default function TicketsPage() {
  const [tickets, setTickets] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  // Create / Edit Ticket Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTicketId, setEditingTicketId] = useState(null);
  const [formData, setFormData] = useState(EMPTY_CREATE_FORM);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  // ML Breakdown Modal
  const [selectedTicket, setSelectedTicket] = useState(null);

  // AI Resolution, Resolution Management & Feedback Modal (Modules 7, 8, 9)
  const [resModalTicket, setResModalTicket] = useState(null);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [savedResolution, setSavedResolution] = useState(null);
  const [resLoading, setResLoading] = useState(false);
  const [resForm, setResForm] = useState({ agentResponse: '', resolutionStatus: 'In Progress', resolvedBy: '' });
  const [resSaving, setResSaving] = useState(false);
  const [autoGapNotice, setAutoGapNotice] = useState(null);

  // Article Feedback State (Module 9)
  const [ticketFeedback, setTicketFeedback] = useState([]);
  const [fbForm, setFbForm] = useState({
    articleId: '',
    rating: 5,
    isHelpful: true,
    comments: '',
    submittedBy: 'Agent',
  });
  const [fbSaving, setFbSaving] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [ticketsRes, customersRes] = await Promise.all([
        ticketAPI.getAll(),
        customerAPI.getAll(),
      ]);
      setTickets(ticketsRes.data?.supportRequests || []);
      setCustomers(customersRes.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load support tickets. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openCreateModal = () => {
    setEditingTicketId(null);
    setFormData({
      ...EMPTY_CREATE_FORM,
      customerId: customers[0]?.customerId ? String(customers[0].customerId) : '',
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (ticket) => {
    setEditingTicketId(ticket.ticketId);
    setFormData({
      subject: ticket.subject || '',
      description: ticket.description || '',
      priority: ticket.priority || 'Medium',
      status: ticket.status || 'Open',
      channel: ticket.channel || 'Web',
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
      if (editingTicketId === null) {
        await ticketAPI.create({
          customerId: Number(formData.customerId),
          subject: formData.subject,
          description: formData.description,
          priority: formData.priority,
          channel: formData.channel,
        });
      } else {
        await ticketAPI.update(editingTicketId, {
          subject: formData.subject,
          description: formData.description,
          priority: formData.priority,
          status: formData.status,
          channel: formData.channel,
        });
      }
      setIsModalOpen(false);
      await fetchData();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to save support ticket.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (ticketId) => {
    if (!window.confirm(`Delete support ticket #${ticketId}?`)) return;
    try {
      await ticketAPI.delete(ticketId);
      setTickets((prev) => prev.filter((t) => t.ticketId !== ticketId));
      if (selectedTicket?.ticketId === ticketId) setSelectedTicket(null);
      if (resModalTicket?.ticketId === ticketId) setResModalTicket(null);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete support ticket.');
    }
  };

  // Open AI Resolution + Feedback Modal for a ticket
  const openResolutionModal = async (ticket) => {
    setResModalTicket(ticket);
    setAutoGapNotice(null);
    setResLoading(true);
    setSavedResolution(null);

    const firstArticle = ticket.resolution?.retrievedArticleIds?.[0] || '';
    setFbForm({ articleId: firstArticle, rating: 5, isHelpful: true, comments: '', submittedBy: 'Agent' });

    try {
      const [resResult, fbResult] = await Promise.allSettled([
        resolutionAPI.getByTicket(ticket.ticketId),
        feedbackAPI.getByTicket(ticket.ticketId),
      ]);

      if (resResult.status === 'fulfilled') {
        const existing = resResult.value.data?.resolution;
        setSavedResolution(existing);
        setResForm({
          agentResponse: existing.agentResponse || '',
          resolutionStatus: existing.resolutionStatus || 'In Progress',
          resolvedBy: existing.resolvedBy || '',
        });
      } else {
        setResForm({ agentResponse: '', resolutionStatus: 'In Progress', resolvedBy: '' });
      }

      if (fbResult.status === 'fulfilled') {
        setTicketFeedback(fbResult.value.data?.feedback || []);
      } else {
        setTicketFeedback([]);
      }
    } finally {
      setResLoading(false);
    }
  };

  // Module 7: Generate AI Solution Recommendation
  const handleGenerateAI = async () => {
    if (!resModalTicket) return;
    setGeneratingAI(true);
    setAutoGapNotice(null);
    try {
      const res = await ticketAPI.generateResolution(resModalTicket.ticketId);
      const updatedResolution = res.data?.resolution;
      setResModalTicket((prev) => ({ ...prev, resolution: updatedResolution }));
      setTickets((prev) =>
        prev.map((t) => (t.ticketId === resModalTicket.ticketId ? { ...t, resolution: updatedResolution } : t))
      );
      if (res.data?.knowledgeGap) {
        setAutoGapNotice(res.data.knowledgeGap.gapId);
      }
      if (updatedResolution?.retrievedArticleIds?.[0]) {
        setFbForm((prev) => ({ ...prev, articleId: updatedResolution.retrievedArticleIds[0] }));
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to generate AI resolution.');
    } finally {
      setGeneratingAI(false);
    }
  };

  // Module 8: Save AI recommendation into Resolution collection
  const handleCreateResolutionRecord = async () => {
    if (!resModalTicket) return;
    setResSaving(true);
    try {
      const res = await resolutionAPI.create(resModalTicket.ticketId, {});
      const created = res.data?.resolution;
      setSavedResolution(created);
      setResForm({
        agentResponse: created.agentResponse || '',
        resolutionStatus: created.resolutionStatus || 'In Progress',
        resolvedBy: created.resolvedBy || '',
      });
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save resolution record.');
    } finally {
      setResSaving(false);
    }
  };

  // Module 8: Update Resolution status & agent response
  const handleUpdateResolution = async (e) => {
    e.preventDefault();
    if (!savedResolution) return;
    setResSaving(true);
    try {
      const res = await resolutionAPI.update(savedResolution.resolutionId, resForm);
      setSavedResolution(res.data?.resolution);
      await fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update resolution.');
    } finally {
      setResSaving(false);
    }
  };

  // Module 9: Submit Article Feedback
  const handleSubmitFeedback = async (e) => {
    e.preventDefault();
    if (!resModalTicket || !fbForm.articleId) return;
    setFbSaving(true);
    try {
      await feedbackAPI.create({
        articleId: fbForm.articleId,
        ticketId: resModalTicket.ticketId,
        rating: Number(fbForm.rating),
        isHelpful: fbForm.isHelpful,
        comments: fbForm.comments,
        submittedBy: fbForm.submittedBy || 'Support Agent',
      });
      const fbRes = await feedbackAPI.getByTicket(resModalTicket.ticketId);
      setTicketFeedback(fbRes.data?.feedback || []);
      setFbForm((prev) => ({ ...prev, comments: '' }));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit feedback.');
    } finally {
      setFbSaving(false);
    }
  };

  const filteredTickets = tickets.filter((t) => {
    const q = search.toLowerCase();
    return (
      String(t.ticketId).includes(q) ||
      t.subject?.toLowerCase().includes(q) ||
      t.category?.toLowerCase().includes(q) ||
      t.customer?.fullName?.toLowerCase().includes(q)
    );
  });

  const openCount = tickets.filter((t) => t.status === 'Open').length;
  const reviewCount = tickets.filter((t) => t.category === 'Needs agent review').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '16px' }}>
        <div className="card card-interactive">
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Total Tickets</div>
          <div style={{ fontSize: '28px', fontWeight: 700, marginTop: '6px' }}>{tickets.length}</div>
        </div>
        <div className="card card-interactive">
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Open Tickets</div>
          <div style={{ fontSize: '28px', fontWeight: 700, marginTop: '6px', color: '#38bdf8' }}>{openCount}</div>
        </div>
        <div className="card card-interactive">
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Needs Agent Review (ML &lt; 60%)</div>
          <div style={{ fontSize: '28px', fontWeight: 700, marginTop: '6px', color: 'var(--accent)' }}>{reviewCount}</div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="card" style={{ padding: '16px 20px', display: 'flex', gap: '12px', justifyContent: 'space-between', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 260px', maxWidth: '380px' }}>
          <span
            className="material-symbols-outlined"
            style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '18px', color: 'var(--text-muted)' }}
          >
            search
          </span>
          <input
            type="text"
            className="form-input"
            placeholder="Search by ticket ID, subject, category, customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '36px' }}
          />
        </div>

        <button className="btn btn-primary" onClick={openCreateModal}>
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
          Raise Ticket
        </button>
      </div>

      {/* Tickets Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            Loading support tickets...
          </div>
        ) : error ? (
          <div style={{ padding: '32px', textAlign: 'center', color: '#ef4444' }}>
            <p style={{ marginBottom: '12px' }}>{error}</p>
            <button className="btn" onClick={fetchData}>Retry</button>
          </div>
        ) : filteredTickets.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            No support tickets found. Click <strong>Raise Ticket</strong> to create one.
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Ticket ID</th>
                  <th>Customer</th>
                  <th>Subject</th>
                  <th>ML Category</th>
                  <th>Confidence</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Channel</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTickets.map((t) => (
                  <tr key={t._id}>
                    <td style={{ fontWeight: 600, color: 'var(--accent)' }}>#{t.ticketId}</td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{t.customer?.fullName || 'Unknown'}</div>
                      <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                        ID: #{t.customer?.customerId ?? '—'}
                      </div>
                    </td>
                    <td style={{ maxWidth: '220px' }}>
                      <div style={{ fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {t.subject}
                      </div>
                    </td>
                    <td><StatusBadge label={t.category} /></td>
                    <td style={{ fontWeight: 600 }}>
                      {typeof t.confidence === 'number' ? `${Math.round(t.confidence * 100)}%` : '0%'}
                    </td>
                    <td><StatusBadge label={t.priority} /></td>
                    <td><StatusBadge label={t.status} /></td>
                    <td style={{ color: 'var(--text-secondary)' }}>{t.channel}</td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button
                        className="btn"
                        title="AI Resolution & Feedback"
                        onClick={() => openResolutionModal(t)}
                        style={{ marginRight: '6px', padding: '5px 10px' }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#22c55e' }}>auto_awesome</span>
                      </button>
                      <button
                        className="btn"
                        title="View ML Breakdown"
                        onClick={() => setSelectedTicket(t)}
                        style={{ marginRight: '6px', padding: '5px 10px' }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--accent)' }}>psychology</span>
                      </button>
                      <button
                        className="btn"
                        title="Edit Ticket"
                        onClick={() => openEditModal(t)}
                        style={{ marginRight: '6px', padding: '5px 10px' }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>edit</span>
                      </button>
                      <button
                        className="btn btn-danger"
                        title="Delete Ticket"
                        onClick={() => handleDelete(t.ticketId)}
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

      {/* Create / Edit Ticket Modal */}
      {isModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 600 }}>
                {editingTicketId === null ? 'Raise Support Ticket' : `Update Ticket #${editingTicketId}`}
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
              {editingTicketId === null && (
                <div className="form-group">
                  <label className="form-label">Customer *</label>
                  {customers.length > 0 ? (
                    <select
                      className="form-select"
                      name="customerId"
                      value={formData.customerId}
                      onChange={handleChange}
                      required
                    >
                      <option value="">Select a customer...</option>
                      {customers.map((c) => (
                        <option key={c._id} value={c.customerId}>
                          #{c.customerId} — {c.fullName} ({c.email})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      className="form-input"
                      type="number"
                      name="customerId"
                      placeholder="Enter Customer ID (e.g. 1001)"
                      value={formData.customerId}
                      onChange={handleChange}
                      required
                    />
                  )}
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Subject *</label>
                <input
                  className="form-input"
                  name="subject"
                  placeholder="Short title of the issue"
                  value={formData.subject}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description *</label>
                <textarea
                  className="form-textarea"
                  name="description"
                  rows={4}
                  placeholder="Describe the issue in detail (used by ML classifier)"
                  value={formData.description}
                  onChange={handleChange}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: editingTicketId !== null ? '1fr 1fr 1fr' : '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Priority</label>
                  <select className="form-select" name="priority" value={formData.priority} onChange={handleChange}>
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Channel</label>
                  <select className="form-select" name="channel" value={formData.channel} onChange={handleChange}>
                    <option value="Web">Web</option>
                    <option value="Email">Email</option>
                    <option value="Phone">Phone</option>
                  </select>
                </div>

                {editingTicketId !== null && (
                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select className="form-select" name="status" value={formData.status} onChange={handleChange}>
                      <option value="Open">Open</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Resolved">Resolved</option>
                      <option value="Closed">Closed</option>
                    </select>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" className="btn" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Classifying & Saving...' : editingTicketId === null ? 'Submit Ticket' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ML Classification Detail Modal */}
      {selectedTicket && (
        <div className="modal-backdrop" onClick={() => setSelectedTicket(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 600 }}>
                Ticket #{selectedTicket.ticketId} — ML Classification
              </h2>
              <button className="btn" onClick={() => setSelectedTicket(null)} style={{ padding: '4px 8px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
              </button>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '14px', fontWeight: 600 }}>{selectedTicket.subject}</div>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '6px', lineHeight: 1.5 }}>
                {selectedTicket.description}
              </p>
            </div>

            <div className="card" style={{ padding: '14px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>Assigned Category</span>
                <StatusBadge label={selectedTicket.category} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>Raw Model Prediction</span>
                <span style={{ fontSize: '13px', fontWeight: 600 }}>{selectedTicket.modelCategory || 'Unavailable'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>Confidence Score</span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent)' }}>
                  {Math.round((selectedTicket.confidence || 0) * 100)}%
                </span>
              </div>
            </div>

            <div>
              <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '10px' }}>
                Category Probabilities
              </div>
              {selectedTicket.categoryProbabilities && Object.keys(selectedTicket.categoryProbabilities).length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {Object.entries(selectedTicket.categoryProbabilities)
                    .sort(([, a], [, b]) => b - a)
                    .map(([cat, prob]) => {
                      const pct = Math.round(prob * 100);
                      return (
                        <div key={cat}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', marginBottom: '4px' }}>
                            <span>{cat}</span>
                            <span style={{ color: 'var(--text-secondary)' }}>{pct}%</span>
                          </div>
                          <div style={{ height: '6px', borderRadius: '999px', backgroundColor: 'var(--border-color)', overflow: 'hidden' }}>
                            <div
                              style={{
                                width: `${pct}%`,
                                height: '100%',
                                backgroundColor: cat === selectedTicket.modelCategory ? 'var(--accent)' : 'var(--text-muted)',
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  No probability breakdown available.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* AI Resolution, Resolution Management & Article Feedback Modal (Modules 7, 8, 9) */}
      {resModalTicket && (
        <div className="modal-backdrop" onClick={() => setResModalTicket(null)}>
          <div className="modal-content" style={{ maxWidth: '680px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 600 }}>
                  Ticket #{resModalTicket.ticketId} — AI Resolution &amp; Feedback
                </h2>
                <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  {resModalTicket.subject}
                </p>
              </div>
              <button className="btn" onClick={() => setResModalTicket(null)} style={{ padding: '4px 8px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
              </button>
            </div>

            {autoGapNotice && (
              <div style={{ padding: '10px 12px', borderRadius: '8px', background: 'rgba(234,179,8,0.12)', color: 'var(--accent)', fontSize: '13px', marginBottom: '14px' }}>
                No matching published article was found. Knowledge Gap <strong>{autoGapNotice}</strong> was automatically logged!
              </div>
            )}

            {/* Section A: Module 7 — AI Recommendation */}
            <div className="card" style={{ padding: '16px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 600 }}>1. AI Solution Recommendation</h3>
                <button className="btn btn-primary" onClick={handleGenerateAI} disabled={generatingAI}>
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>auto_awesome</span>
                  {generatingAI ? 'Generating...' : resModalTicket.resolution?.generatedResolution ? 'Regenerate AI' : 'Generate AI Resolution'}
                </button>
              </div>

              {resModalTicket.resolution?.generatedResolution ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
                  <p style={{ lineHeight: 1.5 }}>{resModalTicket.resolution.generatedResolution}</p>

                  {resModalTicket.resolution.troubleshootingSteps?.length > 0 && (
                    <div>
                      <strong style={{ color: 'var(--text-secondary)' }}>Troubleshooting Steps:</strong>
                      <ol style={{ paddingLeft: '18px', marginTop: '4px', color: 'var(--text-secondary)' }}>
                        {resModalTicket.resolution.troubleshootingSteps.map((step, i) => (
                          <li key={i} style={{ marginBottom: '3px' }}>{step}</li>
                        ))}
                      </ol>
                    </div>
                  )}

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                    <StatusBadge label={resModalTicket.resolution.resolutionStatus} />
                    {resModalTicket.resolution.requiresAgent && (
                      <StatusBadge label="Needs agent review" />
                    )}
                    {resModalTicket.resolution.retrievedArticleIds?.length > 0 && (
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        Matched Articles: {resModalTicket.resolution.retrievedArticleIds.join(', ')}
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  No AI recommendation generated yet. Click <strong>Generate AI Resolution</strong> above.
                </p>
              )}
            </div>

            {/* Section B: Module 8 — Resolution Management */}
            <div className="card" style={{ padding: '16px', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>2. Resolution Tracking</h3>

              {resLoading ? (
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Checking resolution record...</p>
              ) : !savedResolution ? (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    Save the AI recommendation as an official Resolution record to track agent progress.
                  </p>
                  <button
                    className="btn btn-primary"
                    onClick={handleCreateResolutionRecord}
                    disabled={resSaving || !resModalTicket.resolution?.generatedResolution}
                  >
                    {resSaving ? 'Saving...' : 'Save Resolution'}
                  </button>
                </div>
              ) : (
                <form onSubmit={handleUpdateResolution}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', color: 'var(--text-muted)', marginBottom: '10px' }}>
                    <span>Resolution ID: <strong style={{ color: 'var(--accent)' }}>{savedResolution.resolutionId}</strong></span>
                    <StatusBadge label={savedResolution.resolutionStatus} />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div className="form-group">
                      <label className="form-label">Resolution Status</label>
                      <select
                        className="form-select"
                        value={resForm.resolutionStatus}
                        onChange={(e) => setResForm((p) => ({ ...p, resolutionStatus: e.target.value }))}
                      >
                        {RESOLUTION_STATUSES.map((st) => (
                          <option key={st} value={st}>{st}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Resolved By</label>
                      <input
                        className="form-input"
                        placeholder="Agent name"
                        value={resForm.resolvedBy}
                        onChange={(e) => setResForm((p) => ({ ...p, resolvedBy: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Agent Response / Notes</label>
                    <textarea
                      className="form-textarea"
                      rows={2}
                      placeholder="Final resolution notes sent to customer..."
                      value={resForm.agentResponse}
                      onChange={(e) => setResForm((p) => ({ ...p, agentResponse: e.target.value }))}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button type="submit" className="btn btn-primary" disabled={resSaving}>
                      {resSaving ? 'Updating...' : 'Update Resolution'}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Section C: Module 9 — Article Feedback */}
            <div className="card" style={{ padding: '16px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>3. Article Feedback</h3>

              <form onSubmit={handleSubmitFeedback} style={{ marginBottom: ticketFeedback.length > 0 ? '14px' : 0 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 120px', gap: '10px' }}>
                  <div className="form-group">
                    <label className="form-label">Article ID *</label>
                    <input
                      className="form-input"
                      placeholder="e.g. ART1001"
                      value={fbForm.articleId}
                      onChange={(e) => setFbForm((p) => ({ ...p, articleId: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Rating (1–5)</label>
                    <select
                      className="form-select"
                      value={fbForm.rating}
                      onChange={(e) => setFbForm((p) => ({ ...p, rating: Number(e.target.value) }))}
                    >
                      {[5, 4, 3, 2, 1].map((n) => (
                        <option key={n} value={n}>{n} ★</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Helpful?</label>
                    <select
                      className="form-select"
                      value={String(fbForm.isHelpful)}
                      onChange={(e) => setFbForm((p) => ({ ...p, isHelpful: e.target.value === 'true' }))}
                    >
                      <option value="true">Yes</option>
                      <option value="false">No</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="form-group">
                    <label className="form-label">Comments</label>
                    <input
                      className="form-input"
                      placeholder="Was the article accurate?"
                      value={fbForm.comments}
                      onChange={(e) => setFbForm((p) => ({ ...p, comments: e.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Submitted By</label>
                    <select
                      className="form-select"
                      value={fbForm.submittedBy}
                      onChange={(e) => setFbForm((p) => ({ ...p, submittedBy: e.target.value }))}
                    >
                      <option value="Agent">Agent</option>
                      <option value="Customer">Customer</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="submit" className="btn btn-primary" disabled={fbSaving}>
                    {fbSaving ? 'Submitting...' : 'Submit Feedback'}
                  </button>
                </div>
              </form>

              {ticketFeedback.length > 0 && (
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {ticketFeedback.map((fb) => (
                    <div key={fb._id} style={{ fontSize: '12.5px', display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                      <span>
                        <strong style={{ color: 'var(--accent)' }}>{fb.articleId}</strong> — {fb.rating}/5 ★ ({fb.isHelpful ? 'Helpful' : 'Not helpful'}) {fb.comments ? `• "${fb.comments}"` : ''}
                      </span>
                      <span>by {fb.submittedBy || 'Anonymous'}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
