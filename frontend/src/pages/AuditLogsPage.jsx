import { useState, useEffect } from 'react';
import { auditAPI } from '../services/api';
import StatusBadge from '../components/StatusBadge';

const ENTITY_TYPES = [
  'All',
  'Customer',
  'SupportRequest',
  'KnowledgeCategory',
  'KnowledgeArticle',
  'Resolution',
  'ArticleFeedback',
  'KnowledgeGap',
];

export default function AuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [entityFilter, setEntityFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [selectedLog, setSelectedLog] = useState(null);

  const fetchLogs = async (entity = entityFilter) => {
    setLoading(true);
    setError('');
    try {
      const res =
        entity === 'All'
          ? await auditAPI.getAll()
          : await auditAPI.getByEntity(entity);
      setLogs(res.data?.auditLogs || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load audit logs. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(entityFilter);
  }, [entityFilter]);

  const filteredLogs = logs.filter((log) => {
    const q = search.toLowerCase();
    return (
      log.auditId?.toLowerCase().includes(q) ||
      log.action?.toLowerCase().includes(q) ||
      log.entityType?.toLowerCase().includes(q) ||
      String(log.entityId ?? '').toLowerCase().includes(q) ||
      String(log.ticketId ?? '').includes(q) ||
      log.description?.toLowerCase().includes(q) ||
      log.performedBy?.toLowerCase().includes(q)
    );
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '16px' }}>
        <div className="card card-interactive">
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Total Audit Events</div>
          <div style={{ fontSize: '28px', fontWeight: 700, marginTop: '6px' }}>{logs.length}</div>
        </div>
        <div className="card card-interactive">
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Active Filter</div>
          <div style={{ fontSize: '22px', fontWeight: 700, marginTop: '8px', color: 'var(--accent)' }}>
            {entityFilter}
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="card" style={{ padding: '16px 20px', display: 'flex', gap: '12px', justifyContent: 'space-between', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '10px', flex: '1 1 320px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1 1 220px', maxWidth: '360px' }}>
            <span
              className="material-symbols-outlined"
              style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '18px', color: 'var(--text-muted)' }}
            >
              search
            </span>
            <input
              type="text"
              className="form-input"
              placeholder="Search audit ID, ticket, action, actor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '36px' }}
            />
          </div>

          <select
            className="form-select"
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            style={{ width: 'auto', minWidth: '180px' }}
          >
            {ENTITY_TYPES.map((type) => (
              <option key={type} value={type}>{type === 'All' ? 'All Entities' : type}</option>
            ))}
          </select>
        </div>

        <button className="btn" onClick={() => fetchLogs(entityFilter)}>
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>refresh</span>
          Refresh
        </button>
      </div>

      {/* Audit Logs Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            Loading audit history...
          </div>
        ) : error ? (
          <div style={{ padding: '32px', textAlign: 'center', color: '#ef4444' }}>
            <p style={{ marginBottom: '12px' }}>{error}</p>
            <button className="btn" onClick={() => fetchLogs(entityFilter)}>Retry</button>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            No audit events found for this filter.
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Audit ID</th>
                  <th>Action</th>
                  <th>Entity</th>
                  <th>Ticket</th>
                  <th>Description</th>
                  <th>Performed By</th>
                  <th>Timestamp</th>
                  <th style={{ textAlign: 'right' }}>Diff</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => (
                  <tr key={log._id}>
                    <td style={{ fontWeight: 600, color: 'var(--accent)' }}>{log.auditId}</td>
                    <td><StatusBadge label={log.action} /></td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{log.entityType}</div>
                      <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>ID: {log.entityId}</div>
                    </td>
                    <td>{log.ticketId ? `#${log.ticketId}` : '—'}</td>
                    <td style={{ maxWidth: '280px', color: 'var(--text-secondary)' }}>
                      <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {log.description}
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>{log.performedBy || 'System'}</td>
                    <td style={{ fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {log.createdAt ? new Date(log.createdAt).toLocaleString() : '—'}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="btn"
                        title="Inspect Previous / New Data"
                        onClick={() => setSelectedLog(log)}
                        style={{ padding: '5px 10px' }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>visibility</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Diff Inspection Modal */}
      {selectedLog && (
        <div className="modal-backdrop" onClick={() => setSelectedLog(null)}>
          <div className="modal-content" style={{ maxWidth: '660px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 600 }}>
                {selectedLog.auditId} — {selectedLog.action}
              </h2>
              <button className="btn" onClick={() => setSelectedLog(null)} style={{ padding: '4px 8px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
              </button>
            </div>

            <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              {selectedLog.description}
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
              <div className="card" style={{ padding: '12px' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>
                  Previous Data
                </div>
                <pre style={{ fontSize: '12px', whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: 'var(--text-secondary)' }}>
                  {selectedLog.previousData ? JSON.stringify(selectedLog.previousData, null, 2) : 'None (Created)'}
                </pre>
              </div>

              <div className="card" style={{ padding: '12px' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent)', marginBottom: '8px' }}>
                  New Data
                </div>
                <pre style={{ fontSize: '12px', whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: 'var(--text-primary)' }}>
                  {selectedLog.newData ? JSON.stringify(selectedLog.newData, null, 2) : 'None (Deleted)'}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
