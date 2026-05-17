import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getJobs, getCustomers } from '../api';
import JobForm from '../components/JobForm';

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

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const DAY_HEADERS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function getGridStart(monthStart) {
  const d = new Date(monthStart);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

function getGridEnd(monthStart) {
  const endOfMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
  const d = new Date(endOfMonth);
  d.setDate(d.getDate() + (6 - d.getDay()));
  d.setHours(23, 59, 59, 999);
  return d;
}

function buildDays(monthStart) {
  const start = getGridStart(monthStart);
  const end = getGridEnd(monthStart);
  const days = [];
  const d = new Date(start);
  while (d <= end) {
    days.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return days;
}

function toDateKey(date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function toDateISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatPrice(pence) {
  return `$${(pence / 100).toFixed(2)}`;
}

function Calendar() {
  const navigate = useNavigate();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [monthStart, setMonthStart] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1)
  );
  const [jobs, setJobs] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedKey, setSelectedKey] = useState(toDateKey(today));
  const [showAddJob, setShowAddJob] = useState(false);

  // Fetch all customers once for the add-job form
  useEffect(() => {
    getCustomers().then((res) => setCustomers(res.data)).catch(console.error);
  }, []);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const start = getGridStart(monthStart);
      const end = getGridEnd(monthStart);
      const res = await getJobs({
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      });
      setJobs(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [monthStart]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const prevMonth = () =>
    setMonthStart(new Date(monthStart.getFullYear(), monthStart.getMonth() - 1, 1));
  const nextMonth = () =>
    setMonthStart(new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1));
  const goToday = () => {
    setMonthStart(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedKey(toDateKey(today));
  };

  const days = buildDays(monthStart);

  const jobsByDay = {};
  jobs.forEach((job) => {
    // Parse the ISO date string directly to avoid timezone offset shifting the day
    const [y, m, d] = job.date.substring(0, 10).split('-').map(Number);
    const key = `${y}-${m - 1}-${d}`; // month is 0-indexed to match toDateKey
    if (!jobsByDay[key]) jobsByDay[key] = [];
    jobsByDay[key].push(job);
  });
  Object.values(jobsByDay).forEach((arr) =>
    arr.sort((a, b) => {
      if (a.time && b.time) return a.time.localeCompare(b.time);
      if (a.time) return -1;
      if (b.time) return 1;
      return 0;
    })
  );

  const selectedJobs = jobsByDay[selectedKey] || [];
  const selectedDate = days.find((d) => toDateKey(d) === selectedKey);

  return (
    <div className="page">
      <div className="cal-header">
        <div className="cal-nav">
          <button className="btn btn-secondary" onClick={prevMonth}>‹</button>
          <h1 className="cal-title">
            {MONTHS[monthStart.getMonth()]} {monthStart.getFullYear()}
          </h1>
          <button className="btn btn-secondary" onClick={nextMonth}>›</button>
        </div>
        <button className="btn btn-secondary" onClick={goToday}>Today</button>
      </div>

      {loading ? (
        <div className="loading">Loading jobs...</div>
      ) : (
        <>
          <div className="cal-grid">
            {DAY_HEADERS.map((d) => (
              <div key={d} className="cal-day-header">{d}</div>
            ))}
            {days.map((day) => {
              const key = toDateKey(day);
              const dayJobs = jobsByDay[key] || [];
              const isToday = toDateKey(day) === toDateKey(today);
              const isCurrentMonth = day.getMonth() === monthStart.getMonth();
              const isSelected = key === selectedKey;

              return (
                <div
                  key={key}
                  className={[
                    'cal-day',
                    isToday ? 'cal-day--today' : '',
                    !isCurrentMonth ? 'cal-day--other-month' : '',
                    isSelected ? 'cal-day--selected' : '',
                  ].filter(Boolean).join(' ')}
                  onClick={() => setSelectedKey(key)}
                >
                  <div className="cal-day-number">{day.getDate()}</div>
                  {dayJobs.map((job) => (
                    <div
                      key={job._id}
                      className={`cal-job cal-job--${job.status}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/customers/${job.customer._id}`);
                      }}
                    >
                      {job.time && <span className="cal-job-time">{job.time}</span>}
                      <span className="cal-job-name">
                        {job.customer.firstName} {job.customer.lastName}
                      </span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>

          {selectedDate && (
            <div className="cal-detail">
              <div className="cal-detail-header">
                <div>
                  <h2 className="cal-detail-title">
                    {selectedDate.toLocaleDateString('en-GB', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                    <span className="cal-detail-count">
                      {selectedJobs.length} job{selectedJobs.length !== 1 ? 's' : ''} booked
                    </span>
                  </h2>
                </div>
                <button
                  className="btn btn-primary"
                  onClick={() => setShowAddJob(true)}
                >
                  + Add Job
                </button>
              </div>

              {selectedJobs.length === 0 ? (
                <p className="cal-no-jobs">No jobs scheduled — click "Add Job" to book one.</p>
              ) : (
                <div className="cal-detail-list">
                  {selectedJobs.map((job) => (
                    <div key={job._id} className="cal-detail-card">
                      <div className="cal-detail-card-header">
                        <div>
                          <button
                            className="link-btn cal-customer-name"
                            onClick={() => navigate(`/customers/${job.customer._id}`)}
                          >
                            {job.customer.firstName} {job.customer.lastName}
                          </button>
                          {job.customer.address?.street && (
                            <div className="cal-address">
                              {job.customer.address.street}, {job.customer.address.city}
                            </div>
                          )}
                        </div>
                        <div className="cal-detail-meta">
                          {job.time && <span className="cal-time-badge">{job.time}</span>}
                          <span className={`badge badge-job-${job.status}`}>
                            {job.status.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                      <div className="cal-detail-row">
                        <span>{SERVICE_LABELS[job.serviceType]}</span>
                        <span className="cal-price">{formatPrice(job.priceInPence)}</span>
                      </div>
                      {job.notes && <div className="cal-notes">{job.notes}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {showAddJob && selectedDate && (
        <JobForm
          customers={customers}
          defaultDate={toDateISO(selectedDate)}
          onClose={(saved) => {
            setShowAddJob(false);
            if (saved) fetchJobs();
          }}
        />
      )}
    </div>
  );
}

export default Calendar;
