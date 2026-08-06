import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { AuthContext } from '../contexts/AuthContext';
import './ContestDashboard.css';

const formatDate = (value) => {
  if (!value) return '-';
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const toInputDate = (value) => {
  if (!value) return '';
  return String(value).slice(0, 10);
};

function ContestDashboard() {
  const { auth } = useContext(AuthContext);
  const [bundle, setBundle] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sortKey, setSortKey] = useState('points');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [setup, setSetup] = useState(null);
  const [bonus, setBonus] = useState({ advisor: '', reason: '', points: 1 });
  const [selectedAdvisor, setSelectedAdvisor] = useState('');

  const isManager = ['Admin', 'Manager'].includes(auth?.user?.role);
  const isAdmin = auth?.user?.role === 'Admin';

  const fetchContest = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/contests/active`, {
        headers: { Authorization: `Bearer ${auth.token}` }
      });
      setBundle(response.data);
      setSetup({
        contest: response.data.contest,
        categories: response.data.categories
      });
      if (!response.data.contest.is_enabled && auth?.user?.role === 'Admin') {
        setActiveTab('admin');
      }
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load contest');
    } finally {
      setLoading(false);
    }
  }, [auth.token, auth?.user?.role]);

  useEffect(() => {
    fetchContest();
  }, [fetchContest]);

  const contest = bundle?.contest;
  const categories = useMemo(() => bundle?.categories || [], [bundle]);
  const deals = useMemo(() => bundle?.deals || [], [bundle]);
  const activity = useMemo(() => bundle?.activity || [], [bundle]);
  const categoryProgress = useMemo(() => bundle?.categoryProgress || [], [bundle]);

  const progressPercent = contest?.target_points
    ? Math.min(100, Math.round((contest.current_points / contest.target_points) * 100))
    : 0;

  const leaderboard = useMemo(() => {
    const rows = [...(bundle?.leaderboard || [])];
    return rows.sort((a, b) => {
      if (sortKey === 'advisor') return a.advisor.localeCompare(b.advisor);
      return Number(b[sortKey] || 0) - Number(a[sortKey] || 0);
    });
  }, [bundle, sortKey]);

  const advisors = useMemo(() => {
    return Array.from(new Set([
      ...deals.map((deal) => deal.advisor),
      ...leaderboard.map((row) => row.advisor)
    ].filter(Boolean))).sort();
  }, [deals, leaderboard]);

  const pendingCount = deals.filter((deal) => deal.status === 'pending' && (deal.countToward || deal.rewardsCompleted)).length;

  const saveDealScore = async (deal, updates) => {
    if (!isManager || saving) return;
    const nextDeal = { ...deal, ...updates };
    const category = categories.find((item) => item.id === Number(nextDeal.categoryId));
    const rewardsCategory = categories.find((item) => item.is_rewards);

    setSaving(true);
    try {
      const response = await axios.post(
        `${API_BASE_URL}/contests/${contest.id}/deals/${deal.saleId}/score`,
        {
          advisor: nextDeal.advisor,
          categoryId: nextDeal.categoryId,
          countToward: nextDeal.countToward,
          rewardsCompleted: nextDeal.rewardsCompleted,
          basePoints: category?.point_value || nextDeal.basePoints || 0,
          rewardsPoints: rewardsCategory?.point_value || nextDeal.rewardsPoints || 0
        },
        { headers: { Authorization: `Bearer ${auth.token}` } }
      );
      setBundle(response.data);
      setSetup({ contest: response.data.contest, categories: response.data.categories });
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to save deal score');
    } finally {
      setSaving(false);
    }
  };

  const publishScores = async () => {
    setSaving(true);
    try {
      const response = await axios.post(
        `${API_BASE_URL}/contests/${contest.id}/publish`,
        {},
        { headers: { Authorization: `Bearer ${auth.token}` } }
      );
      setBundle(response.data);
      setSetup({ contest: response.data.contest, categories: response.data.categories });
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to publish scores');
    } finally {
      setSaving(false);
    }
  };

  const saveSetup = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await axios.put(
        `${API_BASE_URL}/contests/${contest.id}/setup`,
        setup,
        { headers: { Authorization: `Bearer ${auth.token}` } }
      );
      setBundle(response.data);
      setSetup({ contest: response.data.contest, categories: response.data.categories });
      window.dispatchEvent(new Event('contest-availability-changed'));
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to save contest setup');
    } finally {
      setSaving(false);
    }
  };

  const addBonus = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await axios.post(
        `${API_BASE_URL}/contests/${contest.id}/bonuses`,
        bonus,
        { headers: { Authorization: `Bearer ${auth.token}` } }
      );
      setBundle(response.data);
      setBonus({ advisor: '', reason: '', points: 1 });
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to add bonus');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="contest-page">Loading contest...</div>;
  if (!bundle) return <div className="contest-page error-message">{error || 'Contest unavailable'}</div>;

  return (
    <div className="contest-page">
      {!contest.is_enabled && isAdmin && (
        <div className="contest-disabled-notice">
          Mission 250 is off. Only admins can access this page until it is turned back on.
        </div>
      )}
      {contest.is_complete || contest.status === 'closed' ? (
        <div className="contest-complete">
          <div className="confetti-strip" />
          <h1>MISSION ACCOMPLISHED</h1>
          <p>{contest.current_points} Points Achieved</p>
          <span>Mission Complete</span>
        </div>
      ) : (
        <div className="contest-hero">
          <div>
            <p className="contest-kicker">Live Contest</p>
            <h1>{contest.name}</h1>
            <p>{formatDate(contest.start_date)} - {formatDate(contest.end_date)}</p>
          </div>
          <div className="contest-score">
            <strong>{contest.current_points}</strong>
            <span>/ {contest.target_points}</span>
          </div>
        </div>
      )}

      <div className="contest-progress" aria-label={`${progressPercent}% complete`}>
        <div style={{ width: `${progressPercent}%` }} />
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="contest-tabs">
        <button className={activeTab === 'dashboard' ? 'active' : ''} onClick={() => setActiveTab('dashboard')}>Dashboard</button>
        <button className={activeTab === 'leaderboard' ? 'active' : ''} onClick={() => setActiveTab('leaderboard')}>Leaderboard</button>
        {isManager && <button className={activeTab === 'deals' ? 'active' : ''} onClick={() => setActiveTab('deals')}>July Deals</button>}
        {isManager && <button className={activeTab === 'admin' ? 'active' : ''} onClick={() => setActiveTab('admin')}>Contest Admin</button>}
      </div>

      {activeTab === 'dashboard' && (
        <div className="contest-grid">
          <section className="contest-panel progress-panel">
            <h2>Goal</h2>
            <div className="goal-table">
              <div><span>Goal</span><strong>{contest.current_points} / {contest.target_points}</strong></div>
              {categoryProgress.map((category) => (
                <div key={category.id}>
                  <span>{category.name}</span>
                  <strong>{category.target ? `${category.current} / ${category.target}` : category.current}</strong>
                </div>
              ))}
            </div>
          </section>

          <section className="contest-panel">
            <h2>Leaderboard</h2>
            <table className="contest-table compact">
              <thead>
                <tr><th>Advisor</th><th>Points</th></tr>
              </thead>
              <tbody>
                {leaderboard.slice(0, 6).map((row) => (
                  <tr key={row.advisor}>
                    <td>{row.advisor}</td>
                    <td>{row.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="contest-panel">
            <h2>Recent Activity</h2>
            <div className="activity-list">
              {activity.length === 0 && <p className="empty-state">No published scoring activity yet.</p>}
              {activity.map((item, index) => (
                <div className="activity-row" key={`${item.type}-${index}`}>
                  <strong>+{item.points}</strong>
                  <span>{item.description}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {activeTab === 'leaderboard' && (
        <section className="contest-panel">
          <div className="section-heading">
            <h2>Individual Standings</h2>
            <select value={sortKey} onChange={(event) => setSortKey(event.target.value)}>
              <option value="points">Points</option>
              <option value="bmw">BMW</option>
              <option value="used">Used</option>
              <option value="mini">MINI</option>
              <option value="rewards">Rewards</option>
              <option value="bonus">Bonus</option>
              <option value="advisor">Advisor</option>
            </select>
          </div>
          <table className="contest-table">
            <thead>
              <tr>
                <th>Advisor</th>
                <th>Points</th>
                <th>BMW</th>
                <th>Used</th>
                <th>MINI</th>
                <th>Rewards</th>
                <th>Bonus</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((row) => (
                <tr key={row.advisor} onClick={() => setSelectedAdvisor(row.advisor)} className="clickable-contest-row">
                  <td>{row.advisor}</td>
                  <td>{row.points}</td>
                  <td>{row.bmw}</td>
                  <td>{row.used}</td>
                  <td>{row.mini}</td>
                  <td>{row.rewards}</td>
                  <td>{row.bonus}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {selectedAdvisor && (
            <div className="advisor-detail">
              <div className="section-heading">
                <h3>{selectedAdvisor}</h3>
                <button type="button" onClick={() => setSelectedAdvisor('')}>Close</button>
              </div>
              {leaderboard.filter((row) => row.advisor === selectedAdvisor).map((row) => (
                <div className="advisor-stats" key={row.advisor}>
                  <div><span>BMW</span><strong>{row.bmw}</strong></div>
                  <div><span>Used</span><strong>{row.used}</strong></div>
                  <div><span>MINI</span><strong>{row.mini}</strong></div>
                  <div><span>Rewards</span><strong>{row.rewards}</strong></div>
                  <div><span>Bonus</span><strong>{row.bonus}</strong></div>
                  <div><span>Running Total</span><strong>{row.points}</strong></div>
                </div>
              ))}
              <div className="activity-list">
                {activity.filter((item) => item.advisor === selectedAdvisor).slice(0, 8).map((item, index) => (
                  <div className="activity-row" key={`${item.type}-${selectedAdvisor}-${index}`}>
                    <strong>+{item.points}</strong>
                    <span>{item.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {activeTab === 'deals' && isManager && (
        <section className="contest-panel">
          <div className="section-heading">
            <div>
              <h2>July Deals</h2>
              <p>{pendingCount} pending scoring updates ready to publish.</p>
            </div>
            <button onClick={publishScores} disabled={saving || pendingCount === 0}>
              Publish Today's Scores
            </button>
          </div>
          <table className="contest-table deal-table">
            <thead>
              <tr>
                <th>Count</th>
                <th>Rewards</th>
                <th>Advisor</th>
                <th>Client</th>
                <th>Vehicle</th>
                <th>Type</th>
                <th>Delivered</th>
                <th>Points</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {deals.map((deal) => (
                <tr key={deal.saleId}>
                  <td>
                    <input
                      type="checkbox"
                      checked={deal.countToward}
                      onChange={(event) => saveDealScore(deal, { countToward: event.target.checked })}
                    />
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      checked={deal.rewardsCompleted}
                      onChange={(event) => saveDealScore(deal, { rewardsCompleted: event.target.checked })}
                    />
                  </td>
                  <td>{deal.advisor}</td>
                  <td>{deal.clientName || '-'}</td>
                  <td>{deal.vehicle || deal.stockNumber}</td>
                  <td>
                    <select
                      value={deal.categoryId || ''}
                      onChange={(event) => saveDealScore(deal, { categoryId: Number(event.target.value), countToward: deal.countToward })}
                    >
                      <option value="">Unassigned</option>
                      {categories.filter((category) => !category.is_rewards).map((category) => (
                        <option key={category.id} value={category.id}>{category.name}</option>
                      ))}
                    </select>
                  </td>
                  <td>{formatDate(deal.delivered)}</td>
                  <td>{deal.points}</td>
                  <td><span className={`status-pill ${deal.status}`}>{deal.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {activeTab === 'admin' && isManager && setup && (
        <div className="contest-grid admin-grid">
          <section className="contest-panel">
            <h2>Contest Setup</h2>
            <form className="contest-form" onSubmit={saveSetup}>
              <label>
                Contest Name
                <input value={setup.contest.name || ''} onChange={(event) => setSetup({ ...setup, contest: { ...setup.contest, name: event.target.value } })} />
              </label>
              <label>
                Start Date
                <input type="date" value={toInputDate(setup.contest.start_date)} onChange={(event) => setSetup({ ...setup, contest: { ...setup.contest, start_date: event.target.value } })} />
              </label>
              <label>
                End Date
                <input type="date" value={toInputDate(setup.contest.end_date)} onChange={(event) => setSetup({ ...setup, contest: { ...setup.contest, end_date: event.target.value } })} />
              </label>
              <label>
                Target Points
                <input type="number" value={setup.contest.target_points || 0} onChange={(event) => setSetup({ ...setup, contest: { ...setup.contest, target_points: Number(event.target.value) } })} />
              </label>
              <label>
                Mission 250
                <select value={setup.contest.is_enabled ? 'on' : 'off'} onChange={(event) => setSetup({ ...setup, contest: { ...setup.contest, is_enabled: event.target.value === 'on' } })}>
                  <option value="on">ON</option>
                  <option value="off">OFF</option>
                </select>
              </label>
              <button disabled={saving}>Save Contest</button>
            </form>
          </section>

          <section className="contest-panel">
            <h2>Point Values</h2>
            <div className="point-editor">
              {setup.categories.map((category, index) => (
                <div className="point-row" key={category.id || index}>
                  <input
                    value={category.name}
                    onChange={(event) => {
                      const next = [...setup.categories];
                      next[index] = { ...category, name: event.target.value };
                      setSetup({ ...setup, categories: next });
                    }}
                  />
                  <input
                    type="number"
                    value={category.point_value}
                    onChange={(event) => {
                      const next = [...setup.categories];
                      next[index] = { ...category, point_value: Number(event.target.value) };
                      setSetup({ ...setup, categories: next });
                    }}
                  />
                  <input
                    type="number"
                    value={category.target_points || ''}
                    placeholder="Goal"
                    onChange={(event) => {
                      const next = [...setup.categories];
                      next[index] = { ...category, target_points: event.target.value === '' ? null : Number(event.target.value) };
                      setSetup({ ...setup, categories: next });
                    }}
                  />
                </div>
              ))}
            </div>

            <form className="bonus-form" onSubmit={addBonus}>
              <h3>Add Bonus</h3>
              <select value={bonus.advisor} onChange={(event) => setBonus({ ...bonus, advisor: event.target.value })} required>
                <option value="">Select advisor</option>
                {advisors.map((advisor) => <option key={advisor} value={advisor}>{advisor}</option>)}
              </select>
              <input value={bonus.reason} onChange={(event) => setBonus({ ...bonus, reason: event.target.value })} placeholder="Reason" required />
              <input type="number" value={bonus.points} onChange={(event) => setBonus({ ...bonus, points: Number(event.target.value) })} required />
              <button disabled={saving}>Add Bonus</button>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

export default ContestDashboard;
