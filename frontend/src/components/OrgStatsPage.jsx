import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, AreaChart, Area
} from 'recharts';
import { getOrgChartsAPI, getOrgStatsAPI, getOrgHistoryAPI } from '../services/api';
import './OrgStatsPage.css';

// ─────────────────── Colour palette ───────────────────────────────────────────
const COLORS = {
  total:     '#a78bfa',
  served:    '#34d399',
  cancelled: '#f87171',
  waiting:   '#60a5fa',
};
const PIE_COLORS = ['#a78bfa', '#34d399', '#f87171', '#60a5fa', '#fb923c', '#e879f9'];

// ─────────────────── Custom tooltip ───────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="custom-tooltip">
      <div className="tooltip-date">{label}</div>
      {payload.map((p) => (
        <div className="tooltip-row" key={p.dataKey}>
          <span className="dot" style={{ background: p.color }} />
          <span style={{ color: '#94a3b8' }}>{p.name}:</span>
          <strong>{p.value}</strong>
        </div>
      ))}
    </div>
  );
};

// ─────────────────── Main Page ─────────────────────────────────────────────────
const OrgStatsPage = () => {
  const navigate = useNavigate();
  const [charts, setCharts] = useState(null);
  const [orgStats, setOrgStats] = useState(null);
  const [historyStats, setHistoryStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoading(true);
        const [chartsRes, statsRes, histRes] = await Promise.allSettled([
          getOrgChartsAPI(),
          getOrgStatsAPI(),
          getOrgHistoryAPI({ range: 'today' }),  // same range as dashboard
        ]);

        if (chartsRes.status === 'fulfilled') setCharts(chartsRes.value.data.data);
        if (statsRes.status === 'fulfilled') setOrgStats(statsRes.value.data.data);
        if (histRes.status === 'fulfilled') setHistoryStats(histRes.value.data.data);
      } catch (e) {
        setError('Failed to load stats');
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  if (loading) {
    return (
      <div className="stats-page">
        <div className="stats-container">
          <div className="stats-loading">Loading analytics...</div>
          <div className="stats-kpi-grid">
            {[1,2,3,4,5].map(i => <div className="stats-skeleton" key={i} style={{ height: 90 }} />)}
          </div>
          <div className="stats-charts-grid">
            {[1,2,3,4].map(i => <div className="stats-skeleton" key={i} style={{ height: 280 }} />)}
          </div>
        </div>
      </div>
    );
  }

  const totalAll  = charts?.perService?.reduce((a, s) => a + s.total, 0) || 0;
  const totalServedAll  = charts?.perService?.reduce((a, s) => a + s.served, 0) || 0;
  const totalWaitingAll = charts?.perService?.reduce((a, s) => a + s.waiting, 0) || 0;
  const totalCancelledAll = charts?.perService?.reduce((a, s) => a + s.cancelled, 0) || 0;
  const successRate = totalAll > 0 ? Math.round((totalServedAll / totalAll) * 100) : 0;

  // Pie data: status breakdown
  const pieData = [
    { name: 'Served',    value: totalServedAll,    color: COLORS.served    },
    { name: 'Waiting',   value: totalWaitingAll,   color: COLORS.waiting   },
    { name: 'Cancelled', value: totalCancelledAll, color: COLORS.cancelled },
  ].filter(d => d.value > 0);

  // Service distribution pie (total tickets per service)
  const servicePieData = (charts?.perService || []).map((s, i) => ({
    name: s.serviceName,
    value: s.total,
    color: PIE_COLORS[i % PIE_COLORS.length],
  }));

  // Peak-hours bar (only show hours 7-22 to avoid empty night hours clutter)
  const peakHours = (charts?.hourlyData || []).filter(h => h.hour >= 6 && h.hour <= 22);

  // Avg wait: use today's history (same as dashboard), fall back to configured avg
  const avgWait = historyStats?.stats?.avgWaitTime
    || orgStats?.configuredAvgServiceTime
    || 0;
  // All-time avg from chart summary (may differ from today)
  const allTimeAvg = charts?.summary?.avgWaitTime || avgWait;


  return (
    <div className="stats-page">
      <div className="stats-container">

        {/* ── Header ── */}
        <div className="stats-header">
          <div className="stats-header-left">
            <h1>📊 Analytics & Stats</h1>
            <p>Comprehensive view of your queue performance</p>
          </div>
          <button className="stats-back-btn" onClick={() => navigate('/service-provider')}>
            ← Dashboard
          </button>
        </div>

        {error && <div style={{ color: '#f87171', marginBottom: '1rem' }}>{error}</div>}

        {/* ── KPI Cards ── */}
        <div className="stats-kpi-grid">
          <div className="stats-kpi-card">
            <div className="stats-kpi-icon kpi-purple">🎫</div>
            <div className="stats-kpi-info">
              <div className="stats-kpi-value">{orgStats?.totalBookings ?? totalAll}</div>
              <div className="stats-kpi-label">Total Tickets</div>
            </div>
          </div>
          <div className="stats-kpi-card">
            <div className="stats-kpi-icon kpi-emerald">✅</div>
            <div className="stats-kpi-info">
              <div className="stats-kpi-value">{totalServedAll}</div>
              <div className="stats-kpi-label">Served</div>
            </div>
          </div>
          <div className="stats-kpi-card">
            <div className="stats-kpi-icon kpi-blue">⏳</div>
            <div className="stats-kpi-info">
              <div className="stats-kpi-value">{totalWaitingAll}</div>
              <div className="stats-kpi-label">Currently Waiting</div>
            </div>
          </div>
          <div className="stats-kpi-card">
            <div className="stats-kpi-icon kpi-pink">🎯</div>
            <div className="stats-kpi-info">
              <div className="stats-kpi-value">{successRate}%</div>
              <div className="stats-kpi-label">Success Rate</div>
            </div>
          </div>
          <div className="stats-kpi-card">
            <div className="stats-kpi-icon kpi-orange">⏱️</div>
            <div className="stats-kpi-info">
              <div className="stats-kpi-value">{avgWait} min</div>
              <div className="stats-kpi-label">Avg Wait (Today)</div>
            </div>
          </div>
          <div className="stats-kpi-card">
            <div className="stats-kpi-icon kpi-pink">📉</div>
            <div className="stats-kpi-info">
              <div className="stats-kpi-value">{allTimeAvg} min</div>
              <div className="stats-kpi-label">Avg Wait (All Time)</div>
            </div>
          </div>
          <div className="stats-kpi-card">
            <div className="stats-kpi-icon kpi-purple">💼</div>
            <div className="stats-kpi-info">
              <div className="stats-kpi-value">{orgStats?.activeServices ?? (charts?.perService?.length || 0)}</div>
              <div className="stats-kpi-label">Active Services</div>
            </div>
          </div>
        </div>


        {/* ── Row 1: Daily Bookings (Bar) + Status Pie ── */}
        <div className="stats-charts-grid">
          <div className="stats-chart-card">
            <h3 className="stats-chart-title"><span className="chart-icon">📅</span> Daily Bookings (Last 14 Days)</h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={charts?.dailyData || []} barGap={2} barSize={10}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(167,139,250,0.06)' }} />
                <Bar dataKey="total"     name="Total"     fill={COLORS.total}     radius={[4,4,0,0]} />
                <Bar dataKey="served"    name="Served"    fill={COLORS.served}    radius={[4,4,0,0]} />
                <Bar dataKey="cancelled" name="Cancelled" fill={COLORS.cancelled} radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="chart-legend">
              {[['total', 'Total'], ['served', 'Served'], ['cancelled', 'Cancelled']].map(([key, label]) => (
                <div className="legend-item" key={key}>
                  <div className="legend-dot" style={{ background: COLORS[key] }} />
                  {label}
                </div>
              ))}
            </div>
          </div>

          <div className="stats-chart-card">
            <h3 className="stats-chart-title"><span className="chart-icon">🥧</span> Ticket Status Breakdown</h3>
            {pieData.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#64748b', padding: '3rem 0' }}>No ticket data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={95}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value, name) => [value, name]} contentStyle={{ background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(167,139,250,0.3)', borderRadius: 10 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
            <div className="chart-legend">
              {pieData.map(d => (
                <div className="legend-item" key={d.name}>
                  <div className="legend-dot" style={{ background: d.color }} />
                  {d.name}: <strong style={{ color: '#f1f5f9' }}>{d.value}</strong>
                </div>
              ))}
            </div>
          </div>

          {/* ── Row 2: Area trend + Service pie ── */}
          <div className="stats-chart-card">
            <h3 className="stats-chart-title"><span className="chart-icon">📈</span> Served Trend (14 Days)</h3>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={charts?.dailyData || []}>
                <defs>
                  <linearGradient id="gradServed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#34d399" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#a78bfa" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#a78bfa" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="total"  name="Total"  stroke={COLORS.total}  fill="url(#gradTotal)"  strokeWidth={2} dot={false} />
                <Area type="monotone" dataKey="served" name="Served" stroke={COLORS.served} fill="url(#gradServed)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
            <div className="chart-legend">
              {[['total', 'Total'], ['served', 'Served']].map(([key, label]) => (
                <div className="legend-item" key={key}>
                  <div className="legend-dot" style={{ background: COLORS[key] }} />
                  {label}
                </div>
              ))}
            </div>
          </div>

          <div className="stats-chart-card">
            <h3 className="stats-chart-title"><span className="chart-icon">💼</span> Tickets by Service</h3>
            {servicePieData.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#64748b', padding: '3rem 0' }}>No services yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={servicePieData}
                    cx="50%"
                    cy="50%"
                    outerRadius={95}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {servicePieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v, n) => [v, n]} contentStyle={{ background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(167,139,250,0.3)', borderRadius: 10 }} />
                  <Legend formatter={(v) => <span style={{ color: '#94a3b8', fontSize: 12 }}>{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* ── Peak Hours Bar (full width) ── */}
        <div className="stats-charts-grid">
          <div className="stats-chart-card full-width">
            <h3 className="stats-chart-title"><span className="chart-icon">⏰</span> Peak Hours Distribution (Last 30 Days)</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={peakHours} barSize={18}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(167,139,250,0.06)' }} />
                <Bar dataKey="count" name="Served" fill="url(#gradBar)" radius={[6,6,0,0]}>
                  {peakHours.map((entry, i) => (
                    <Cell key={i} fill={entry.count === Math.max(...peakHours.map(h => h.count)) ? '#a78bfa' : '#4f46e5'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="chart-legend" style={{ justifyContent: 'center', marginTop: '0.5rem' }}>
              <div className="legend-item"><div className="legend-dot" style={{ background: '#a78bfa' }} />Peak hour</div>
              <div className="legend-item"><div className="legend-dot" style={{ background: '#4f46e5' }} />Other hours</div>
            </div>
          </div>
        </div>

        {/* ── Per-Service Breakdown Table ── */}
        {(charts?.perService || []).length > 0 && (
          <div className="stats-charts-grid">
            <div className="stats-chart-card full-width">
              <h3 className="stats-chart-title"><span className="chart-icon">🗂️</span> Per-Service Breakdown</h3>
              <div style={{ overflowX: 'auto' }}>
                <table className="service-table">
                  <thead>
                    <tr>
                      <th>Service Name</th>
                      <th>Total</th>
                      <th>Waiting</th>
                      <th>Served</th>
                      <th>Cancelled</th>
                      <th>Success Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {charts.perService.map((s) => {
                      const rate = s.total > 0 ? Math.round((s.served / s.total) * 100) : 0;
                      return (
                        <tr key={s.serviceId}>
                          <td style={{ fontWeight: 600, color: '#a78bfa' }}>{s.serviceName}</td>
                          <td><strong>{s.total}</strong></td>
                          <td><span className="svc-badge waiting">{s.waiting}</span></td>
                          <td><span className="svc-badge served">{s.served}</span></td>
                          <td><span className="svc-badge cancelled">{s.cancelled}</span></td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{
                                background: `linear-gradient(to right, #34d399 ${rate}%, rgba(255,255,255,0.06) ${rate}%)`,
                                height: 6, borderRadius: 3, width: 80, flexShrink: 0
                              }} />
                              <span style={{ color: rate > 70 ? '#34d399' : rate > 40 ? '#fb923c' : '#f87171' }}>{rate}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default OrgStatsPage;
