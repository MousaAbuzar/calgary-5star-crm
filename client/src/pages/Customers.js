// Customers.js — Full customer management page
// List, search, add, edit, delete customers

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCustomers, deleteCustomer } from '../api';
import toast from 'react-hot-toast';
import CustomerForm from '../components/CustomerForm';
import CustomerImport from '../components/CustomerImport';

function Customers() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  // null = form closed, 'new' = creating, customer object = editing
  const [formState, setFormState] = useState(null);
  const [showImport, setShowImport] = useState(false);

  // Fetch customers whenever search or status filter changes
  // The [search, statusFilter] dependency array means: re-run when these change
  useEffect(() => {
    fetchCustomers();
  }, [search, statusFilter]);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const params = {};
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      const res = await getCustomers(params);
      setCustomers(res.data);
    } catch (err) {
      toast.error('Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (customer) => {
    if (!window.confirm(`Delete ${customer.firstName} ${customer.lastName}? This cannot be undone.`)) return;
    try {
      await deleteCustomer(customer._id);
      toast.success('Customer deleted');
      fetchCustomers(); // Refresh the list
    } catch (err) {
      toast.error('Failed to delete customer');
    }
  };

  const handleFormClose = (saved) => {
    setFormState(null);
    if (saved) fetchCustomers(); // Refresh only if something was saved
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>Customers</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={() => setShowImport(true)}>
            Import CSV
          </button>
          <button className="btn btn-primary" onClick={() => setFormState('new')}>
            + Add Customer
          </button>
        </div>
      </div>

      {/* Search and filter bar */}
      <div className="toolbar">
        <input
          type="text"
          className="input"
          placeholder="Search by name or email..."
          value={search}
          // onChange fires every time the input changes — React's "controlled input" pattern
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="input"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="prospect">Prospect</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {loading ? (
        <div className="loading">Loading...</div>
      ) : customers.length === 0 ? (
        <div className="empty-state">
          {search || statusFilter ? 'No customers match your search.' : 'No customers yet. Add your first one!'}
        </div>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Status</th>
              <th>Tags</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((customer) => (
              <tr key={customer._id}>
                <td>
                  <button
                    className="link-btn"
                    onClick={() => navigate(`/customers/${customer._id}`)}
                  >
                    {customer.firstName} {customer.lastName}
                  </button>
                </td>
                <td>{customer.email}</td>
                <td>{customer.phone || '—'}</td>
                <td>
                  <span className={`badge badge-${customer.status}`}>{customer.status}</span>
                </td>
                <td>
                  {customer.tags.map((tag) => (
                    <span key={tag} className="tag">{tag}</span>
                  ))}
                </td>
                <td>
                  <button
                    className="btn btn-sm btn-secondary"
                    onClick={() => setFormState(customer)}
                  >
                    Edit
                  </button>
                  <button
                    className="btn btn-sm btn-danger"
                    onClick={() => handleDelete(customer)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="count-info">
        {!loading && `${customers.length} customer${customers.length !== 1 ? 's' : ''} shown`}
      </div>

      {/* Conditionally render the form modal when formState is not null */}
      {formState !== null && (
        <CustomerForm
          customer={formState === 'new' ? null : formState}
          onClose={handleFormClose}
        />
      )}

      {showImport && (
        <CustomerImport
          onClose={(saved) => {
            setShowImport(false);
            if (saved) fetchCustomers();
          }}
        />
      )}
    </div>
  );
}

export default Customers;
