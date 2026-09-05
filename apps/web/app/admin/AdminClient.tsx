"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import styles from "./admin.module.css";

type OrganizationStatus = "trial" | "active" | "suspended" | "archived";
type StoreStatus = "active" | "inactive";
type UserStatus = "invited" | "active" | "disabled";

type Organization = {
  id: string;
  name: string;
  slug: string;
  status: OrganizationStatus;
  timezone: string;
};

type Store = {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  status: StoreStatus;
  timezone: string;
  getReadyToEmails?: string;
  getReadyCcEmails?: string;
};

type User = {
  id: string;
  organizationId: string;
  email: string;
  displayName: string;
  status: UserStatus;
};

type OrganizationForm = Pick<Organization, "name" | "slug" | "status" | "timezone">;
type StoreForm = Pick<Store, "name" | "code" | "status" | "timezone" | "getReadyToEmails" | "getReadyCcEmails">;
type UserForm = Pick<User, "displayName" | "email" | "status"> & { password: string };

const defaultTimezone = "America/New_York";
const emptyOrganization: OrganizationForm = { name: "", slug: "", status: "trial", timezone: defaultTimezone };
const emptyStore: StoreForm = { name: "", code: "", status: "active", timezone: defaultTimezone, getReadyToEmails: "", getReadyCcEmails: "" };
const emptyUser: UserForm = { displayName: "", email: "", password: "", status: "active" };

async function readJson<T>(response: Response): Promise<T> {
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message ?? "Request failed.");
  }

  return data;
}

function statusLabel(status: string) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function organizationToForm(organization?: Organization): OrganizationForm {
  return organization
    ? { name: organization.name, slug: organization.slug, status: organization.status, timezone: organization.timezone }
    : emptyOrganization;
}

function storeToForm(store?: Store): StoreForm {
  return store ? { name: store.name, code: store.code, status: store.status, timezone: store.timezone, getReadyToEmails: store.getReadyToEmails ?? "", getReadyCcEmails: store.getReadyCcEmails ?? "" } : emptyStore;
}

function userToForm(user?: User): UserForm {
  return user ? { displayName: user.displayName, email: user.email, password: "", status: user.status } : emptyUser;
}

