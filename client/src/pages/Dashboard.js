import { useState, useEffect } from 'react';
import { getCustomers, getCampaigns, getJobStats, getUpcomingStats } from '../api';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

// ── Chart tooltip ──────────────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const { value, count } = payload[0].payload;
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-day">{label}</div>
      <div className="chart-tooltip-value">${value.toFixed(2)}</div>
      <div className="chart-tooltip-count">{count} job{count !== 1 ? 's' : ''}</div>
    </div>
  );
};

// ── Stat card ──────────────────────────────────────────────────────────────
function StatCard({ label, value, accent }) {
  return (
    <div className={`stat-card stat-card--${accent}`}>
      <div className="stat-number">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

// ── Goal progress bar ──────────────────────────────────────────────────────
function GoalProgress({ upcomingData }) {
  const [goal, setGoal] = useState(
    () => parseFloat(localStorage.getItem('bookingGoal7d') || '2000')
  );
  const [input, setInput] = useState('');
  const [editing, setEditing] = useState(false);

  const totalValue = upcomingData.reduce((sum, d) => sum + d.value, 0);
  const totalJobs  = upcomingData.reduce((sum, d) => sum + d.count, 0);
  const pct        = Math.min(100, goal > 0 ? (totalValue / goal) * 100 : 0);
  const over       = totalValue >= goal && goal > 0;

  const startEdit = () => {
    setInput(goal.toFixed(2));
    setEditing(true);
  };

  const saveGoal = () => {
    const v = parseFloat(input);
    if (!isNaN(v) && v > 0) {
      setGoal(v);
      localStorage.setItem('bookingGoal7d', v.toString());
    }
    setEditing(false);
  };

  const handleKey = (e) => {
    if (e.key === 'Enter') saveGoal();
    if (e.key === 'Escape') setEditing(false);
  };

  return (
    <div className="goal-card">
      <div className="goal-header">
        <div>
          <h2>7-Day Booking Goal</h2>
          <p className="goal-subtitle">
            {over ? '🎯 Goal reached!' : `${(100 - pct).toFixed(0)}% remaining to reach your goal`}
          </p>
        </div>

        <div className="goal-edit-row">
          {editing ? (
            <>
              <span className="goal-edit-label">Goal $</span>
              <input
                className="goal-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKey}
                autoFocus
                placeholder="2000.00"
              />
              <button className="btn btn-primary btn-sm" onClick={saveGoal}>Save</button>
              <button className="btn btn-secondary btn-sm" onClick={() => setEditing(false)}>Cancel</button>
            </>
          ) : (
            <button className="btn btn-secondary btn-sm" onClick={startEdit}>
              Edit Goal
            </button>
          )}
        </div>
      </div>

      {/* Value display */}
      <div className="goal-value-row">
        <span className="goal-current-value">${totalValue.toFixed(2)}</span>
        <span className="goal-of-text">of</span>
        <span className="goal-target-value">${goal.toFixed(2)}</span>
      </div>

      {/* Progress bar */}
      <div className="goal-bar-row">
        <div className="goal-bar-track">
          <div
            className={`goal-bar-fill${over ? ' goal-bar-fill--over' : ''}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className={`goal-pct${over ? ' goal-pct--over' : ''}`}>
          {pct.toFixed(0)}%
        </span>
      </div>

      {/* Stats row */}
      <div className="goal-jobs-row">
        <div className="goal-job-stat">
          <div className="goal-job-stat-value">{totalJobs}</div>
          <div className="goal-job-stat-label">Jobs booked</div>
        </div>
        <div className="goal-job-stat">
          <div className="goal-job-stat-value">${goal > 0 ? Math.max(0, goal - totalValue).toFixed(2) : '—'}</div>
          <div className="goal-job-stat-label">Still needed</div>
        </div>
        <div className="goal-job-stat">
          <div className="goal-job-stat-value">
            {totalJobs > 0 ? `$${(totalValue / totalJobs).toFixed(2)}` : '—'}
          </div>
          <div className="goal-job-stat-label">Avg per job</div>
        </div>
      </div>
    </div>
  );
}

// ── Dashboard page ─────────────────────────────────────────────────────────
function Dashboard() {
  const [customers,    setCustomers]    = useState([]);
  const [campaigns,    setCampaigns]    = useState([]);
  const [jobStats,     setJobStats]     = useState(null);
  const [upcomingData, setUpcomingData] = useState([]);
  const [loading,      setLoading]      = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [custRes, campRes, jobRes, upRes] = await Promise.all([
          getCustomers(),
          getCampaigns(),
          getJobStats(),
          getUpcomingStats(),
        ]);
        setCustomers(custRes.data);
        setCampaigns(campRes.data);
        setJobStats(jobRes.data);
        setUpcomingData(upRes.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="loading">Loading dashboard...</div>;

  const activeCustomers  = customers.filter((c) => c.status === 'active').length;
  const prospects        = customers.filter((c) => c.status === 'prospect').length;
  const sentCampaigns    = campaigns.filter((c) => c.status === 'sent').length;
  const totalEmailsSent  = campaigns.reduce((sum, c) => sum + (c.stats?.sent || 0), 0);
  const formatPrice      = (pence) => `$${((pence || 0) / 100).toFixed(2)}`;
  const totalUpcoming    = upcomingData.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="page">
      <h1>Dashboard</h1>
      <p className="subtitle">Welcome back — here's your business overview</p>

      {/* ── Stat cards ── */}
      <div className="stats-grid">
        <StatCard label="Total Contacts"   value={customers.length}              accent="blue"    />
        <StatCard label="Active Customers" value={activeCustomers}               accent="green"   />
        <StatCard label="Prospects"        value={prospects}                     accent="amber"   />
        <StatCard label="Jobs Completed"   value={jobStats?.completedJobs ?? 0}  accent="slate"   />
        <StatCard label="Jobs Upcoming"    value={jobStats?.futureJobs ?? 0}     accent="sky"     />
        <StatCard label="Value Booked"     value={formatPrice(jobStats?.futureValue)} accent="emerald" />
        <StatCard label="Campaigns Sent"   value={sentCampaigns}                 accent="purple"  />
        <StatCard label="Emails Sent"      value={totalEmailsSent}               accent="pink"    />
      </div>

      {/* ── 7-day chart ── */}
      <div className="chart-card">
        <div className="chart-header">
          <div>
            <h2>Upcoming Bookings</h2>
            <p className="chart-subtitle">
              Next 7 days &mdash; ${totalUpcoming.toFixed(2)} total value scheduled
            </p>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={upcomingData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="bookingGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#00AEEF" stopOpacity={0.22} />
                <stop offset="95%" stopColor="#00AEEF" stopOpacity={0}    />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis
              dataKey="day"
              tick={{ fontSize: 12, fill: '#64748b', fontFamily: 'Inter, sans-serif' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(v) => `$${v}`}
              tick={{ fontSize: 12, fill: '#64748b', fontFamily: 'Inter, sans-serif' }}
              axisLine={false}
              tickLine={false}
              width={58}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#e2e8f0', strokeWidth: 1 }} />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#00AEEF"
              strokeWidth={2.5}
              fill="url(#bookingGrad)"
              dot={{ fill: '#00AEEF', r: 4, strokeWidth: 0 }}
              activeDot={{ r: 6, fill: '#00AEEF', strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* ── Goal progress bar ── */}
      <GoalProgress upcomingData={upcomingData} />

      {/* ── Recent campaigns ── */}
      <div className="recent-section">
        <h2>Recent Campaigns</h2>
        {campaigns.length === 0 ? (
          <div className="empty-state">
            No campaigns yet. <a href="/campaigns">Create your first one →</a>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Campaign</th>
                <th>Status</th>
                <th>Recipients</th>
                <th>Sent</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.slice(0, 5).map((c) => (
                <tr key={c._id}>
                  <td>{c.name}</td>
                  <td><span className={`badge badge-${c.status}`}>{c.status}</span></td>
                  <td>{c.stats?.totalRecipients || 0}</td>
                  <td>{c.stats?.sent || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
