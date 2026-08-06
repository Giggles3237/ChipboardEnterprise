import React from 'react';
import { Link } from 'react-router-dom';
import './MarketingPage.css';

const metrics = [
  { value: 'Live', label: 'sales board updates' },
  { value: 'Role-based', label: 'manager and admin views' },
  { value: 'TV-ready', label: 'showroom performance screens' }
];

const capabilities = [
  {
    title: 'Sales pipeline tracking',
    copy: 'Track delivered and pending units by client, stock number, advisor, delivery date, model, color, and sale type.'
  },
  {
    title: 'Goal and pace management',
    copy: 'Set individual and team targets, compare current pace against monthly goals, and keep managers focused on what is still pending.'
  },
  {
    title: 'Manager analytics',
    copy: 'Review team performance, monthly trends, top performers, pending deliveries, sales distribution, and custom date ranges.'
  },
  {
    title: 'Salesperson dashboards',
    copy: 'Give each advisor a private view of current progress, pending sales, projected month-end total, sales history, and year-to-date mix.'
  },
  {
    title: 'Inventory and delivery workflows',
    copy: 'Organize inbound deliveries by advisor and month, search unified vehicle records, and edit delivery status without leaving the board.'
  },
  {
    title: 'Loaner pricing operations',
    copy: 'Generate, filter, print, and refresh loaner payment sheets from uploaded inventory data with manager reports and rate settings.'
  },
  {
    title: 'Showroom TV mode',
    copy: 'Rotate leaderboard, goal, pace, type breakdown, month-over-month, pending delivery, wholesale, and team screens on a live display.'
  },
  {
    title: 'Contest momentum',
    copy: 'Run focused campaigns like Mission 250 with controlled availability and shared team visibility.'
  },
  {
    title: 'Admin controls',
    copy: 'Manage users, roles, status, passwords, training completion, team targets, TV settings, and access permissions from one place.'
  }
];

const workflow = [
  'Log every retail, wholesale, pending, and delivered vehicle sale.',
  'Surface the right board for advisors, managers, admins, and showroom screens.',
  'Use goals, pace, contests, and reports to keep the month moving.'
];

function MarketingPage() {
  return (
    <main className="marketing-page">
      <section className="marketing-hero">
        <div className="marketing-nav">
          <img src="/assets/images/logo.png?v=1" alt="BOP Chips" />
          <div className="marketing-nav-actions">
            <a href="#features">Features</a>
            <a href="#workflow">Workflow</a>
            <Link to="/login" className="marketing-login">Login</Link>
          </div>
        </div>

        <div className="marketing-hero-grid">
          <div className="marketing-hero-copy">
            <p className="marketing-kicker">Dealership sales tracking software</p>
            <h1>Turn every sold unit, pending delivery, and team goal into one live command center.</h1>
            <p className="marketing-lede">
              BOP Chips gives sales teams a shared operating board for tracking vehicle sales,
              pacing advisors to goal, managing delivery handoffs, and keeping the showroom aligned.
            </p>
            <div className="marketing-actions">
              <Link to="/login" className="marketing-primary">Open Sales Board</Link>
              <a href="#features" className="marketing-secondary">See Capabilities</a>
            </div>
          </div>

          <div className="product-preview" aria-label="Sales tracking product preview">
            <div className="preview-topbar">
              <span>Sales Board</span>
              <strong>July Pace</strong>
            </div>
            <div className="preview-metrics">
              <div><strong>84</strong><span>Delivered</span></div>
              <div><strong>19</strong><span>Pending</span></div>
              <div><strong>112</strong><span>Team Goal</span></div>
            </div>
            <div className="preview-board">
              <div className="preview-row preview-row-head">
                <span>Advisor</span><span>Delivered</span><span>Pending</span><span>Pace</span>
              </div>
              <div className="preview-row"><span>Alex M.</span><span>15</span><span>3</span><b>108%</b></div>
              <div className="preview-row"><span>Jordan S.</span><span>13</span><span>4</span><b>96%</b></div>
              <div className="preview-row"><span>Casey R.</span><span>12</span><span>2</span><b>91%</b></div>
              <div className="preview-row"><span>Morgan T.</span><span>10</span><span>5</span><b>87%</b></div>
            </div>
          </div>
        </div>
      </section>

      <section className="marketing-metrics" aria-label="Product highlights">
        {metrics.map((metric) => (
          <div key={metric.label}>
            <strong>{metric.value}</strong>
            <span>{metric.label}</span>
          </div>
        ))}
      </section>

      <section className="marketing-section" id="features">
        <div className="section-heading">
          <p className="marketing-kicker">What it can do</p>
          <h2>Built around the daily rhythm of a dealership sales floor.</h2>
        </div>
        <div className="capability-grid">
          {capabilities.map((capability) => (
            <article className="capability-card" key={capability.title}>
              <h3>{capability.title}</h3>
              <p>{capability.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="workflow-band" id="workflow">
        <div>
          <p className="marketing-kicker">Operating flow</p>
          <h2>From sold unit to month-end performance, every handoff stays visible.</h2>
        </div>
        <ol>
          {workflow.map((item) => <li key={item}>{item}</li>)}
        </ol>
      </section>

      <section className="audience-section">
        <div>
          <h2>For sales managers who need the board, the scoreboard, and the follow-up list in one product.</h2>
          <p>
            Replace scattered spreadsheets and hallway updates with a live sales tracker that shows
            what has delivered, what is still pending, who is pacing ahead, and where managers need to intervene.
          </p>
        </div>
        <Link to="/login" className="marketing-primary">Launch Product</Link>
      </section>
    </main>
  );
}

export default MarketingPage;
