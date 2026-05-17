// JobForm.js — Add or edit a job for a customer
// When `customers` prop is provided (array), shows a customer search/select.
// Otherwise uses the `customerId` prop directly (existing behaviour from CustomerDetail).

import { useState } from 'react';
import { createJob, updateJob } from '../api';
import toast from 'react-hot-toast';

const todayISO = () => new Date().toISOString().split('T')[0];
const penceToPounds = (pence) => (pence / 100).toFixed(2);
const poundsToPence = (str) => Math.round(parseFloat(str) * 100);

function JobForm({ job, customerId, customers, defaultDate, onClose }) {
  const [search, setSearch] = useState(() => {
    if (job && customers) {
      const c = customers.find((x) => x._id === (job.customer?._id || job.customer));
      return c ? `${c.firstName} ${c.lastName}` : '';
    }
    return '';
  });
  const [selectedCustomerId, setSelectedCustomerId] = useState(
    job?.customer?._id || job?.customer || customerId || ''
  );
  const [showDropdown, setShowDropdown] = useState(false);

  const [form, setForm] = useState({
    date: job ? new Date(job.date).toISOString().split('T')[0] : (defaultDate || todayISO()),
    time: job?.time || '',
    serviceType: job?.serviceType || 'exterior_windows',
    price: job ? penceToPounds(job.priceInPence) : '',
    status: job?.status || 'scheduled',
    paymentStatus: job?.paymentStatus || 'unpaid',
    notes: job?.notes || '',
  });
  const [saving, setSaving] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const filteredCustomers = customers
    ? customers
        .filter((c) => {
          const full = `${c.firstName} ${c.lastName}`.toLowerCase();
          return full.includes(search.toLowerCase());
        })
        .sort((a, b) => a.firstName.localeCompare(b.firstName))
    : [];

  const handleCustomerSelect = (c) => {
    setSelectedCustomerId(c._id);
    setSearch(`${c.firstName} ${c.lastName}`);
    setShowDropdown(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const resolvedCustomerId = customers ? selectedCustomerId : customerId;
    if (customers && !resolvedCustomerId) {
      toast.error('Please select a customer');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        customer: resolvedCustomerId,
        date: form.date,
        time: form.time || undefined,
        serviceType: form.serviceType,
        priceInPence: poundsToPence(form.price),
        status: form.status,
        paymentStatus: form.paymentStatus,
        notes: form.notes,
      };
      if (job) {
        await updateJob(job._id, payload);
        toast.success('Job updated');
      } else {
        await createJob(payload);
        toast.success('Job added');
      }
      onClose(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save job');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={() => onClose(false)}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{job ? 'Edit Job' : 'Add Job'}</h2>
          <button className="close-btn" onClick={() => onClose(false)}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="form">

          {/* Customer picker — only shown when opened from the calendar */}
          {customers && (
            <div className="form-group" style={{ position: 'relative' }}>
              <label>Customer *</label>
              <input
                type="text"
                className="input"
                placeholder="Search by name..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setSelectedCustomerId('');
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
                autoComplete="off"
                required={false}
              />
              {showDropdown && search.length > 0 && filteredCustomers.length > 0 && (
                <div className="customer-dropdown">
                  {filteredCustomers.slice(0, 8).map((c) => (
                    <div
                      key={c._id}
                      className="customer-dropdown-item"
                      onMouseDown={() => handleCustomerSelect(c)}
                    >
                      <span className="customer-dropdown-name">
                        {c.firstName} {c.lastName}
                      </span>
                      {c.address?.street && (
                        <span className="customer-dropdown-address">
                          {c.address.street}, {c.address.city}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {showDropdown && search.length > 0 && filteredCustomers.length === 0 && (
                <div className="customer-dropdown">
                  <div className="customer-dropdown-empty">No customers found</div>
                </div>
              )}
            </div>
          )}

          <div className="form-row">
            <div className="form-group">
              <label>Date *</label>
              <input
                type="date"
                name="date"
                className="input"
                value={form.date}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label>Time</label>
              <input
                type="time"
                name="time"
                className="input"
                value={form.time}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Service Type *</label>
              <select name="serviceType" className="input" value={form.serviceType} onChange={handleChange}>
                <option value="exterior_windows">Exterior Windows</option>
                <option value="interior_windows">Interior Windows</option>
                <option value="interior_exterior">Interior & Exterior</option>
                <option value="conservatory">Conservatory</option>
                <option value="gutters">Gutters</option>
                <option value="fascias_soffits">Fascias & Soffits</option>
                <option value="pressure_wash">Pressure Wash</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="form-group">
              <label>Price ($) *</label>
              <input
                type="number"
                name="price"
                className="input"
                value={form.price}
                onChange={handleChange}
                step="0.01"
                min="0"
                placeholder="45.00"
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Job Status</label>
              <select name="status" className="input" value={form.status} onChange={handleChange}>
                <option value="scheduled">Scheduled</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="no_access">No Access</option>
              </select>
            </div>
            <div className="form-group">
              <label>Payment Status</label>
              <select name="paymentStatus" className="input" value={form.paymentStatus} onChange={handleChange}>
                <option value="unpaid">Unpaid</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Notes</label>
            <textarea
              name="notes"
              className="input"
              rows={2}
              value={form.notes}
              onChange={handleChange}
              placeholder="e.g. 3 bed semi, front and back only"
            />
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={() => onClose(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : job ? 'Update Job' : 'Add Job'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default JobForm;
