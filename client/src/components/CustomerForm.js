// CustomerForm.js — Modal form for adding/editing a customer
// "Modal" = a dialog box that sits on top of the page

import { useState } from 'react';
import { createCustomer, updateCustomer } from '../api';
import toast from 'react-hot-toast';

// Props: customer (null if creating new, object if editing), onClose (callback)
// Props = data passed into a component from its parent — like function arguments
function CustomerForm({ customer, onClose }) {
  // Initialise form state — if editing, pre-fill with existing data
  const [form, setForm] = useState({
    firstName: customer?.firstName || '',
    lastName: customer?.lastName || '',
    email: customer?.email || '',
    phone: customer?.phone || '',
    street: customer?.address?.street || '',
    city: customer?.address?.city || '',
    postcode: customer?.address?.postcode || '',
    status: customer?.status || 'prospect',
    source: customer?.source || 'other',
    tags: customer?.tags?.join(', ') || '', // Convert array to comma-separated string
    notes: customer?.notes || '',
    emailOptOut: customer?.emailOptOut || false,
  });
  const [saving, setSaving] = useState(false);

  // Generic change handler — updates the specific field that changed
  // e.target.name must match the field name in our form state
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev, // Spread keeps all existing fields, then override the changed one
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); // Prevent the default browser form submission (page reload)
    setSaving(true);

    try {
      // Transform form data back into the shape the API expects
      const payload = {
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phone: form.phone,
        address: {
          street: form.street,
          city: form.city,
          postcode: form.postcode,
        },
        status: form.status,
        source: form.source,
        // Convert "residential, commercial" string back to ['residential', 'commercial'] array
        tags: form.tags
          .split(',')
          .map((t) => t.trim())
          .filter((t) => t.length > 0),
        notes: form.notes,
        emailOptOut: form.emailOptOut,
      };

      if (customer) {
        // Editing existing customer
        await updateCustomer(customer._id, payload);
        toast.success('Customer updated');
      } else {
        // Creating new customer
        await createCustomer(payload);
        toast.success('Customer added');
      }

      onClose(true); // true = something was saved, refresh list
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save customer');
    } finally {
      setSaving(false);
    }
  };

  return (
    // The overlay dims the background; clicking it closes the form
    <div className="modal-overlay" onClick={() => onClose(false)}>
      {/* stopPropagation prevents clicks inside the form from closing it */}
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{customer ? 'Edit Customer' : 'Add Customer'}</h2>
          <button className="close-btn" onClick={() => onClose(false)}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="form">
          <div className="form-row">
            <div className="form-group">
              <label>First Name *</label>
              <input name="firstName" className="input" value={form.firstName} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Last Name *</label>
              <input name="lastName" className="input" value={form.lastName} onChange={handleChange} required />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Email *</label>
              <input name="email" type="email" className="input" value={form.email} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Phone</label>
              <input name="phone" className="input" value={form.phone} onChange={handleChange} />
            </div>
          </div>

          <div className="form-group">
            <label>Street Address</label>
            <input name="street" className="input" value={form.street} onChange={handleChange} />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>City</label>
              <input name="city" className="input" value={form.city} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Postcode</label>
              <input name="postcode" className="input" value={form.postcode} onChange={handleChange} />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Status</label>
              <select name="status" className="input" value={form.status} onChange={handleChange}>
                <option value="prospect">Prospect</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div className="form-group">
              <label>Source</label>
              <select name="source" className="input" value={form.source} onChange={handleChange}>
                <option value="website">Website</option>
                <option value="referral">Referral</option>
                <option value="social_media">Social Media</option>
                <option value="cold_outreach">Cold Outreach</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Tags (comma separated — e.g. residential, recurring)</label>
            <input name="tags" className="input" value={form.tags} onChange={handleChange} placeholder="residential, recurring" />
          </div>

          <div className="form-group">
            <label>Notes</label>
            <textarea name="notes" className="input" rows={3} value={form.notes} onChange={handleChange} />
          </div>

          <div className="form-group checkbox-group">
            <label>
              <input type="checkbox" name="emailOptOut" checked={form.emailOptOut} onChange={handleChange} />
              &nbsp;Opted out of emails (do not send campaigns to this contact)
            </label>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={() => onClose(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : customer ? 'Update Customer' : 'Add Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CustomerForm;
