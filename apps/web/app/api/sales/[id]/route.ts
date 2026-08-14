import { getTenantContext, jsonError } from "../context";
import { deleteSale, updateSale } from "../db";

export const runtime = "nodejs";

type RouteParams = {
  params: Promise<{
    id: string;
  }>;
};

export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const context = await getTenantContext(request);
    const input = await request.json();
    const sale = await updateSale(context, id, input);

    return Response.json(sale);
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const context = await getTenantContext(request);
    await deleteSale(context, id);

    return Response.json({ message: "Sale deleted successfully" });
  } catch (error) {
    return jsonError(error);
  }
}

