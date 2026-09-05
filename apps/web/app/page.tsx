import Image from "next/image";

import AuthStatus from "./components/AuthStatus";
import styles from "./page.module.css";

export default function Home() {
  const navItems = [
    { label: "Overview", href: "/" },
    { label: "Sales", href: "/sales" },
    { label: "Leaderboards", href: "#leaderboards" },
    { label: "Goals", href: "#goals" },
    { label: "Admin", href: "/admin" },
  ];

  const metrics = [
    { label: "Today sales", value: "42", detail: "BMW/MINI of Pittsburgh" },
    { label: "Active goals", value: "18", detail: "7 ahead of pace" },
    { label: "Store online", value: "1/1", detail: "Live sync ready" },
  ];

  const workQueue = [
    "Import BMW/MINI of Pittsburgh users into the enterprise tenant",
    "Import Classic sales history into PostgreSQL",
    "Compare migrated totals against Classic Chipboard",
    "Protect admin with role-based access before production cutover",
  ];

  const leaderboard = [
    { name: "BMW Sales", score: "128", trend: "+14" },
    { name: "MINI Sales", score: "116", trend: "+9" },
    { name: "Finance", score: "104", trend: "+6" },
    { name: "Delivery", score: "97", trend: "+3" },
  ];

  return (
    <main className={styles.shell}>
      <aside className={styles.sidebar} aria-label="Workspace navigation">
        <div className={styles.brandBlock}>
          <div className={styles.brandMark} aria-hidden="true">
            <Image src="/assets/images/logo.png" alt="" width={40} height={40} priority />
          </div>
          <div>
            <p className={styles.eyebrow}>Enterprise</p>
            <h1>Chipboard</h1>
          </div>
        </div>
        <nav className={styles.navList}>
          {navItems.map((item) => (
            <a
              className={item.label === "Overview" ? `${styles.navItem} ${styles.active}` : styles.navItem}
              href={item.href}
              key={item.label}
            >
              {item.label}
            </a>
          ))}
        </nav>
        <div className={styles.tenantPanel}>
          <p className={styles.eyebrow}>Organization</p>
          <strong>BMW/MINI of Pittsburgh</strong>
          <span>Chipboard tenant - Eastern time</span>
        </div>
      </aside>

      <section className={styles.workspace}>
        <header className={styles.topbar}>
          <div>
            <p className={styles.eyebrow}>Operations command center</p>
            <h2>BMW/MINI of Pittsburgh workspace</h2>
          </div>
          <div className={styles.topbarActions}>
            <AuthStatus />
            <div className={styles.statusPill}>Migration ready</div>
          </div>
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
                <dd>Azure PostgreSQL connected</dd>
              </div>
              <div>
                <dt>Tenant</dt>
                <dd>BMW/MINI of Pittsburgh</dd>
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


