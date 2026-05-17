// CampaignForm.js — Campaign editor with live email preview
//
// Key React concept demonstrated here: DERIVED STATE
// We don't store the preview HTML separately — we compute it on every render
// from `form.body` by replacing the personalisation tokens.
// React re-renders every time state changes, so the preview is always in sync.

import { useState } from 'react';
import { createCampaign, updateCampaign } from '../api';
import toast from 'react-hot-toast';

// Sample values used to make the live preview feel realistic
const PREVIEW_CUSTOMER = {
  firstName: 'Sarah',
  lastName: 'Johnson',
  email: 'sarah@example.com',
};

function CampaignForm({ campaign, onClose }) {
  const [form, setForm] = useState({
    name: campaign?.name || '',
    subject: campaign?.subject || '',
    body: campaign?.body || getDefaultEmailTemplate(),
    targetTags: campaign?.targetTags?.join(', ') || '',
  });
  const [saving, setSaving] = useState(false);
  // Toggle between the HTML editor and the rendered preview
  // 'edit' shows the textarea, 'preview' shows the rendered email
  const [activeTab, setActiveTab] = useState('edit');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        subject: form.subject,
        body: form.body,
        targetTags: form.targetTags
          .split(',')
          .map((t) => t.trim())
          .filter((t) => t.length > 0),
      };

      if (campaign) {
        await updateCampaign(campaign._id, payload);
        toast.success('Campaign updated');
      } else {
        await createCampaign(payload);
        toast.success('Campaign created');
      }
      onClose(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save campaign');
    } finally {
      setSaving(false);
    }
  };

  // Derived value: replace tokens with sample data for the preview
  // This runs on every render — no extra state needed, React handles it
  const previewHtml = form.body
    .replace(/{{firstName}}/g, PREVIEW_CUSTOMER.firstName)
    .replace(/{{lastName}}/g, PREVIEW_CUSTOMER.lastName)
    .replace(/{{email}}/g, PREVIEW_CUSTOMER.email);

  return (
    <div className="modal-overlay" onClick={() => onClose(false)}>
      {/* modal-fullscreen gives us more room for the editor + preview side by side */}
      <div className="modal modal-fullscreen" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{campaign ? 'Edit Campaign' : 'New Campaign'}</h2>
          <button className="close-btn" onClick={() => onClose(false)}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Top fields — always visible */}
          <div className="campaign-form-top">
            <div className="form-row">
              <div className="form-group">
                <label>Campaign Name (internal label) *</label>
                <input
                  name="name"
                  className="input"
                  value={form.name}
                  onChange={handleChange}
                  required
                  placeholder="e.g. Spring Cleaning Offer 2026"
                />
              </div>
              <div className="form-group">
                <label>Target Tags</label>
                <input
                  name="targetTags"
                  className="input"
                  value={form.targetTags}
                  onChange={handleChange}
                  placeholder="residential, recurring  (empty = all customers)"
                />
              </div>
            </div>

            <div className="form-group">
              <label>Email Subject Line *</label>
              <input
                name="subject"
                className="input"
                value={form.subject}
                onChange={handleChange}
                required
                placeholder="e.g. ☀️ Spring Window Cleaning — Book Now & Save 15%"
              />
            </div>
          </div>

          {/* Split editor / preview panel */}
          <div className="editor-panel">
            {/* Tab bar */}
            <div className="editor-tabs">
              <button
                type="button"
                className={`editor-tab ${activeTab === 'edit' ? 'active' : ''}`}
                onClick={() => setActiveTab('edit')}
              >
                Edit HTML
              </button>
              <button
                type="button"
                className={`editor-tab ${activeTab === 'preview' ? 'active' : ''}`}
                onClick={() => setActiveTab('preview')}
              >
                Preview
              </button>
              {activeTab === 'edit' && (
                <span className="editor-hint">
                  Personalise with: <code>{'{{firstName}}'}</code> <code>{'{{lastName}}'}</code> <code>{'{{email}}'}</code>
                </span>
              )}
              {activeTab === 'preview' && (
                <span className="editor-hint">
                  Showing preview for <strong>{PREVIEW_CUSTOMER.firstName} {PREVIEW_CUSTOMER.lastName}</strong>
                </span>
              )}
            </div>

            {/* Editor pane */}
            {activeTab === 'edit' && (
              <textarea
                name="body"
                className="input email-editor"
                value={form.body}
                onChange={handleChange}
                required
                spellCheck={false}
              />
            )}

            {/* Preview pane */}
            {activeTab === 'preview' && (
              <div className="email-preview-wrap">
                {/* Email client chrome — makes it look like an inbox */}
                <div className="email-preview-chrome">
                  <div className="email-preview-meta">
                    <span className="email-preview-label">To:</span>
                    <span>{PREVIEW_CUSTOMER.firstName} {PREVIEW_CUSTOMER.lastName} &lt;{PREVIEW_CUSTOMER.email}&gt;</span>
                  </div>
                  <div className="email-preview-meta">
                    <span className="email-preview-label">Subject:</span>
                    <strong>{form.subject || '(no subject)'}</strong>
                  </div>
                </div>
                {/*
                  dangerouslySetInnerHTML lets us render raw HTML into the DOM.
                  The name "dangerously" is React warning us: only use this when
                  YOU control the HTML (which we do — it's the user's own template).
                  Never use it with HTML from unknown/untrusted sources.
                */}
                <div
                  className="email-preview-body"
                  dangerouslySetInnerHTML={{ __html: previewHtml }}
                />
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={() => onClose(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : campaign ? 'Update Campaign' : 'Create Campaign'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function getDefaultEmailTemplate() {
  return `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #2563eb;">Hello {{firstName}},</h2>

  <p>Thank you for being a valued customer. We wanted to reach out with some exciting news...</p>

  <p>Write your email content here.</p>

  <p>Best regards,<br>
  <strong>Your Window Cleaning Business</strong></p>

  <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
  <p style="font-size: 12px; color: #666;">
    You're receiving this because you're a customer of ours.
    To unsubscribe, reply to this email with "UNSUBSCRIBE".
  </p>
</div>`;
}

export default CampaignForm;
