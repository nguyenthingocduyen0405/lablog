import { createSign, randomUUID } from "node:crypto";
import { createClient } from "../../../lib/supabase/server";

export const runtime = "nodejs";

const ROOM_NAME_PATTERN = /^[A-Za-z0-9_-]{8,200}$/;

function encodeJson(value: unknown) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function createJaasToken(input: { appId: string; keyId: string; privateKey: string; roomName: string; user: { id: string; name: string; email: string; moderator: boolean } }) {
  const now = Math.floor(Date.now() / 1000);
  const header = encodeJson({ alg: "RS256", kid: input.keyId, typ: "JWT" });
  const payload = encodeJson({
    aud: "jitsi",
    iss: "chat",
    sub: input.appId,
    room: input.roomName,
    nbf: now - 10,
    exp: now + 60 * 60 * 2,
    jti: randomUUID(),
    context: {
      room: { regex: false },
      features: { livestreaming: false, recording: false, transcription: false, "outbound-call": false },
      user: { id: input.user.id, name: input.user.name, email: input.user.email, moderator: input.user.moderator ? "true" : "false" },
    },
  });
  const unsignedToken = `${header}.${payload}`;
  const signature = createSign("RSA-SHA256").update(unsignedToken).end().sign(input.privateKey).toString("base64url");
  return `${unsignedToken}.${signature}`;
}

export async function POST(request: Request) {
  const appId = process.env.JAAS_APP_ID?.trim();
  const keyId = process.env.JAAS_API_KEY_ID?.trim();
  const privateKey = process.env.JAAS_PRIVATE_KEY?.replace(/\\n/g, "\n").trim();
  if (!appId || !keyId || !privateKey) {
    return Response.json({ error: "JaaS is not configured." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }

  let roomName = "";
  try {
    const body = await request.json() as { roomName?: unknown };
    roomName = typeof body.roomName === "string" ? body.roomName.trim() : "";
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (!ROOM_NAME_PATTERN.test(roomName)) return Response.json({ error: "Invalid room name." }, { status: 400 });

  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return Response.json({ error: "Authentication required." }, { status: 401 });

  const { data: meeting, error: meetingError } = await supabase.from("online_meetings")
    .select("creator_id,project_id,ended_at")
    .eq("room_name", roomName)
    .maybeSingle();
  if (meetingError) return Response.json({ error: "Meeting lookup failed." }, { status: 500 });
  if (!meeting || meeting.ended_at) return Response.json({ error: "Meeting is not active." }, { status: 404 });

  let isAcceptedMember = meeting.creator_id === authData.user.id;
  let isModerator = meeting.creator_id === authData.user.id;
  if (meeting.project_id) {
    const { data: membership, error: membershipError } = await supabase.from("team_project_members")
      .select("role,status")
      .eq("project_id", meeting.project_id)
      .eq("user_id", authData.user.id)
      .maybeSingle();
    if (membershipError) return Response.json({ error: "Project membership lookup failed." }, { status: 500 });
    isAcceptedMember = membership?.status === "accepted";
    isModerator = isAcceptedMember && membership?.role === "host";
  }
  if (!isAcceptedMember) return Response.json({ error: "Only accepted project members can join this meeting." }, { status: 403 });

  const metadata = authData.user.user_metadata as { name?: unknown } | undefined;
  const name = typeof metadata?.name === "string" && metadata.name.trim() ? metadata.name.trim() : authData.user.email?.split("@")[0] || "Lab member";
  try {
    const jwt = createJaasToken({ appId, keyId, privateKey, roomName, user: { id: authData.user.id, name, email: authData.user.email ?? "", moderator: isModerator } });
    return Response.json({ jwt, domain: "8x8.vc", appId, roomName: `${appId}/${roomName}` }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "JaaS token signing failed. Check the configured private key." }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}