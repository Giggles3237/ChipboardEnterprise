"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import styles from "./sales.module.css";

type Sale = {
  id: string;
  organizationId: string;
  storeId?: string;
  clientName: string;
  stockNumber: string;
  year?: number;
  make?: string;
  model?: string;
  color?: string;
  advisor?: string;
  deliveryStatus: "pending" | "delivered" | "cancelled";
  deliveryDate?: string;
  saleType?: string;
};

type SaleFormState = {
  clientName: string;
  stockNumber: string;
  year: string;
  make: string;
  model: string;
  color: string;
  advisor: string;
  delivered: boolean;
  deliveryDate: string;
  type: string;
};

const emptyForm: SaleFormState = {
  clientName: "",
  stockNumber: "",
  year: "",
  make: "",
  model: "",
  color: "",
  advisor: "",
  delivered: false,
  deliveryDate: "",
  type: "Retail",
};

const filterFields = [
  "stockNumber",
  "clientName",
  "year",
  "make",
  "model",
  "color",
  "advisor",
  "delivered",
  "deliveryDate",
  "type",
] as const;

type FilterField = (typeof filterFields)[number];
type Filters = Record<FilterField, string>;

const emptyFilters = filterFields.reduce((acc, field) => ({ ...acc, [field]: "" }), {} as Filters);

function displayDate(value?: string) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString();
}

function inputDate(value?: string) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

