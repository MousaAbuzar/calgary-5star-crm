// Campaigns.js — Campaign management + bulk email sending

import { useState, useEffect } from 'react';
import { getCampaigns, deleteCampaign, sendCampaign, sendTestEmail, previewCampaign } from '../api';
import toast from 'react-hot-toast';
import CampaignForm from '../components/CampaignForm';
import CampaignLogs from '../components/CampaignLogs';
import TestEmailModal from '../components/TestEmailModal';

function Campaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formState, setFormState] = useState(null);   // null | 'new' | campaign object
  const [logsFor, setLogsFor] = useState(null);        // campaign to show logs for
  const [testFor, setTestFor] = useState(null);         // campaign to send a test for

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const res = await getCampaigns();
      setCampaigns(res.data);
    } catch (err) {
      toast.error('Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (campaign) => {
    if (!window.confirm(`Delete campaign "${campaign.name}"?`)) return;
    try {
      await deleteCampaign(campaign._id);
      toast.success('Campaign deleted');
      fetchCampaigns();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete campaign');
    }
  };

  const handleSend = async (campaign) => {
    try {
      const res = await previewCampaign(campaign._id);
      const { count } = res.data;
      if (!window.confirm(`This will send "${campaign.subject}" to ${count} eligible customers. Continue?`)) return;

      const sendRes = await sendCampaign(campaign._id);
      toast.success(sendRes.data.message);
      // Poll for completion — server sends in background so we check a couple of times
      setTimeout(fetchCampaigns, 3000);
      setTimeout(fetchCampaigns, 8000);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send campaign');
    }
  };

  const handleTestSend = async (campaign, toEmail) => {
    try {
      const res = await sendTestEmail(campaign._id, toEmail);
      toast.success(res.data.message);
      setTestFor(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Test email failed');
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>Campaigns</h1>
        <button className="btn btn-primary" onClick={() => setFormState('new')}>
          + New Campaign
        </button>
      </div>

      {loading ? (
        <div className="loading">Loading...</div>
      ) : campaigns.length === 0 ? (
        <div className="empty-state">
          No campaigns yet. Create one to start sending bulk emails to your customers.
        </div>
      ) : (
        <div className="campaign-list">
          {campaigns.map((campaign) => (
            <div key={campaign._id} className="campaign-card">
              <div className="campaign-card-header">
                <div>
                  <h3>{campaign.name}</h3>
                  <p className="campaign-subject">{campaign.subject}</p>
                </div>
                <span className={`badge badge-${campaign.status}`}>{campaign.status}</span>
              </div>

              {campaign.status === 'sent' && (
                <div className="campaign-stats">
                  <span>📧 {campaign.stats.totalRecipients} recipients</span>
                  <span>✅ {campaign.stats.sent} sent</span>
                  {campaign.stats.failed > 0 && <span>❌ {campaign.stats.failed} failed</span>}
                  {campaign.sentAt && <span>🕐 {new Date(campaign.sentAt).toLocaleDateString()}</span>}
                </div>
              )}

              {campaign.targetTags.length > 0 && (
                <div className="campaign-tags">
                  Target: {campaign.targetTags.map((t) => <span key={t} className="tag">{t}</span>)}
                </div>
              )}

              <div className="campaign-actions">
                {campaign.status === 'draft' && (
                  <>
                    <button className="btn btn-primary btn-sm" onClick={() => handleSend(campaign)}>
                      Send to All
                    </button>
                    {/* Test email sits right next to Send — the natural workflow is test then send */}
                    <button className="btn btn-secondary btn-sm" onClick={() => setTestFor(campaign)}>
                      Send Test
                    </button>
                  </>
                )}
                {campaign.status === 'sent' && (
                  <button className="btn btn-secondary btn-sm" onClick={() => setLogsFor(campaign)}>
                    View Logs
                  </button>
                )}
                {campaign.status !== 'sent' && campaign.status !== 'sending' && (
                  <button className="btn btn-secondary btn-sm" onClick={() => setFormState(campaign)}>
                    Edit
                  </button>
                )}
                {campaign.status !== 'sending' && (
                  <button className="btn btn-danger btn-sm" onClick={() => handleDelete(campaign)}>
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {formState !== null && (
        <CampaignForm
          campaign={formState === 'new' ? null : formState}
          onClose={(saved) => {
            setFormState(null);
            if (saved) fetchCampaigns();
          }}
        />
      )}

      {logsFor && (
        <CampaignLogs campaign={logsFor} onClose={() => setLogsFor(null)} />
      )}

      {testFor && (
        <TestEmailModal
          campaign={testFor}
          onSend={(email) => handleTestSend(testFor, email)}
          onClose={() => setTestFor(null)}
        />
      )}
    </div>
  );
}

export default Campaigns;
