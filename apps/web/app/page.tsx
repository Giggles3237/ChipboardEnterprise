import styles from "./page.module.css";

export default function Home() {
  const navItems = ["Overview", "Sales", "Leaderboards", "Goals", "Contests", "Settings"];

  const metrics = [
    { label: "Today sales", value: "42", detail: "Across 4 stores" },
    { label: "Active goals", value: "18", detail: "7 ahead of pace" },
    { label: "Open contests", value: "5", detail: "2 ending this week" },
    { label: "Stores online", value: "4/4", detail: "Live sync ready" },
  ];

  const workQueue = [
    "Connect Clerk Organizations before inviting stores",
    "Apply the initial Azure PostgreSQL migration",
    "Map Classic sales fields into enterprise contracts",
    "Confirm production domain and callback URLs",
  ];

  const leaderboard = [
    { name: "North Store", score: "128", trend: "+14" },
    { name: "West Store", score: "116", trend: "+9" },
    { name: "Central Store", score: "104", trend: "+6" },
    { name: "South Store", score: "97", trend: "+3" },
  ];

  return (
    <main className={styles.shell}>
      <aside className={styles.sidebar} aria-label="Workspace navigation">
        <div className={styles.brandBlock}>
          <div className={styles.brandMark} aria-hidden="true">C</div>
          <div>
            <p className={styles.eyebrow}>Enterprise</p>
            <h1>Chipboard</h1>
          </div>
        </div>
        <nav className={styles.navList}>
          {navItems.map((item) => (
            <a className={item === "Overview" ? `${styles.navItem} ${styles.active}` : styles.navItem} href={`#${item.toLowerCase()}`} key={item}>
              {item}
            </a>
          ))}
        </nav>
        <div className={styles.tenantPanel}>
          <p className={styles.eyebrow}>Organization</p>
          <strong>Demo Dealer Group</strong>
          <span>4 stores - Eastern time</span>
        </div>
      </aside>

      <section className={styles.workspace}>
        <header className={styles.topbar}>
          <div>
            <p className={styles.eyebrow}>Operations command center</p>
            <h2>Deployment-ready platform shell</h2>
          </div>
          <div className={styles.statusPill}>Build passing</div>
        </header>

        <section className={styles.metricGrid} aria-label="Enterprise summary">
          {metrics.map((metric) => (
            <article className={styles.metricCard} key={metric.label}>
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
              <p>{metric.detail}</p>
            </article>
          ))}
        </section>

        <section className={styles.contentGrid}>
          <article className={`${styles.panel} ${styles.wide}`} id="sales">
            <div className={styles.panelHeader}>
              <div>
                <p className={styles.eyebrow}>Sales workflow</p>
                <h3>Enterprise launch queue</h3>
              </div>
              <span className={styles.quietBadge}>Preflight</span>
            </div>
            <div className={styles.queueList}>
              {workQueue.map((item, index) => (
                <div className={styles.queueItem} key={item}>
                  <span>{index + 1}</span>
                  <p>{item}</p>
                </div>
              ))}
            </div>
          </article>

          <article className={styles.panel} id="leaderboards">
            <div className={styles.panelHeader}>
              <div>
                <p className={styles.eyebrow}>Leaderboard preview</p>
                <h3>Store momentum</h3>
              </div>
            </div>
            <div className={styles.leaderboardRows}>
              {leaderboard.map((row, index) => (
                <div className={styles.leaderboardRow} key={row.name}>
                  <span className={styles.rank}>{index + 1}</span>
                  <strong>{row.name}</strong>
                  <span>{row.score}</span>
                  <em>{row.trend}</em>
                </div>
              ))}
            </div>
          </article>

          <article className={styles.panel} id="goals">
            <div className={styles.panelHeader}>
              <div>
                <p className={styles.eyebrow}>Readiness</p>
                <h3>Production surface</h3>
              </div>
            </div>
            <dl className={styles.readinessList}>
              <div>
                <dt>Web build</dt>
                <dd>Passing</dd>
              </div>
              <div>
                <dt>Database</dt>
                <dd>Azure PostgreSQL selected</dd>
              </div>
              <div>
                <dt>Auth</dt>
                <dd>Clerk pending</dd>
              </div>
              <div>
                <dt>Health route</dt>
                <dd>/api/health</dd>
              </div>
            </dl>
          </article>
        </section>
      </section>
    </main>
  );
}
