import { buildLoginRedirect } from "@/lib/auth-navigation";
import {
  buildDiagnosisHandoffBrief,
  buildDiagnosisHandoffFilename,
} from "@/lib/diagnosis-handoff";
import { getAuthSession } from "@/lib/auth";
import { getInterviewSessionForUser } from "@/lib/interviews";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params;
  const url = new URL(request.url);
  const session = await getAuthSession();

  if (!session?.user?.id) {
    return Response.redirect(
      new URL(buildLoginRedirect(`${url.pathname}${url.search}`), request.url),
    );
  }

  const interview = await getInterviewSessionForUser(session.user.id, sessionId);

  if (!interview) {
    return new Response("Diagnosis not found.", { status: 404 });
  }

  if (interview.status !== "COMPLETED" || !interview.diagnosisRecord) {
    return new Response("Diagnosis is not ready for handoff.", { status: 409 });
  }

  const completedInterview = {
    ...interview,
    diagnosisRecord: interview.diagnosisRecord,
  };
  const isDownload = url.searchParams.get("download") === "1";
  const filename = buildDiagnosisHandoffFilename(completedInterview);
  const brief = buildDiagnosisHandoffBrief(completedInterview);

  return new Response(brief, {
    status: 200,
    headers: {
      "Cache-Control": "no-store",
      "Content-Disposition": `${isDownload ? "attachment" : "inline"}; filename="${filename}"`,
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