function properCase(value?: string) {
  if (!value) return "";
  if (value.toUpperCase().includes("BMW")) return "BMW";
  if (value.toUpperCase().includes("MINI")) return "MINI";
  return value
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function displayClientName(name?: string) {
  if (!name) return "";
  const parts = name.toLowerCase().split(" ").filter(Boolean);
  if (parts.length >= 2) {
    return `${properCase(parts[0])} ${parts[parts.length - 1]?.charAt(0).toUpperCase()}.`;
  }
  return properCase(name);
}

function stockDisplay(stock?: string) {
  if (!stock) return "";
  if (stock.toLowerCase().startsWith("incoming")) {
    return `Incoming${stock.slice(8).toUpperCase()}`;
  }
  return stock.toUpperCase();
}

function toForm(sale: Sale): SaleFormState {
  return {
    clientName: sale.clientName,
    stockNumber: sale.stockNumber,
    year: sale.year?.toString() ?? "",
    make: sale.make ?? "",
    model: sale.model ?? "",
    color: sale.color ?? "",
    advisor: sale.advisor ?? "",
    delivered: sale.deliveryStatus === "delivered",
    deliveryDate: inputDate(sale.deliveryDate),
    type: sale.saleType ?? "Retail",
  };
}

function toPayload(form: SaleFormState, storeId: string) {
  return {
    clientName: form.clientName.trim(),
    stockNumber: form.stockNumber.trim(),
    year: Number(form.year),
    make: form.make.trim(),
    model: form.model.trim(),
    color: form.color.trim() || undefined,
    advisor: form.advisor.trim() || undefined,
    delivered: form.delivered,
    deliveryDate: form.deliveryDate || undefined,
    type: form.type.trim() || "Retail",
    storeId: storeId || undefined,
  };
}

export default function SalesClient() {
  const [organizationId, setOrganizationId] = useState("");
  const [storeId, setStoreId] = useState("");
  const [actorUserId, setActorUserId] = useState("");
  const [sales, setSales] = useState<Sale[]>([]);
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [form, setForm] = useState<SaleFormState>(emptyForm);
  const [editingSaleId, setEditingSaleId] = useState<string | null>(null);
  const [message, setMessage] = useState("Sign in or enter a dealer group id, then load sales.");
  const [signedInUser, setSignedInUser] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setOrganizationId(localStorage.getItem("chipboard.organizationId") ?? "");
    setStoreId(localStorage.getItem("chipboard.storeId") ?? "");
    setActorUserId(localStorage.getItem("chipboard.actorUserId") ?? "");
    void fetch("/api/auth/session")
      .then((response) => response.json())
      .then((data) => {
        if (data.session) {
          setSignedInUser(data.session.displayName);
          setOrganizationId(data.session.organizationId);
          setActorUserId(data.session.userId);
          localStorage.setItem("chipboard.organizationId", data.session.organizationId);
          localStorage.setItem("chipboard.actorUserId", data.session.userId);
        }
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    localStorage.setItem("chipboard.organizationId", organizationId);
    localStorage.setItem("chipboard.storeId", storeId);
    localStorage.setItem("chipboard.actorUserId", actorUserId);
  }, [actorUserId, organizationId, storeId]);

  const headers = useMemo(() => {
    const nextHeaders: HeadersInit = {
      "Content-Type": "application/json",
    };

    if (organizationId) nextHeaders["x-chipboard-organization-id"] = organizationId;

    if (storeId) nextHeaders["x-chipboard-store-id"] = storeId;
    if (actorUserId) nextHeaders["x-chipboard-user-id"] = actorUserId;

    return nextHeaders;
  }, [actorUserId, organizationId, storeId]);

  const filteredSales = useMemo(() => {
    const filtered = sales.filter((sale) =>
      filterFields.every((field) => {
        const filter = filters[field].toLowerCase();
        if (!filter) return true;

        const value = field === "delivered"
          ? sale.deliveryStatus === "delivered" ? "yes" : "no"
          : field === "deliveryDate"
            ? displayDate(sale.deliveryDate)
            : field === "type"
              ? sale.saleType ?? ""
              : String(sale[field as keyof Sale] ?? "");

        return value.toLowerCase().includes(filter);
      })
    );

    return [
      ...filtered.filter((sale) => sale.saleType !== "Wholesale"),
      ...filtered.filter((sale) => sale.saleType === "Wholesale"),
    ];
  }, [filters, sales]);

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    setSignedInUser("");
    setMessage("Signed out.");
    window.location.href = "/login";
  }

  async function loadSales(pendingOnly = false) {
    if (!organizationId) {
      setMessage("Dealer group id is required before loading sales.");
      return;
    }

    setIsLoading(true);
    setMessage("Loading sales...");

    try {
      const response = await fetch(`/api/sales${pendingOnly ? "?pending=true" : ""}`, {
        headers,
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message ?? "Unable to load sales.");
      }

      setSales(data);
      setMessage(`Loaded ${data.length} sale${data.length === 1 ? "" : "s"}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load sales.");
    } finally {
      setIsLoading(false);
    }
  }

  async function submitSale(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!organizationId) {
      setMessage("Dealer group id is required before saving a sale.");
      return;
    }

    setIsLoading(true);
    setMessage(editingSaleId ? "Updating sale..." : "Adding sale...");

    try {
      const response = await fetch(editingSaleId ? `/api/sales/${editingSaleId}` : "/api/sales", {
        method: editingSaleId ? "PUT" : "POST",
        headers,
        body: JSON.stringify(toPayload(form, storeId)),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message ?? "Unable to save sale.");
      }

      setForm(emptyForm);
      setEditingSaleId(null);
      await loadSales(false);
      setMessage(editingSaleId ? "Sale updated." : "Sale added.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save sale.");
    } finally {
      setIsLoading(false);
    }
  }

  async function deleteSale(sale: Sale) {
    if (!confirm(`Delete sale for ${sale.clientName}?`)) return;

    setIsLoading(true);
    setMessage("Deleting sale...");

    try {
      const response = await fetch(`/api/sales/${sale.id}`, {
        method: "DELETE",
        headers,
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message ?? "Unable to delete sale.");
      }

      await loadSales(false);
      setMessage("Sale deleted.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to delete sale.");
    } finally {
      setIsLoading(false);
    }
  }

  function exportCsv() {
    const rows = filteredSales.map((sale) => [
      stockDisplay(sale.stockNumber),
      displayClientName(sale.clientName),
      sale.year ?? "",
      properCase(sale.make),
      properCase(sale.model),
      properCase(sale.color),
      properCase(sale.advisor),
      sale.deliveryStatus === "delivered" ? "Yes" : "No",
      displayDate(sale.deliveryDate),
      sale.saleType ?? "",
    ]);
    const csv = [
      ["Stock Number", "Client Name", "Year", "Make", "Model", "Color", "Advisor", "Delivered", "Delivery Date", "Type"],
      ...rows,
    ]
      .map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `sales_export_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Chipboard Enterprise</p>
          <h1>Sales</h1>
        </div>
        <div className={styles.headerActions}>
          {signedInUser ? <span>Signed in as {signedInUser}</span> : <a className={styles.backLink} href="/login">Sign in</a>}
          {signedInUser && <button type="button" onClick={signOut}>Sign out</button>}
          <a className={styles.backLink} href="/admin">Admin</a>
          <a className={styles.backLink} href="/">Overview</a>
        </div>
      </header>

      <section className={styles.contextBar} aria-label="Dealer group context">
        <label>
          Dealer group id
          <input value={organizationId} onChange={(event) => setOrganizationId(event.target.value)} placeholder="organization uuid" />
        </label>
        <label>
          Store id
          <input value={storeId} onChange={(event) => setStoreId(event.target.value)} placeholder="optional store uuid" />
        </label>
        <label>
          Acting user id
          <input value={actorUserId} onChange={(event) => setActorUserId(event.target.value)} placeholder="optional user uuid" />
        </label>
        <button type="button" onClick={() => loadSales(false)} disabled={isLoading}>Load all</button>
        <button type="button" onClick={() => loadSales(true)} disabled={isLoading}>Pending</button>
      </section>

      <section className={styles.statusBar}>
        <span>{message}</span>
        <span>{filteredSales.filter((sale) => sale.saleType !== "Wholesale").length} retail / {filteredSales.filter((sale) => sale.saleType === "Wholesale").length} wholesale</span>
      </section>

      <section className={styles.formPanel}>
        <div className={styles.panelHeading}>
          <h2>{editingSaleId ? "Edit sale" : "Add sale"}</h2>
          {editingSaleId && <button type="button" onClick={() => { setEditingSaleId(null); setForm(emptyForm); }}>Cancel edit</button>}
        </div>
        <form className={styles.saleForm} onSubmit={submitSale}>
          <label>Client name<input required value={form.clientName} onChange={(event) => setForm({ ...form, clientName: event.target.value })} /></label>
          <label>Stock number<input required value={form.stockNumber} onChange={(event) => setForm({ ...form, stockNumber: event.target.value })} /></label>
          <label>Year<input required inputMode="numeric" value={form.year} onChange={(event) => setForm({ ...form, year: event.target.value })} /></label>
          <label>Make<input required value={form.make} onChange={(event) => setForm({ ...form, make: event.target.value })} /></label>
          <label>Model<input required value={form.model} onChange={(event) => setForm({ ...form, model: event.target.value })} /></label>
          <label>Color<input value={form.color} onChange={(event) => setForm({ ...form, color: event.target.value })} /></label>
          <label>Advisor<input value={form.advisor} onChange={(event) => setForm({ ...form, advisor: event.target.value })} /></label>
          <label>Delivery date<input type="date" value={form.deliveryDate} onChange={(event) => setForm({ ...form, deliveryDate: event.target.value })} /></label>
          <label>Type<select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}><option>Retail</option><option>Lease</option><option>Wholesale</option><option>Fleet</option></select></label>
          <label className={styles.checkLabel}><input type="checkbox" checked={form.delivered} onChange={(event) => setForm({ ...form, delivered: event.target.checked })} /> Delivered</label>
          <button className={styles.primaryButton} type="submit" disabled={isLoading}>{editingSaleId ? "Save changes" : "Add sale"}</button>
        </form>
      </section>

      <section className={styles.tablePanel}>
        <div className={styles.panelHeading}>
          <h2>Sales table</h2>
          <button type="button" onClick={exportCsv} disabled={filteredSales.length === 0}>Export CSV</button>
        </div>
        <div className={styles.tableScroller}>
          <table className={styles.salesTable}>
            <thead>
              <tr>
                {filterFields.map((field) => <th key={field}>{field}<input value={filters[field]} onChange={(event) => setFilters({ ...filters, [field]: event.target.value })} placeholder="Filter" /></th>)}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSales.map((sale) => (
                <tr key={sale.id} className={sale.saleType === "Wholesale" ? styles.wholesaleRow : undefined}>
                  <td>{stockDisplay(sale.stockNumber)}</td>
                  <td>{displayClientName(sale.clientName)}</td>
                  <td>{sale.year}</td>
                  <td>{properCase(sale.make)}</td>
                  <td>{properCase(sale.model)}</td>
                  <td>{properCase(sale.color)}</td>
                  <td>{properCase(sale.advisor)}</td>
                  <td><span className={sale.deliveryStatus === "delivered" ? styles.delivered : styles.pending}>{sale.deliveryStatus === "delivered" ? "Yes" : "No"}</span></td>
                  <td>{displayDate(sale.deliveryDate)}</td>
                  <td>{sale.saleType}</td>
                  <td className={styles.actions}><button type="button" onClick={() => { setEditingSaleId(sale.id); setForm(toForm(sale)); }}>Edit</button><button type="button" onClick={() => deleteSale(sale)}>Delete</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}



