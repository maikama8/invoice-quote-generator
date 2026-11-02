import { healthcheck } from "@/server/books";

export async function GET() {
  try {
    return Response.json(await healthcheck());
  } catch {
    return Response.json({ status: "error" }, { status: 503 });
  }
}
