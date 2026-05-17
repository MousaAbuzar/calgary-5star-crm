import { useState, useEffect } from 'react';
import { getCustomers, getScheduledEmails, createScheduledEmail, updateScheduledEmail, deleteScheduledEmail } from '../api';
import toast from 'react-hot-toast';

function Emails() {
  const [emails, setEmails] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingEmail, setEditingEmail] = useState(null); // null | email object

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      const [emailsRes, customersRes] = await Promise.all([
        getScheduledEmails(),
        getCustomers(),
      ]);
      setEmails(emailsRes.data);
      setCustomers(customersRes.data);
    } catch (err) {
      toast.error('Failed to load');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this scheduled email?')) return;
    try {
      await deleteScheduledEmail(id);
      toast.success('Email cancelled');
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel');
    }
  };

  const pending = emails.filter((e) => e.status === 'pending');
  const sent = emails.filter((e) => e.status !== 'pending');

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Emails</h1>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
          + Schedule Email
        </button>
      </div>

      <div className="recent-section">
        <h2>Scheduled ({pending.length})</h2>
        {pending.length === 0 ? (
          <div className="empty-state">
            No emails scheduled. Click "Schedule Email" to create one.
          </div>
        ) : (
          <div className="email-list">
            {pending.map((email) => (
              <div key={email._id} className="email-card">
                <div className="email-card-header">
                  <div>
                    <div className="email-card-subject">{email.subject}</div>
                    <div className="email-card-meta">
                      To:{' '}
                      {email.recipients
                        .map((r) => `${r.firstName} ${r.lastName}`)
                        .join(', ')}
                    </div>
                    <div className="email-card-meta">
                      Sends: {new Date(email.sendAt).toLocaleString()}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span className="badge badge-scheduled">Pending</span>
                    <button
                      className="btn btn-sm btn-secondary"
                      onClick={() => setEditingEmail(email)}
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => handleCancel(email._id)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {sent.length > 0 && (
        <div className="recent-section">
          <h2>Sent</h2>
          <div className="email-list">
            {sent.map((email) => (
              <div key={email._id} className="email-card">
                <div className="email-card-header">
                  <div>
                    <div className="email-card-subject">{email.subject}</div>
                    <div className="email-card-meta">
                      To:{' '}
                      {email.recipients
                        .map((r) => `${r.firstName} ${r.lastName}`)
                        .join(', ')}
                    </div>
                    <div className="email-card-meta">
                      Sent: {new Date(email.sentAt).toLocaleString()} &middot;{' '}
                      {email.sentCount} delivered
                      {email.failedCount > 0 && `, ${email.failedCount} failed`}
                    </div>
                  </div>
                  <span
                    className={`badge badge-${
                      email.status === 'sent' ? 'active' : 'inactive'
                    }`}
                  >
                    {email.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showForm && (
        <ScheduleEmailForm
          customers={customers}
          onClose={(saved) => {
            setShowForm(false);
            if (saved) fetchAll();
          }}
        />
      )}

      {editingEmail && (
        <ScheduleEmailForm
          customers={customers}
          email={editingEmail}
          onClose={(saved) => {
            setEditingEmail(null);
            if (saved) fetchAll();
          }}
        />
      )}
    </div>
  );
}

// ---------- inline form component ----------

// Convert a UTC date string to a value usable by datetime-local input (local time)
function toDatetimeLocal(dateStr) {
  const d = new Date(dateStr);
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${mo}-${day}T${h}:${min}`;
}

function ScheduleEmailForm({ customers, email, onClose }) {
  const isEditing = Boolean(email);
  const [subject, setSubject] = useState(email?.subject || '');
  const [body, setBody] = useState(email?.body || '');
  const [sendAt, setSendAt] = useState(email ? toDatetimeLocal(email.sendAt) : '');
  const [recipientSearch, setRecipientSearch] = useState('');
  const [selected, setSelected] = useState(email?.recipients || []);
  const [showDropdown, setShowDropdown] = useState(false);
  const [saving, setSaving] = useState(false);

  const filtered = customers
    .filter((c) => {
      if (selected.find((r) => r._id === c._id)) return false;
      const full = `${c.firstName} ${c.lastName}`.toLowerCase();
      return full.includes(recipientSearch.toLowerCase());
    })
    .sort((a, b) => a.firstName.localeCompare(b.firstName));

  const add = (c) => {
    setSelected((prev) => [...prev, c]);
    setRecipientSearch('');
    setShowDropdown(false);
  };

  const remove = (id) => setSelected((prev) => prev.filter((r) => r._id !== id));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selected.length === 0) {
      toast.error('Add at least one recipient');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        subject,
        body,
        sendAt: new Date(sendAt).toISOString(),
        recipients: selected.map((r) => r._id),
      };
      if (isEditing) {
        await updateScheduledEmail(email._id, payload);
        toast.success('Email updated');
      } else {
        await createScheduledEmail(payload);
        toast.success('Email scheduled');
      }
      onClose(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={() => onClose(false)}>
      <div className="modal modal-large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isEditing ? 'Edit Scheduled Email' : 'Schedule Email'}</h2>
          <button className="close-btn" onClick={() => onClose(false)}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="form">
          {/* Multi-select recipient picker */}
          <div className="form-group" style={{ position: 'relative' }}>
            <label>Recipients *</label>
            {selected.length > 0 && (
              <div className="recipient-tags">
                {selected.map((r) => (
                  <span key={r._id} className="recipient-tag">
                    {r.firstName} {r.lastName}
                    <button
                      type="button"
                      className="recipient-tag-remove"
                      onClick={() => remove(r._id)}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
            <input
              type="text"
              className="input"
              placeholder="Type a name to search and add customers..."
              value={recipientSearch}
              onChange={(e) => {
                setRecipientSearch(e.target.value);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              autoComplete="off"
            />
            {showDropdown && recipientSearch.length > 0 && (
              <div className="customer-dropdown">
                {filtered.length === 0 ? (
                  <div className="customer-dropdown-empty">No customers found</div>
                ) : (
                  filtered.slice(0, 8).map((c) => (
                    <div
                      key={c._id}
                      className="customer-dropdown-item"
                      onMouseDown={() => add(c)}
                    >
                      <span className="customer-dropdown-name">
                        {c.firstName} {c.lastName}
                      </span>
                      <span className="customer-dropdown-address">{c.email}</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="form-group">
            <label>Subject *</label>
            <input
              type="text"
              className="input"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Your window cleaning is booked for Friday"
              required
            />
          </div>

          <div className="form-group">
            <label>Send At *</label>
            <input
              type="datetime-local"
              className="input"
              value={sendAt}
              onChange={(e) => setSendAt(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Message *</label>
            <textarea
              className="input email-editor"
              rows={8}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={`Write your email here.\n\nYou can use {{firstName}}, {{lastName}}, and {{email}} as placeholders — they'll be replaced with each customer's real details.`}
              required
            />
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={() => onClose(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Schedule Email'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Emails;
