import { buildLoginRedirect, resolveRequestOrigin } from "@/lib/auth-navigation";
import {
  buildHistoryExportCsv,
  buildHistoryExportFilename,
} from "@/lib/history-export";
import { filterInterviewSessions, parseHistoryFilters } from "@/lib/history-filters";
import { getAuthSession } from "@/lib/auth";
import { listInterviewSessionsForUser } from "@/lib/interviews";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const session = await getAuthSession();

  if (!session?.user?.id) {
    return Response.redirect(
      new URL(
        buildLoginRedirect(`${url.pathname}${url.search}`),
        resolveRequestOrigin(request),
      ),
    );
  }

  const filters = parseHistoryFilters(
    Object.fromEntries(url.searchParams.entries()),
  );
  const interviews = await listInterviewSessionsForUser(session.user.id);
  const filteredInterviews = filterInterviewSessions(interviews, filters);
  const csv = buildHistoryExportCsv(filteredInterviews);

  return new Response(csv, {
    status: 200,
    headers: {
      "Cache-Control": "no-store",
      "Content-Disposition": `attachment; filename="${buildHistoryExportFilename(new Date())}"`,
      "Content-Type": "text/csv; charset=utf-8",
    },
  });
}
