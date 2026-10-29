import { createRequest, listRequests } from "@/lib/data/requests";
import { requireUser } from "@/lib/guard";
import { parseBody, parseQuery, route } from "@/lib/http";
import { createRequestSchema, requestQuerySchema } from "@/lib/schemas";

export const GET = route(async (request) => {
  const user = await requireUser(request);
  const options = parseQuery(request, requestQuerySchema);
  const serverTime = new Date().toISOString();

  const requests = await listRequests(user, options);
  return Response.json({ requests, serverTime });
});

export const POST = route(async (request) => {
  const user = await requireUser(request);
  const { itemId, clientRequestId, applicantPhone, message } = await parseBody(
    request,
    createRequestSchema,
  );

  const { request: itemReq, created } = await createRequest(
    user,
    itemId,
    clientRequestId,
    applicantPhone,
    message,
  );

  return Response.json({ request: itemReq }, { status: created ? 201 : 200 });
});