export default function AdminClient() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState("");
  const [selectedStoreId, setSelectedStoreId] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [organizationForm, setOrganizationForm] = useState<OrganizationForm>(emptyOrganization);
  const [storeForm, setStoreForm] = useState<StoreForm>(emptyStore);
  const [userForm, setUserForm] = useState<UserForm>(emptyUser);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("Load or create a dealer group to begin setup.");
  const [signedInUser, setSignedInUser] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const selectedOrganization = useMemo(
    () => organizations.find((organization) => organization.id === selectedOrganizationId),
    [organizations, selectedOrganizationId]
  );
  const selectedStore = useMemo(() => stores.find((store) => store.id === selectedStoreId), [selectedStoreId, stores]);
  const selectedUser = useMemo(() => users.find((user) => user.id === selectedUserId), [selectedUserId, users]);

  const filteredOrganizations = useMemo(() => {
    const query = search.toLowerCase();
    return organizations.filter((organization) =>
      [organization.name, organization.slug, organization.status].some((value) => value.toLowerCase().includes(query))
    );
  }, [organizations, search]);

  const filteredStores = useMemo(() => {
    const query = search.toLowerCase();
    return stores.filter((store) => [store.name, store.code, store.status].some((value) => value.toLowerCase().includes(query)));
  }, [search, stores]);

  const filteredUsers = useMemo(() => {
    const query = search.toLowerCase();
    return users.filter((user) =>
      [user.displayName, user.email, user.status].some((value) => value.toLowerCase().includes(query))
    );
  }, [search, users]);

  const activeStores = stores.filter((store) => store.status === "active").length;
  const activeUsers = users.filter((user) => user.status === "active").length;

  useEffect(() => {
    setSelectedOrganizationId(localStorage.getItem("chipboard.organizationId") ?? "");
    setSelectedStoreId(localStorage.getItem("chipboard.storeId") ?? "");
    setSelectedUserId(localStorage.getItem("chipboard.actorUserId") ?? "");
    void fetch("/api/auth/session")
      .then((response) => response.json())
      .then((data) => {
        if (data.session) {
          setSignedInUser(data.session.displayName);
          setSelectedOrganizationId(data.session.organizationId);
          setSelectedUserId(data.session.userId);
        }
      })
      .catch(() => undefined);
    void loadOrganizations();
  }, []);

  useEffect(() => {
    setOrganizationForm(organizationToForm(selectedOrganization));
    if (selectedOrganizationId) {
      localStorage.setItem("chipboard.organizationId", selectedOrganizationId);
      void loadStoresAndUsers(selectedOrganizationId);
    } else {
      setStores([]);
      setUsers([]);
      setSelectedStoreId("");
      setSelectedUserId("");
    }
  }, [selectedOrganization, selectedOrganizationId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setStoreForm(storeToForm(selectedStore));
    localStorage.setItem("chipboard.storeId", selectedStoreId);
  }, [selectedStore, selectedStoreId]);

  useEffect(() => {
    setUserForm(userToForm(selectedUser));
    localStorage.setItem("chipboard.actorUserId", selectedUserId);
  }, [selectedUser, selectedUserId]);

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
      setSelectedStoreId((current) => (nextStores.some((store) => store.id === current) ? current : ""));
      setSelectedUserId((current) => (nextUsers.some((user) => user.id === current) ? current : ""));
      setMessage(`Loaded ${nextStores.length} store${nextStores.length === 1 ? "" : "s"} and ${nextUsers.length} user${nextUsers.length === 1 ? "" : "s"}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load setup records.");
    } finally {
      setIsLoading(false);
    }
  }

  async function saveOrganization(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    try {
      const organization = await readJson<Organization>(await fetch("/api/admin/organizations", {
        method: selectedOrganization ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedOrganization?.id, ...organizationForm }),
      }));

      await loadOrganizations();
      setSelectedOrganizationId(organization.id);
      setMessage(`${selectedOrganization ? "Updated" : "Created"} dealer group ${organization.name}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save dealer group.");
    } finally {
      setIsLoading(false);
    }
  }

  async function saveStore(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedOrganizationId) {
      setMessage("Select a dealer group before saving a store.");
      return;
    }

    setIsLoading(true);
    try {
      const store = await readJson<Store>(await fetch("/api/admin/stores", {
        method: selectedStore ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          "x-chipboard-organization-id": selectedOrganizationId,
        },
        body: JSON.stringify({ id: selectedStore?.id, ...storeForm }),
      }));

      await loadStoresAndUsers(selectedOrganizationId);
      setSelectedStoreId(store.id);
      setMessage(`${selectedStore ? "Updated" : "Created"} store ${store.name}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save store.");
    } finally {
      setIsLoading(false);
    }
  }

  async function saveUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedOrganizationId) {
      setMessage("Select a dealer group before saving a user.");
      return;
    }

    setIsLoading(true);
    try {
      const user = await readJson<User>(await fetch("/api/admin/users", {
        method: selectedUser ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          "x-chipboard-organization-id": selectedOrganizationId,
        },
        body: JSON.stringify({ id: selectedUser?.id, ...userForm }),
      }));

      await loadStoresAndUsers(selectedOrganizationId);
      setSelectedUserId(user.id);
      setMessage(`${selectedUser ? "Updated" : "Created"} user ${user.displayName}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save user.");
    } finally {
      setIsLoading(false);
    }
  }

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    setSignedInUser("");
    setMessage("Signed out.");
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Chipboard Enterprise</p>
          <h1>Admin</h1>
        </div>
        <nav className={styles.actions} aria-label="Admin navigation">
          {signedInUser ? <span>Signed in as {signedInUser}</span> : <Link href="/login">Sign in</Link>}
          {signedInUser && <button type="button" onClick={signOut}>Sign out</button>}
          <Link href="/sales">Sales</Link>
          <Link href="/">Overview</Link>
        </nav>
      </header>

      <section className={styles.heroGrid}>
        <article className={styles.summaryPanel}>
          <p className={styles.eyebrow}>Current context</p>
          <h2>{selectedOrganization?.name ?? "No dealer group selected"}</h2>
          <dl>
            <div><dt>Store</dt><dd>{selectedStore?.name ?? "All stores"}</dd></div>
            <div><dt>Acting user</dt><dd>{selectedUser?.displayName ?? "None selected"}</dd></div>
            <div><dt>Timezone</dt><dd>{selectedOrganization?.timezone ?? defaultTimezone}</dd></div>
          </dl>
        </article>
        <article className={styles.metricCard}><span>Dealer groups</span><strong>{organizations.length}</strong><p>{organizations.filter((organization) => organization.status === "active").length} active</p></article>
        <article className={styles.metricCard}><span>Stores</span><strong>{stores.length}</strong><p>{activeStores} active rooftops</p></article>
        <article className={styles.metricCard}><span>Users</span><strong>{users.length}</strong><p>{activeUsers} can sign in</p></article>
      </section>

      <section className={styles.statusBar}>
        <span>{message}</span>
        <div>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search admin records" aria-label="Search admin records" />
          <button type="button" onClick={() => { void loadOrganizations(); if (selectedOrganizationId) void loadStoresAndUsers(selectedOrganizationId); }} disabled={isLoading}>Refresh</button>
        </div>
      </section>

      <section className={styles.workspaceGrid}>
        <article className={styles.panel}>
          <div className={styles.panelHeader}>
            <div><p className={styles.eyebrow}>Tenant</p><h2>Dealer groups</h2></div>
            <button type="button" onClick={() => { setSelectedOrganizationId(""); setOrganizationForm(emptyOrganization); }}>New</button>
          </div>
          <form className={styles.form} onSubmit={saveOrganization}>
            <label>Name<input value={organizationForm.name} onChange={(event) => setOrganizationForm({ ...organizationForm, name: event.target.value })} placeholder="Demo Dealer Group" required /></label>
            <label>Slug<input value={organizationForm.slug} onChange={(event) => setOrganizationForm({ ...organizationForm, slug: event.target.value })} placeholder="demo-dealer-group" /></label>
            <label>Status<select value={organizationForm.status} onChange={(event) => setOrganizationForm({ ...organizationForm, status: event.target.value as OrganizationStatus })}><option value="trial">Trial</option><option value="active">Active</option><option value="suspended">Suspended</option><option value="archived">Archived</option></select></label>
            <label>Timezone<input value={organizationForm.timezone} onChange={(event) => setOrganizationForm({ ...organizationForm, timezone: event.target.value })} required /></label>
            <button className={styles.primaryButton} type="submit" disabled={isLoading}>{selectedOrganization ? "Save group" : "Create group"}</button>
          </form>
          <div className={styles.list}>
            {filteredOrganizations.map((organization) => (
              <button type="button" className={organization.id === selectedOrganizationId ? styles.selectedRow : styles.rowButton} onClick={() => setSelectedOrganizationId(organization.id)} key={organization.id}>
                <strong>{organization.name}</strong><span>{organization.slug}</span><em>{statusLabel(organization.status)}</em>
              </button>
            ))}
          </div>
        </article>

        <article className={styles.panel}>
          <div className={styles.panelHeader}>
            <div><p className={styles.eyebrow}>Rooftops</p><h2>Stores</h2></div>
            <button type="button" onClick={() => { setSelectedStoreId(""); setStoreForm(emptyStore); }} disabled={!selectedOrganizationId}>New</button>
          </div>
          <form className={styles.form} onSubmit={saveStore}>
            <label>Name<input value={storeForm.name} onChange={(event) => setStoreForm({ ...storeForm, name: event.target.value })} placeholder="BMW North" required /></label>
            <label>Code<input value={storeForm.code} onChange={(event) => setStoreForm({ ...storeForm, code: event.target.value })} placeholder="BMW-N" required /></label>
            <label>Status<select value={storeForm.status} onChange={(event) => setStoreForm({ ...storeForm, status: event.target.value as StoreStatus })}><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
            <label>Timezone<input value={storeForm.timezone} onChange={(event) => setStoreForm({ ...storeForm, timezone: event.target.value })} required /></label>
            <label>Get Ready To<textarea value={storeForm.getReadyToEmails ?? ""} onChange={(event) => setStoreForm({ ...storeForm, getReadyToEmails: event.target.value })} placeholder="prep@example.com, detail@example.com" rows={2} /></label>
            <label>Get Ready CC<textarea value={storeForm.getReadyCcEmails ?? ""} onChange={(event) => setStoreForm({ ...storeForm, getReadyCcEmails: event.target.value })} placeholder="manager@example.com" rows={2} /></label>
            <button className={styles.primaryButton} type="submit" disabled={isLoading || !selectedOrganizationId}>{selectedStore ? "Save store" : "Create store"}</button>
          </form>
          <div className={styles.list}>
            {filteredStores.map((store) => (
              <button type="button" className={store.id === selectedStoreId ? styles.selectedRow : styles.rowButton} onClick={() => setSelectedStoreId(store.id)} key={store.id}>
                <strong>{store.name}</strong><span>{store.code}</span><em>{statusLabel(store.status)}</em>
              </button>
            ))}
          </div>
        </article>

        <article className={styles.panel}>
          <div className={styles.panelHeader}>
            <div><p className={styles.eyebrow}>Access</p><h2>Users</h2></div>
            <button type="button" onClick={() => { setSelectedUserId(""); setUserForm(emptyUser); }} disabled={!selectedOrganizationId}>New</button>
          </div>
          <form className={styles.form} onSubmit={saveUser}>
            <label>Name<input value={userForm.displayName} onChange={(event) => setUserForm({ ...userForm, displayName: event.target.value })} placeholder="Taylor Smith" required /></label>
            <label>Email<input type="email" value={userForm.email} onChange={(event) => setUserForm({ ...userForm, email: event.target.value })} placeholder="taylor@example.com" required /></label>
            <label>Password<input type="password" value={userForm.password} onChange={(event) => setUserForm({ ...userForm, password: event.target.value })} placeholder={selectedUser ? "Leave blank to keep current" : "At least 8 characters"} required={!selectedUser} /></label>
            <label>Status<select value={userForm.status} onChange={(event) => setUserForm({ ...userForm, status: event.target.value as UserStatus })}><option value="invited">Invited</option><option value="active">Active</option><option value="disabled">Disabled</option></select></label>
            <button className={styles.primaryButton} type="submit" disabled={isLoading || !selectedOrganizationId}>{selectedUser ? "Save user" : "Create user"}</button>
          </form>
          <div className={styles.list}>
            {filteredUsers.map((user) => (
              <button type="button" className={user.id === selectedUserId ? styles.selectedRow : styles.rowButton} onClick={() => setSelectedUserId(user.id)} key={user.id}>
                <strong>{user.displayName}</strong><span>{user.email}</span><em>{statusLabel(user.status)}</em>
              </button>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}
