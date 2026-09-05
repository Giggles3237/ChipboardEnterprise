"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
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

type Store = {
  id: string;
  name: string;
  status?: string;
  getReadyToEmails?: string;
  getReadyCcEmails?: string;
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

type GetReadyFormState = {
  location: string;
  miles: string;
  instructions: string[];
  comments: string;
  salespersonEmail: string;
  getReadyDate: string;
  promiseTime: string;
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

const getReadyInstructionOptions = [
  "Fuel",
  "Fluff",
  "CPO",
  "Check for Retail",
  "PDI",
  "Safety Check",
  "State and Emissions",
  "Cilajet",
  "Body Estimate",
  "Wholesale - Check for recalls",
  "Maintenance",
  "Prep for PPF",
  "Other",
];

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

function currentMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  return {
    from: start.toISOString().slice(0, 10),
    to: end.toISOString().slice(0, 10),
  };
}

function isInDateRange(value: string | undefined, from: string, to: string) {
  if (!from && !to) return true;
  if (!value) return false;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;

  const saleDate = date.toISOString().slice(0, 10);
  return (!from || saleDate >= from) && (!to || saleDate <= to);
}

function displayDate(value?: string) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString();
}

function inputDate(value?: string) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

function getDayBefore(value?: string) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return inputDate(new Date().toISOString());
  date.setDate(date.getDate() - 1);
  return date.toISOString().slice(0, 10);
}

function getReadyRecipients(value?: string) {
  return (value ?? "").split(/[;,]/).map((email) => email.trim()).filter(Boolean);
}

