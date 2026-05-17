// TestEmailModal.js — Simple modal to enter a test email address
//
// This is a good example of a "controlled form" in React:
// The input's value is always driven by state, never the DOM itself.
// React is the single source of truth for what the input contains.

import { useState } from 'react';

function TestEmailModal({ campaign, onSend, onClose }) {
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSending(true);
    // onSend is passed in from Campaigns.js — we just call it with the email
    // The parent owns the API logic; this component only owns the UI
    await onSend(email);
    setSending(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>Send Test Email</h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
              {campaign.name}
            </p>
          </div>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 16 }}>
          A copy of this campaign will be sent to the address below with{' '}
          <strong>[TEST]</strong> in the subject line. Your customer list will not be affected.
        </p>

        <form onSubmit={handleSubmit} className="form">
          <div className="form-group">
            <label>Send test to</label>
            <input
              type="email"
              className="input"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={sending || !email}>
              {sending ? 'Sending...' : 'Send Test'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default TestEmailModal;
