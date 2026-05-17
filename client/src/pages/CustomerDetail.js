// CustomerDetail.js — Full profile page for a single customer
// Shows their info, all their jobs, and lets you add/edit/delete jobs
//
// React concept: useParams()
// When we navigate to /customers/abc123, useParams() extracts { id: 'abc123' }
// from the URL so we know which customer to load

import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getCustomer, updateCustomer, getJobs, deleteJob, sendInvoice } from '../api';
import toast from 'react-hot-toast';
import CustomerForm from '../components/CustomerForm';
import JobForm from '../components/JobForm';

// Maps DB enum values to readable labels
const SERVICE_LABELS = {
  exterior_windows: 'Exterior Windows',
  interior_windows: 'Interior Windows',
  interior_exterior: 'Interior & Exterior',
  conservatory: 'Conservatory',
  gutters: 'Gutters',
  fascias_soffits: 'Fascias & Soffits',
  pressure_wash: 'Pressure Wash',
  other: 'Other',
};

const STATUS_LABELS = {
  scheduled: 'Scheduled',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_access: 'No Access',
};

function CustomerDetail() {
  const { id } = useParams();    // Get :id from the URL
  const navigate = useNavigate(); // Lets us programmatically change the URL

  const [customer, setCustomer] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEditCustomer, setShowEditCustomer] = useState(false);
  const [jobFormState, setJobFormState] = useState(null); // null | 'new' | job object

  useEffect(() => {
    fetchAll();
  }, [id]);

  const fetchAll = async () => {
    try {
      setLoading(true);
      // Fetch the customer and their jobs at the same time
      const [custRes, jobsRes] = await Promise.all([
        getCustomer(id),
        getJobs({ customerId: id }),
      ]);
      setCustomer(custRes.data);
      setJobs(jobsRes.data);
    } catch (err) {
      toast.error('Failed to load customer');
      navigate('/customers'); // If customer not found, go back to the list
    } finally {
      setLoading(false);
    }
  };

  const handleSendInvoice = async (job) => {
    try {
      await sendInvoice(job._id);
      toast.success(`Invoice sent to ${customer.email}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send invoice');
    }
  };

  const handleDeleteJob = async (job) => {
    const label = `${SERVICE_LABELS[job.serviceType]} on ${new Date(job.date).toLocaleDateString()}`;
    if (!window.confirm(`Delete job: ${label}?`)) return;
    try {
      await deleteJob(job._id);
      toast.success('Job deleted');
      fetchAll();
    } catch (err) {
      toast.error('Failed to delete job');
    }
  };

  const formatPrice = (pence) => `$${(pence / 100).toFixed(2)}`;

  if (loading) return <div className="loading">Loading customer...</div>;
  if (!customer) return null;

  return (
    <div className="page">
      {/* Breadcrumb — tells the user where they are */}
      <div className="breadcrumb">
        <Link to="/customers">Customers</Link>
        <span> / </span>
        <span>{customer.firstName} {customer.lastName}</span>
      </div>

      {/* Customer header */}
      <div className="customer-detail-header">
        <div>
          <h1>{customer.firstName} {customer.lastName}</h1>
          <div className="customer-meta">
            <span className={`badge badge-${customer.status}`}>{customer.status}</span>
            {customer.email && <span>{customer.email}</span>}
            {customer.phone && <span>{customer.phone}</span>}
            {customer.address?.street && (
              <span>{customer.address.street}, {customer.address.city} {customer.address.postcode}</span>
            )}
          </div>
          {customer.tags.length > 0 && (
            <div style={{ marginTop: 8 }}>
              {customer.tags.map((t) => <span key={t} className="tag">{t}</span>)}
            </div>
          )}
          {customer.notes && (
            <p className="customer-notes">{customer.notes}</p>
          )}
        </div>
        <button className="btn btn-secondary" onClick={() => setShowEditCustomer(true)}>
          Edit Customer
        </button>
      </div>

      {/* Revenue summary */}
      <div className="customer-stats-bar">
        <div className="customer-stat">
          <div className="stat-number" style={{ fontSize: 22 }}>{jobs.length}</div>
          <div className="stat-label">Total Jobs</div>
        </div>
        <div className="customer-stat">
          <div className="stat-number" style={{ fontSize: 22 }}>
            {jobs.filter((j) => j.status === 'completed').length}
          </div>
          <div className="stat-label">Completed</div>
        </div>
      </div>

      {/* Jobs section */}
      <div className="section-header">
        <h2>Job History</h2>
        <button className="btn btn-primary" onClick={() => setJobFormState('new')}>
          + Add Job
        </button>
      </div>

      {jobs.length === 0 ? (
        <div className="empty-state">No jobs recorded yet. Add the first one!</div>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Service</th>
              <th>Price</th>
              <th>Status</th>
              <th>Payment</th>
              <th>Notes</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => (
              <tr key={job._id}>
                <td style={{ whiteSpace: 'nowrap' }}>
                  {new Date(job.date).toLocaleDateString('en-GB')}
                </td>
                <td>{SERVICE_LABELS[job.serviceType] || job.serviceType}</td>
                <td>{formatPrice(job.priceInPence)}</td>
                <td>
                  <span className={`badge badge-job-${job.status}`}>
                    {STATUS_LABELS[job.status]}
                  </span>
                </td>
                <td>
                  <span className={`badge badge-pay-${job.paymentStatus}`}>
                    {job.paymentStatus}
                  </span>
                </td>
                <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                  {job.notes || '—'}
                </td>
                <td>
                  <button
                    className="btn btn-sm btn-secondary"
                    onClick={() => setJobFormState(job)}
                  >
                    Edit
                  </button>
                  <button
                    className="btn btn-sm btn-secondary"
                    onClick={() => handleSendInvoice(job)}
                  >
                    Invoice
                  </button>
                  <button
                    className="btn btn-sm btn-danger"
                    onClick={() => handleDeleteJob(job)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showEditCustomer && (
        <CustomerForm
          customer={customer}
          onClose={(saved) => {
            setShowEditCustomer(false);
            if (saved) fetchAll();
          }}
        />
      )}

      {jobFormState !== null && (
        <JobForm
          job={jobFormState === 'new' ? null : jobFormState}
          customerId={id}
          onClose={(saved) => {
            setJobFormState(null);
            if (saved) fetchAll();
          }}
        />
      )}
    </div>
  );
}

export default CustomerDetail;
