"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import styles from "./admin.module.css";

type Organization = {
  id: string;
  name: string;
  slug: string;
  status: string;
  timezone: string;
};

type Store = {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  status: string;
  timezone: string;
};

type User = {
  id: string;
  organizationId: string;
  email: string;
  displayName: string;
  status: string;
};

async function readJson<T>(response: Response): Promise<T> {
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message ?? "Request failed.");
  }

  return data;
}

export default function AdminClient() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState("");
  const [selectedStoreId, setSelectedStoreId] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [storeName, setStoreName] = useState("");
  const [storeCode, setStoreCode] = useState("");
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userPassword, setUserPassword] = useState("");
  const [message, setMessage] = useState("Load or create a dealer group to begin setup.");
  const [isLoading, setIsLoading] = useState(false);

  const selectedOrganization = useMemo(
    () => organizations.find((organization) => organization.id === selectedOrganizationId),
    [organizations, selectedOrganizationId]
  );
  const selectedStore = useMemo(() => stores.find((store) => store.id === selectedStoreId), [selectedStoreId, stores]);
  const selectedUser = useMemo(() => users.find((user) => user.id === selectedUserId), [selectedUserId, users]);

  useEffect(() => {
    setSelectedOrganizationId(localStorage.getItem("chipboard.organizationId") ?? "");
    setSelectedStoreId(localStorage.getItem("chipboard.storeId") ?? "");
    setSelectedUserId(localStorage.getItem("chipboard.actorUserId") ?? "");
    void loadOrganizations();
  }, []);

  useEffect(() => {
    if (selectedOrganizationId) {
      localStorage.setItem("chipboard.organizationId", selectedOrganizationId);
      void loadStoresAndUsers(selectedOrganizationId);
    }
  }, [selectedOrganizationId]);

  useEffect(() => {
    localStorage.setItem("chipboard.storeId", selectedStoreId);
  }, [selectedStoreId]);

  useEffect(() => {
    localStorage.setItem("chipboard.actorUserId", selectedUserId);
  }, [selectedUserId]);

  async function loadOrganizations() {
    setIsLoading(true);
    try {
      const data = await readJson<Organization[]>(await fetch("/api/admin/organizations"));
      setOrganizations(data);
      setMessage(`Loaded ${data.length} dealer group${data.length === 1 ? "" : "s"}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load dealer groups.");
    } finally {
      setIsLoading(false);
    }
  }

  async function loadStoresAndUsers(organizationId = selectedOrganizationId) {
    if (!organizationId) return;

    setIsLoading(true);
    try {
      const headers = { "x-chipboard-organization-id": organizationId };
      const [nextStores, nextUsers] = await Promise.all([
        readJson<Store[]>(await fetch("/api/admin/stores", { headers })),
        readJson<User[]>(await fetch("/api/admin/users", { headers })),
      ]);

      setStores(nextStores);
      setUsers(nextUsers);
      setMessage(`Loaded ${nextStores.length} store${nextStores.length === 1 ? "" : "s"} and ${nextUsers.length} user${nextUsers.length === 1 ? "" : "s"}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load setup records.");
    } finally {
      setIsLoading(false);
    }
  }

  async function createOrganization(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    try {
      const organization = await readJson<Organization>(await fetch("/api/admin/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: organizationName }),
      }));

      setOrganizationName("");
      await loadOrganizations();
      setSelectedOrganizationId(organization.id);
      setMessage(`Created dealer group ${organization.name}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to create dealer group.");
    } finally {
      setIsLoading(false);
    }
  }

  async function createStore(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedOrganizationId) {
      setMessage("Select a dealer group before creating a store.");
      return;
    }

    setIsLoading(true);
    try {
      const store = await readJson<Store>(await fetch("/api/admin/stores", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-chipboard-organization-id": selectedOrganizationId,
        },
        body: JSON.stringify({ name: storeName, code: storeCode }),
      }));

      setStoreName("");
      setStoreCode("");
      await loadStoresAndUsers(selectedOrganizationId);
      setSelectedStoreId(store.id);
      setMessage(`Created store ${store.name}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to create store.");
    } finally {
      setIsLoading(false);
    }
  }

  async function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedOrganizationId) {
      setMessage("Select a dealer group before creating a user.");
      return;
    }

    setIsLoading(true);
    try {
      const user = await readJson<User>(await fetch("/api/admin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-chipboard-organization-id": selectedOrganizationId,
        },
        body: JSON.stringify({ displayName: userName, email: userEmail, password: userPassword }),
      }));

      setUserName("");
      setUserEmail("");
      setUserPassword("");
      await loadStoresAndUsers(selectedOrganizationId);
      setSelectedUserId(user.id);
      setMessage(`Created user ${user.displayName}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to create user.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Setup</p>
          <h1>Admin</h1>
        </div>
        <nav className={styles.actions}>
          <a href="/">Overview</a>
          <a href="/sales">Sales</a>
        </nav>
      </header>

      <section className={styles.statusBar}>
        <span>{message}</span>
        <button type="button" onClick={() => loadOrganizations()} disabled={isLoading}>Refresh</button>
      </section>

      <section className={styles.grid}>
        <article className={styles.panel}>
          <h2>Dealer groups</h2>
          <form className={styles.form} onSubmit={createOrganization}>
            <label>Name<input value={organizationName} onChange={(event) => setOrganizationName(event.target.value)} placeholder="Demo Dealer Group" required /></label>
            <button type="submit" disabled={isLoading}>Create group</button>
          </form>
          <div className={styles.list}>
            {organizations.map((organization) => (
              <button
                type="button"
                className={organization.id === selectedOrganizationId ? styles.selectedRow : styles.rowButton}
                onClick={() => setSelectedOrganizationId(organization.id)}
                key={organization.id}
              >
                <strong>{organization.name}</strong>
                <span>{organization.slug}</span>
              </button>
            ))}
          </div>
        </article>

        <article className={styles.panel}>
          <h2>Stores</h2>
          <form className={styles.form} onSubmit={createStore}>
            <label>Name<input value={storeName} onChange={(event) => setStoreName(event.target.value)} placeholder="BMW North" required /></label>
            <label>Code<input value={storeCode} onChange={(event) => setStoreCode(event.target.value)} placeholder="BMW-N" required /></label>
            <button type="submit" disabled={isLoading || !selectedOrganizationId}>Create store</button>
          </form>
          <div className={styles.list}>
            {stores.map((store) => (
              <button
                type="button"
                className={store.id === selectedStoreId ? styles.selectedRow : styles.rowButton}
                onClick={() => setSelectedStoreId(store.id)}
                key={store.id}
              >
                <strong>{store.name}</strong>
                <span>{store.code}</span>
              </button>
            ))}
          </div>
        </article>

        <article className={styles.panel}>
          <h2>Users</h2>
          <form className={styles.form} onSubmit={createUser}>
            <label>Name<input value={userName} onChange={(event) => setUserName(event.target.value)} placeholder="Taylor Smith" required /></label>
            <label>Email<input type="email" value={userEmail} onChange={(event) => setUserEmail(event.target.value)} placeholder="taylor@example.com" required /></label>
            <label>Password<input type="password" value={userPassword} onChange={(event) => setUserPassword(event.target.value)} placeholder="At least 8 characters" required /></label>
            <button type="submit" disabled={isLoading || !selectedOrganizationId}>Create user</button>
          </form>
          <div className={styles.list}>
            {users.map((user) => (
              <button
                type="button"
                className={user.id === selectedUserId ? styles.selectedRow : styles.rowButton}
                onClick={() => setSelectedUserId(user.id)}
                key={user.id}
              >
                <strong>{user.displayName}</strong>
                <span>{user.email}</span>
              </button>
            ))}
          </div>
        </article>
      </section>

      <section className={styles.contextPanel}>
        <h2>Current app context</h2>
        <dl>
          <div><dt>Dealer group</dt><dd>{selectedOrganization?.name ?? "None selected"}</dd></div>
          <div><dt>Store</dt><dd>{selectedStore?.name ?? "All stores"}</dd></div>
          <div><dt>Acting user</dt><dd>{selectedUser?.displayName ?? "None selected"}</dd></div>
        </dl>
        <p>These selections are saved locally and reused by the Sales page until full sign-in sessions are added.</p>
      </section>
    </main>
  );
}

