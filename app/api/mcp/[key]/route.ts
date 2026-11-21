import { revalidatePath } from "next/cache";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { mcpKeyConfigured, mcpKeyMatches } from "@/lib/agent";
import { createMcpServer } from "@/lib/mcp-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Context = { params: Promise<{ key: string }> };

function json(status: number, message: string) {
  return Response.json(
    { jsonrpc: "2.0", error: { code: -32001, message }, id: null },
    { status },
  );
}

async function handle(request: Request, context: Context) {
  if (!mcpKeyConfigured()) {
    return json(503, "MCP is turned off. Set MCP_API_KEY (32+ characters) on the server.");
  }
  const { key } = await context.params;
  if (!mcpKeyMatches(key)) return json(404, "Not found.");

  // Stateless: a fresh server and transport per request, JSON responses
  // instead of SSE, so it runs cleanly on serverless functions.
  const server = createMcpServer();
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  await server.connect(transport);
  try {
    return await transport.handleRequest(request);
  } finally {
    if (request.method === "POST") revalidatePath("/", "layout");
  }
}

export const GET = handle;
export const POST = handle;
export const DELETE = handle;
