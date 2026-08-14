export const runtime = "nodejs";

type HealthResponse = {
  ok: true;
  service: "chipboard-enterprise-web";
  version: string;
  checkedAt: string;
};

export function GET() {
  const payload: HealthResponse = {
    ok: true,
    service: "chipboard-enterprise-web",
    version: process.env.VERCEL_GIT_COMMIT_SHA ?? "local",
    checkedAt: new Date().toISOString(),
  };

  return Response.json(payload, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
