import { getReportsSummary, getStudentReport } from "@/lib/data/reports";
import { requireUser } from "@/lib/guard";
import { parseQuery, route } from "@/lib/http";
import { reportQuerySchema } from "@/lib/schemas";

export const GET = route(async (request) => {
  const user = await requireUser(request);

  if (user.role === "student") {
    const studentReport = await getStudentReport(user.uid);
    return Response.json({ studentReport, role: user.role });
  }

  const filter = parseQuery(request, reportQuerySchema);
  const summary = await getReportsSummary(filter);
  const studentReport = filter.userId ? await getStudentReport(filter.userId) : null;
  return Response.json({ summary, studentReport, role: user.role });
});
