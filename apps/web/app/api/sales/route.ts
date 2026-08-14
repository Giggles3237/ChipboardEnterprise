import { getTenantContext, jsonError } from "./context";
import { createSale, listSales } from "./db";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const context = await getTenantContext(request);
    const url = new URL(request.url);
    const pendingOnly = url.searchParams.get("pending") === "true";
    const result = await listSales(context, pendingOnly);

    return Response.json(result, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const context = await getTenantContext(request);
    const input = await request.json();
    const sale = await createSale(context, input);

    return Response.json(sale, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}

