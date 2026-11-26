import { useState, useEffect } from 'react';
import { analyticsAPI } from '../services/api';

// Reusable breakdown card showing key-value counts as proportional bars
function BreakdownCard({ title, data = {}, total = 0 }) {
  const entries = Object.entries(data);

  return (
    <div className="card">
      <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '14px' }}>{title}</h3>
      {entries.length === 0 ? (
        <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No data recorded yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {entries.map(([label, count]) => {
            const pct = total > 0 ? Math.round((count / total) * 100) : 0;
            return (
              <div key={label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                  <span>{label}</span>
                  <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>
                    {count} ({pct}%)
                  </span>
                </div>
                <div style={{ height: '6px', borderRadius: '999px', backgroundColor: 'var(--border-color)', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${pct}%`,
                      height: '100%',
                      backgroundColor: 'var(--accent)',
                      transition: 'width 0.3s ease',
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function AnalyticsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAnalytics = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await analyticsAPI.getDashboard();
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load analytics. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        Loading platform analytics...
      </div>
    );
  }

  if (error) {
    return (
      <div className="card" style={{ padding: '32px', textAlign: 'center', color: '#ef4444' }}>
        <p style={{ marginBottom: '12px' }}>{error}</p>
        <button className="btn" onClick={fetchAnalytics}>Retry</button>
      </div>
    );
  }

  const tickets = data?.supportTicketAnalytics || {};
  const articles = data?.knowledgeArticleAnalytics || {};
  const gaps = data?.knowledgeGapAnalytics || {};
  const feedback = data?.articleFeedbackAnalytics || {};
  const resolutions = data?.resolutionAnalytics || {};
  const perf = data?.resolutionPerformance || {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 600 }}>Platform Overview</h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Live metrics across tickets, AI resolutions, articles, feedback, and knowledge gaps.
          </p>
        </div>
        <button className="btn" onClick={fetchAnalytics}>
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>refresh</span>
          Refresh
        </button>
      </div>

      {/* Top KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '16px' }}>
        <div className="card card-interactive">
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Total Tickets</div>
          <div style={{ fontSize: '28px', fontWeight: 700, marginTop: '6px' }}>{perf.totalTickets ?? 0}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            {perf.resolvedTickets ?? 0} resolved • {perf.unresolvedTickets ?? 0} open
          </div>
        </div>

        <div className="card card-interactive">
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Resolution Rate</div>
          <div style={{ fontSize: '28px', fontWeight: 700, marginTop: '6px', color: '#22c55e' }}>
            {perf.resolutionRate ?? 0}%
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Avg time: {perf.averageResolutionTimeHours ?? 0} hrs
          </div>
        </div>

        <div className="card card-interactive">
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Knowledge Articles</div>
          <div style={{ fontSize: '28px', fontWeight: 700, marginTop: '6px', color: '#38bdf8' }}>
            {articles.totalArticles ?? 0}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Published: {articles.articlesByStatus?.Published ?? 0}
          </div>
        </div>

        <div className="card card-interactive">
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Avg Article Rating</div>
          <div style={{ fontSize: '28px', fontWeight: 700, marginTop: '6px', color: 'var(--accent)' }}>
            {feedback.averageRating ?? 0} / 5
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            {feedback.helpfulCount ?? 0} helpful • {feedback.notHelpfulCount ?? 0} not helpful
          </div>
        </div>

        <div className="card card-interactive">
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Knowledge Gaps</div>
          <div style={{ fontSize: '28px', fontWeight: 700, marginTop: '6px', color: '#ef4444' }}>
            {gaps.totalKnowledgeGaps ?? 0}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Agent Escalations: {resolutions.resolutionsRequiringAgent ?? 0}
          </div>
        </div>
      </div>

      {/* Breakdown Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
        <BreakdownCard title="Tickets by Category" data={tickets.ticketsByCategory} total={tickets.totalTickets} />
        <BreakdownCard title="Tickets by Status" data={tickets.ticketsByStatus} total={tickets.totalTickets} />
        <BreakdownCard title="Articles by Status" data={articles.articlesByStatus} total={articles.totalArticles} />
        <BreakdownCard title="Resolutions by Status" data={resolutions.resolutionsByStatus} total={resolutions.totalResolutions} />
        <BreakdownCard title="Knowledge Gaps by Status" data={gaps.gapsByStatus} total={gaps.totalKnowledgeGaps} />
        <BreakdownCard title="Articles by Category" data={articles.articlesByCategory} total={articles.totalArticles} />
      </div>

      {/* Article Feedback Performance Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 600 }}>Article Feedback Performance</h3>
        </div>
        {(feedback.feedbackByArticle || []).length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            No article feedback submitted yet.
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Article ID</th>
                  <th>Total Reviews</th>
                  <th>Average Rating</th>
                  <th>Helpful</th>
                  <th>Not Helpful</th>
                </tr>
              </thead>
              <tbody>
                {feedback.feedbackByArticle.map((item) => (
                  <tr key={item._id}>
                    <td style={{ fontWeight: 600, color: 'var(--accent)' }}>{item._id}</td>
                    <td>{item.totalFeedback}</td>
                    <td style={{ fontWeight: 600 }}>{Number(item.averageRating || 0).toFixed(2)} / 5</td>
                    <td style={{ color: '#22c55e', fontWeight: 600 }}>{item.helpfulCount}</td>
                    <td style={{ color: '#ef4444', fontWeight: 600 }}>{item.notHelpfulCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
