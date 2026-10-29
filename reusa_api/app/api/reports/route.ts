import { getReportsSummary } from "@/lib/data/reports";
import { assertRole, requireUser } from "@/lib/guard";
import { parseQuery, route } from "@/lib/http";
import { reportQuerySchema } from "@/lib/schemas";

export const GET = route(async (request) => {
  const user = await requireUser(request);
  assertRole(user, ["admin", "supervisor"]);
  const filter = parseQuery(request, reportQuerySchema);

  const summary = await getReportsSummary(filter);
  return Response.json({ summary });
});
