// CampaignLogs.js — Shows email send results for a campaign

import { useState, useEffect } from 'react';
import { getCampaignLogs } from '../api';
import toast from 'react-hot-toast';

function CampaignLogs({ campaign, onClose }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await getCampaignLogs(campaign._id);
        setLogs(res.data);
      } catch (err) {
        toast.error('Failed to load logs');
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, [campaign._id]);

  const sentCount = logs.filter((l) => l.status === 'sent').length;
  const failedCount = logs.filter((l) => l.status === 'failed').length;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Send Logs: {campaign.name}</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        {loading ? (
          <div className="loading">Loading logs...</div>
        ) : (
          <>
            <div className="log-summary">
              <span className="badge badge-sent">✅ {sentCount} sent</span>
              {failedCount > 0 && <span className="badge badge-failed">❌ {failedCount} failed</span>}
            </div>

            <div className="log-table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Email</th>
                    <th>Status</th>
                    <th>Sent At</th>
                    <th>Error</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log._id}>
                      <td>
                        {log.customer
                          ? `${log.customer.firstName} ${log.customer.lastName}`
                          : 'Unknown'}
                      </td>
                      <td>{log.recipientEmail}</td>
                      <td>
                        <span className={`badge badge-${log.status}`}>{log.status}</span>
                      </td>
                      <td>{new Date(log.sentAt).toLocaleString()}</td>
                      <td style={{ color: 'red', fontSize: '12px' }}>{log.errorMessage || ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default CampaignLogs;