function emptyGetReadyForm(sale?: Sale): GetReadyFormState {
  return {
    location: "annex",
    miles: "",
    instructions: [],
    comments: "",
    salespersonEmail: "",
    getReadyDate: getDayBefore(sale?.deliveryDate),
    promiseTime: "14:00",
  };
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
  const [stores, setStores] = useState<Store[]>([]);
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [dateRange, setDateRange] = useState(currentMonthRange);
  const [form, setForm] = useState<SaleFormState>(emptyForm);
  const [editingSaleId, setEditingSaleId] = useState<string | null>(null);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [showGetReady, setShowGetReady] = useState(false);
  const [getReadyForm, setGetReadyForm] = useState<GetReadyFormState>(emptyGetReadyForm);
  const [message, setMessage] = useState("Sign in or enter a dealer group id, then load sales.");
  const [signedInUser, setSignedInUser] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const autoLoadedKey = useRef("");

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

  useEffect(() => {
    if (!organizationId) return;

    const controller = new AbortController();

    void fetch("/api/admin/stores", {
      headers: { "x-chipboard-organization-id": organizationId },
      signal: controller.signal,
    })
      .then((response) => response.ok ? response.json() : [])
      .then((rows: Store[]) => {
        const activeStores = rows.filter((store) => store.status !== "inactive");
        setStores(activeStores);

        const defaultStore = activeStores.length === 1 ? activeStores[0] : undefined;
        if (!storeId && defaultStore) {
          setStoreId(defaultStore.id);
        }
      })
      .catch(() => undefined);

    return () => controller.abort();
  }, [organizationId, storeId]);

  useEffect(() => {
    if (!organizationId) return;

    const loadKey = `${organizationId}:${storeId || "all"}`;
    if (autoLoadedKey.current === loadKey) return;
    autoLoadedKey.current = loadKey;
    void loadSales(false);
  }, [organizationId, storeId]); // eslint-disable-line react-hooks/exhaustive-deps

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
      isInDateRange(sale.deliveryDate, dateRange.from, dateRange.to) &&
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
  }, [dateRange.from, dateRange.to, filters, sales]);

  const selectedSaleStore = selectedSale ? stores.find((store) => store.id === (selectedSale.storeId ?? storeId)) : undefined;
  const selectedSaleGetReadyRecipients = getReadyRecipients(selectedSaleStore?.getReadyToEmails);

  const groupedSales = useMemo(() => {
    const groups = filteredSales.reduce<Record<string, Sale[]>>((acc, sale) => {
      const advisor = sale.advisor?.trim() || "Unassigned";
      acc[advisor] = acc[advisor] ?? [];
      acc[advisor].push(sale);
      return acc;
    }, {});

    return Object.entries(groups)
      .map(([advisor, advisorSales]) => ({
        advisor,
        sales: advisorSales,
        delivered: advisorSales.filter((sale) => sale.deliveryStatus === "delivered" && sale.saleType !== "Wholesale").length,
        pending: advisorSales.filter((sale) => sale.deliveryStatus !== "delivered" && sale.saleType !== "Wholesale").length,
      }))
      .sort((a, b) => {
        if (a.advisor.toLowerCase().includes("house")) return 1;
        if (b.advisor.toLowerCase().includes("house")) return -1;
        return b.delivered + b.pending - (a.delivered + a.pending) || a.advisor.localeCompare(b.advisor);
      });
  }, [filteredSales]);

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

  function openSalePopup(sale: Sale) {
    setSelectedSale(sale);
    setShowGetReady(false);
    setGetReadyForm(emptyGetReadyForm(sale));
  }

  function beginEditSale(sale: Sale) {
    setEditingSaleId(sale.id);
    setForm(toForm(sale));
    setSelectedSale(null);
    setShowGetReady(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function updateDeliveryStatus(sale: Sale, delivered: boolean) {
    setIsLoading(true);
    setMessage(delivered ? "Marking sale delivered..." : "Moving sale back to pending...");

    try {
      const response = await fetch(`/api/sales/${sale.id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ delivered }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message ?? "Unable to update sale.");
      }

      setSelectedSale(data);
      await loadSales(false);
      setMessage(delivered ? "Sale marked delivered." : "Sale moved back to pending.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update sale.");
    } finally {
      setIsLoading(false);
    }
  }

  async function submitGetReady() {
    if (!selectedSale) return;

    const saleStoreId = selectedSale.storeId ?? storeId;
    if (!saleStoreId) {
      setMessage("Select a store or assign this sale to a store before submitting Get Ready.");
      return;
    }

    setIsLoading(true);
    setMessage("Submitting Get Ready...");

    try {
      const response = await fetch("/api/getready/send-email", {
        method: "POST",
        headers,
        body: JSON.stringify({
          storeId: saleStoreId,
          getReadyId: selectedSale.stockNumber,
          customerName: selectedSale.clientName,
          salesperson: selectedSale.advisor,
          salespersonEmail: getReadyForm.salespersonEmail,
          submittedBy: signedInUser || actorUserId,
          year: selectedSale.year,
          make: selectedSale.make,
          modelName: selectedSale.model,
          color: selectedSale.color,
          vehicle: [selectedSale.year, selectedSale.make, selectedSale.model, selectedSale.color].filter(Boolean).join(" "),
          location: getReadyForm.location,
          miles: getReadyForm.miles,
          itemsNeeded: getReadyForm.instructions,
          additionalAction: "Check for Open Campaigns",
          comments: getReadyForm.comments,
          getReadyDate: getReadyForm.getReadyDate,
          promiseTime: getReadyForm.promiseTime,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message ?? "Unable to submit Get Ready.");
      }

      setShowGetReady(false);
      setMessage(data.integration?.ok === false ? data.integration.message : "Get Ready submitted.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to submit Get Ready.");
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
      setSelectedSale(null);
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
          {signedInUser ? <span>Signed in as {signedInUser}</span> : <Link className={styles.backLink} href="/login">Sign in</Link>}
          {signedInUser && <button type="button" onClick={signOut}>Sign out</button>}
          <Link className={styles.backLink} href="/admin">Admin</Link>
          <Link className={styles.backLink} href="/">Overview</Link>
        </div>
      </header>

      <section className={styles.contextBar} aria-label="Dealer group context">
        <label>
          Dealer group id
          <input value={organizationId} onChange={(event) => setOrganizationId(event.target.value)} placeholder="organization uuid" />
        </label>
        <label>
          Store
          {stores.length > 0 ? (
            <select value={storeId} onChange={(event) => setStoreId(event.target.value)}>
              <option value="">All stores</option>
              {stores.map((store) => <option key={store.id} value={store.id}>{store.name}</option>)}
            </select>
          ) : (
            <input value={storeId} onChange={(event) => setStoreId(event.target.value)} placeholder="optional store uuid" />
          )}
        </label>
        <label>
          Acting user id
          <input value={actorUserId} onChange={(event) => setActorUserId(event.target.value)} placeholder="optional user uuid" />
        </label>
        <label>
          From
          <input type="date" value={dateRange.from} onChange={(event) => setDateRange({ ...dateRange, from: event.target.value })} />
        </label>
        <label>
          To
          <input type="date" value={dateRange.to} onChange={(event) => setDateRange({ ...dateRange, to: event.target.value })} />
        </label>
        <button type="button" onClick={() => setDateRange(currentMonthRange())}>Current month</button>
        <button type="button" onClick={() => loadSales(false)} disabled={isLoading}>Load all</button>
        <button type="button" onClick={() => loadSales(true)} disabled={isLoading}>Pending</button>
      </section>

      <section className={styles.statusBar}>
        <span>{message}</span>
        <span>{dateRange.from || "Any"} - {dateRange.to || "Any"} · {storeId ? stores.find((store) => store.id === storeId)?.name ?? "Selected store" : "All stores"} · {filteredSales.filter((sale) => sale.saleType !== "Wholesale").length} retail / {filteredSales.filter((sale) => sale.saleType === "Wholesale").length} wholesale</span>
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

      <section className={styles.chipBoard} aria-label="Sales chip board">
        <div className={styles.boardTotals}>
          <strong>Totals</strong>
          <span>BMW/MINI {filteredSales.filter((sale) => sale.saleType !== "Wholesale").length}</span>
          <span>Wholesale {filteredSales.filter((sale) => sale.saleType === "Wholesale").length}</span>
        </div>
        {groupedSales.length === 0 ? (
          <p className={styles.emptyBoard}>Load sales or clear filters to show chips.</p>
        ) : groupedSales.map((group) => (
          <div className={styles.advisorSection} key={group.advisor}>
            <div className={styles.advisorHeading}>
              <h3>{properCase(group.advisor)}</h3>
              <span>{group.delivered} <small>({group.pending})</small></span>
            </div>
            <div className={styles.chips}>
              {group.sales.map((sale) => {
                const isDelivered = sale.deliveryStatus === "delivered";
                const type = sale.saleType ?? "";
                const chipClass = type === "Wholesale"
                  ? styles.wholesaleChip
                  : type.includes("MINI")
                    ? styles.miniChip
                    : type.includes("Used") || type.includes("CPO")
                      ? styles.usedChip
                      : styles.bmwChip;

                return (
                  <button
                    className={`${styles.saleChip} ${chipClass} ${isDelivered ? styles.chipDelivered : styles.chipPending}`}
                    key={sale.id}
                    title={`${stockDisplay(sale.stockNumber)} - ${properCase(sale.color)} ${sale.year ?? ""} ${properCase(sale.make)} ${properCase(sale.model)}`}
                    type="button"
                    onClick={() => openSalePopup(sale)}
                  >
                    {stockDisplay(sale.stockNumber)}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
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
                  <td className={styles.actions}><button type="button" onClick={() => openSalePopup(sale)}>View</button><button type="button" onClick={() => beginEditSale(sale)}>Edit</button><button type="button" onClick={() => deleteSale(sale)}>Delete</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      {selectedSale && (
        <div className={styles.modalOverlay} role="presentation" onMouseDown={() => setSelectedSale(null)}>
          <section className={styles.saleModal} role="dialog" aria-modal="true" aria-labelledby="sale-dialog-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <p className={styles.eyebrow}>Sale details</p>
                <h2 id="sale-dialog-title">{stockDisplay(selectedSale.stockNumber)}</h2>
              </div>
              <button type="button" aria-label="Close sale details" onClick={() => setSelectedSale(null)}>Close</button>
            </div>

            <div className={styles.saleSummary}>
              <strong>{displayClientName(selectedSale.clientName)}</strong>
              <span>{[selectedSale.year, properCase(selectedSale.make), properCase(selectedSale.model)].filter(Boolean).join(" ")}</span>
              <span>{properCase(selectedSale.color)}</span>
              <span>{properCase(selectedSale.advisor)}</span>
              <span>{displayDate(selectedSale.deliveryDate)}</span>
              <span className={selectedSale.deliveryStatus === "delivered" ? styles.delivered : styles.pending}>{selectedSale.deliveryStatus === "delivered" ? "Delivered" : "Pending"}</span>
            </div>

            <div className={styles.modalActions}>
              {selectedSale.deliveryStatus !== "delivered" && <button type="button" onClick={() => setShowGetReady((value) => !value)}>Get Ready</button>}
              {selectedSale.deliveryStatus !== "delivered" ? (
                <button type="button" onClick={() => updateDeliveryStatus(selectedSale, true)} disabled={isLoading}>Mark delivered</button>
              ) : (
                <button type="button" onClick={() => updateDeliveryStatus(selectedSale, false)} disabled={isLoading}>Move to pending</button>
              )}
              <button type="button" onClick={() => beginEditSale(selectedSale)}>Edit sale</button>
              <button type="button" onClick={() => deleteSale(selectedSale)} disabled={isLoading}>Delete</button>
            </div>

            {showGetReady && selectedSale.deliveryStatus !== "delivered" && (
              <div className={styles.getReadyPanel}>
                <div className={styles.getReadyGrid}>
                  <label>Location<input value={getReadyForm.location} onChange={(event) => setGetReadyForm({ ...getReadyForm, location: event.target.value })} /></label>
                  <label>Get Ready date<input type="date" value={getReadyForm.getReadyDate} onChange={(event) => setGetReadyForm({ ...getReadyForm, getReadyDate: event.target.value })} /></label>
                  <label>Promise time<input type="time" value={getReadyForm.promiseTime} onChange={(event) => setGetReadyForm({ ...getReadyForm, promiseTime: event.target.value })} /></label>
                  <label>Miles<input inputMode="numeric" value={getReadyForm.miles} onChange={(event) => setGetReadyForm({ ...getReadyForm, miles: event.target.value })} /></label>
                  <label>Salesperson email<input type="email" value={getReadyForm.salespersonEmail} onChange={(event) => setGetReadyForm({ ...getReadyForm, salespersonEmail: event.target.value })} /></label>
                </div>
                <p className={styles.configNote}>{selectedSaleGetReadyRecipients.length > 0 ? <>Configured recipients: {selectedSaleGetReadyRecipients.join(", ")}</> : <>Configure this store&apos;s Get Ready recipient in Admin before submitting.</>}</p>
                <fieldset className={styles.instructions}>
                  <legend>Instructions</legend>
                  {getReadyInstructionOptions.map((instruction) => (
                    <label key={instruction}>
                      <input
                        type="checkbox"
                        checked={getReadyForm.instructions.includes(instruction)}
                        onChange={() => setGetReadyForm((current) => ({
                          ...current,
                          instructions: current.instructions.includes(instruction)
                            ? current.instructions.filter((item) => item !== instruction)
                            : [...current.instructions, instruction],
                        }))}
                      />
                      {instruction}
                    </label>
                  ))}
                </fieldset>
                <label className={styles.comments}>Comments<textarea value={getReadyForm.comments} onChange={(event) => setGetReadyForm({ ...getReadyForm, comments: event.target.value })} rows={3} /></label>
                <div className={styles.modalActions}>
                  <button className={styles.primaryButton} type="button" onClick={submitGetReady} disabled={isLoading}>Submit Get Ready</button>
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </main>
  );
}



