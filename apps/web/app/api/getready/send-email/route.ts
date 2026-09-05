import { and, eq } from "drizzle-orm";

import { adminTables, getDb } from "../../admin/db";
import { getTenantContext, jsonError } from "../../sales/context";

export const runtime = "nodejs";

type GetReadyInput = {
  storeId?: string;
  getReadyId?: string;
  customerName?: string;
  salesperson?: string;
  salespersonEmail?: string;
  submittedBy?: string;
  year?: number;
  make?: string;
  modelName?: string;
  color?: string;
  vehicle?: string;
  location?: string;
  miles?: string;
  itemsNeeded?: string[];
  additionalAction?: string;
  comments?: string;
  getReadyDate?: string;
  promiseTime?: string;
};

function parseEmails(value?: string | null) {
  return (value ?? "").split(/[;,]/).map((email) => email.trim()).filter(Boolean);
}

function buildDueDate(input: GetReadyInput) {
  if (!input.getReadyDate) return null;

  const normalizedTime = /^\d{2}:\d{2}$/.test(input.promiseTime ?? "") ? input.promiseTime : "14:00";
  const date = new Date(input.getReadyDate + "T" + normalizedTime + ":00");

  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function assertRequired(input: GetReadyInput) {
  const missing = ["storeId", "getReadyId", "customerName", "vehicle", "getReadyDate"].filter((field) => !input[field as keyof GetReadyInput]);

  if (missing.length > 0) {
    throw new Error("Missing required Get Ready fields: " + missing.join(", "));
  }
}

export async function POST(request: Request) {
  try {
    const context = await getTenantContext(request);
    const input = await request.json() as GetReadyInput;
    assertRequired(input);

    const [store] = await getDb()
      .select()
      .from(adminTables.stores)
      .where(and(eq(adminTables.stores.id, input.storeId as string), eq(adminTables.stores.organizationId, context.organizationId)))
      .limit(1);

    if (!store) {
      throw new Error("store not found.");
    }

    const recipientEmails = parseEmails(store.getReadyToEmails);
    const ccEmails = parseEmails(store.getReadyCcEmails);

    if (recipientEmails.length === 0) {
      throw new Error("Configure Get Ready recipients for this store before submitting.");
    }

    const integrationKey = process.env.GET_READY_INTEGRATION_KEY ?? process.env.BOPCHIPBOARD_API_KEY;
    const url = process.env.GET_READY_API_URL ?? "https://getready-ww41.onrender.com/api/integrations/bopchipboard/get-ready";

    if (!integrationKey) {
      return Response.json({
        message: "Get Ready integration key is not configured.",
        integration: { ok: false, message: "Get Ready integration key is not configured." },
      }, { status: 503 });
    }

    const payload = {
      store_id: store.id,
      store_name: store.name,
      recipient_emails: recipientEmails,
      cc_emails: ccEmails,
      stock_number: input.getReadyId,
      customer_name: input.customerName,
      salesperson: input.salesperson,
      salesperson_email: input.salespersonEmail,
      submitted_by: input.submittedBy,
      year: input.year,
      make: input.make,
      model: input.modelName,
      color: input.color,
      vehicle: input.vehicle,
      location: input.location,
      miles: input.miles,
      items_needed: input.itemsNeeded ?? [],
      additional_action: input.additionalAction,
      comments: input.comments,
      due_at: buildDueDate(input),
      promise_time: input.promiseTime,
      integration_source: "chipboard-enterprise",
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-integration-key": integrationKey,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return Response.json({
        message: data.message ?? "Get Ready submission failed.",
        integration: { ok: false, message: data.message ?? "Get Ready submission failed." },
      }, { status: response.status });
    }

    return Response.json({
      message: "Get Ready submitted successfully.",
      recipients: recipientEmails,
      cc: ccEmails,
      integration: { ok: true, vehicle: data.vehicle ?? null },
    });
  } catch (error) {
    return jsonError(error);
  }
}