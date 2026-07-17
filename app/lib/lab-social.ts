import { createClient } from "./supabase/client";

export type LabMember = {
  id: string;
  name: string;
  initials: string;
  role: string;
  status: string;
  avatarBackground: string;
};

export const POST_STATUSES = [
  { value: "studying", label: "공부 중", emoji: "📚" },
  { value: "working", label: "진행 중", emoji: "🛠️" },
  { value: "experimenting", label: "실험 중", emoji: "🧪" },
  { value: "help", label: "도움 필요", emoji: "🆘" },
  { value: "completed", label: "완료", emoji: "✅" },
] as const;

export type PostStatus = (typeof POST_STATUSES)[number]["value"];

export function isPostStatus(value: string): value is PostStatus {
  return POST_STATUSES.some((status) => status.value === value);
}

export function getPostStatus(status: PostStatus) {
  return POST_STATUSES.find((item) => item.value === status) ?? POST_STATUSES[1];
}

export type DailyPost = {
  id: string;
  memberId: string;
  missionId: string | null;
  scoreAwarded: number;
  caption: string;
  status: PostStatus;
  createdAt: string;
  imageDataUrl?: string;
  background: string;
  emoji: string;
  reactions: PostReaction[];
  comments: PostComment[];
};

export type PostReaction = { userId: string; emoji: string };

export type PostComment = {
  id: string;
  userId: string;
  body: string;
  createdAt: string;
};

export type LabNotification = {
  id: string;
  type: "reaction" | "comment" | "streak_reminder" | "mission_reminder";
  emoji: string | null;
  commentPreview: string | null;
  postId: string | null;
  actorId: string | null;
  missionId: string | null;
  missionTitle: string | null;
  actorName: string;
  actorInitials: string;
  actorAvatarBackground: string;
  createdAt: string;
  readAt: string | null;
};

export type Mission = {
  id: string;
  userId: string;
  title: string;
  durationDays: number;
  pointsPerUpdate: number;
  startedOn: string;
  endsOn: string;
  active: boolean;
  createdAt: string;
};

function mapMission(row: Record<string, string | number | boolean>): Mission {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    title: String(row.title),
    durationDays: Number(row.duration_days),
    pointsPerUpdate: Number(row.points_per_update),
    startedOn: String(row.started_on),
    endsOn: String(row.ends_on),
    active: Boolean(row.active),
    createdAt: String(row.created_at),
  };
}

export async function loadLabMembers(): Promise<LabMember[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("profiles").select("id,name,role,status,initials,avatar_background").order("created_at");
  if (error) throw error;
  return (data ?? []).map((profile) => ({
    id: profile.id,
    name: profile.name,
    role: profile.role,
    status: profile.status,
    initials: profile.initials,
    avatarBackground: profile.avatar_background,
  }));
}

export async function createDailyPost(file: File, caption: string, status: PostStatus, memberId: string) {
  const supabase = createClient();
  const rawExtension = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const extension = rawExtension.replace(/[^a-z0-9]/g, "") || "jpg";
  const imagePath = `${memberId}/${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await supabase.storage.from("post-images").upload(imagePath, file, { contentType: file.type, upsert: false });
  if (uploadError) throw uploadError;

  const { data, error: postError } = await supabase.from("posts").insert({ user_id: memberId, caption, status, image_path: imagePath }).select("id,user_id,mission_id,score_awarded,caption,status,image_path,created_at").single();
  if (postError) {
    await supabase.storage.from("post-images").remove([imagePath]);
    throw postError;
  }
  const { data: publicImage } = supabase.storage.from("post-images").getPublicUrl(data.image_path);
  return {
    id: data.id,
    memberId: data.user_id,
    missionId: data.mission_id,
    scoreAwarded: data.score_awarded,
    caption: data.caption,
    status: data.status as PostStatus,
    createdAt: data.created_at,
    imageDataUrl: publicImage.publicUrl,
    background: "linear-gradient(145deg, #292524, #57534e)",
    emoji: "\u2728",
    reactions: [],
    comments: [],
  } satisfies DailyPost;
}

export async function loadDailyPosts(): Promise<DailyPost[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("posts").select("id,user_id,mission_id,score_awarded,caption,status,image_path,created_at").order("created_at", { ascending: false });
  if (error) throw error;
  const posts = data ?? [];
  if (posts.length === 0) return [];
  const postIds = posts.map((post) => post.id);
  const [{ data: reactionRows, error: reactionError }, { data: commentRows, error: commentError }] = await Promise.all([
    supabase.from("post_reactions").select("post_id,user_id,emoji").in("post_id", postIds),
    supabase.from("post_comments").select("id,post_id,user_id,body,created_at").in("post_id", postIds).order("created_at"),
  ]);
  const isMissingTable = (code?: string) => code === "PGRST205" || code === "42P01";
  if (reactionError && !isMissingTable(reactionError.code)) throw reactionError;
  if (commentError && !isMissingTable(commentError.code)) throw commentError;
  return posts.map((post) => {
    const { data: publicImage } = supabase.storage.from("post-images").getPublicUrl(post.image_path);
    return {
      id: post.id,
      memberId: post.user_id,
      missionId: post.mission_id,
      scoreAwarded: post.score_awarded ?? 0,
      caption: post.caption,
      status: (post.status ?? "working") as PostStatus,
      createdAt: post.created_at,
      imageDataUrl: publicImage.publicUrl,
      background: "linear-gradient(145deg, #292524, #57534e)",
      emoji: "\u2728",
      reactions: (reactionRows ?? []).filter((item) => item.post_id === post.id).map((item) => ({
        userId: item.user_id,
        emoji: item.emoji,
      })),
      comments: (commentRows ?? []).filter((item) => item.post_id === post.id).map((item) => ({
        id: item.id, userId: item.user_id, body: item.body, createdAt: item.created_at,
      })),
    };
  });
}

export function formatPostDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

export function seoulDateKey(value: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

export function hasMissionUpdateToday(posts: DailyPost[], missionId: string, now = new Date()) {
  const today = seoulDateKey(now);
  return posts.some((post) => post.missionId === missionId && seoulDateKey(new Date(post.createdAt)) === today);
}

export function countMissionUpdateDays(posts: DailyPost[], missionId: string) {
  return new Set(
    posts.filter((post) => post.missionId === missionId).map((post) => seoulDateKey(new Date(post.createdAt))),
  ).size;
}

export async function loadActiveMission(userId: string): Promise<Mission | null> {
  const supabase = createClient();
  const { data, error } = await supabase.from("missions")
    .select("id,user_id,title,duration_days,points_per_update,started_on,ends_on,active,created_at")
    .eq("user_id", userId)
    .eq("active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error && error.code !== "PGRST205") throw error;
  if (!data || String(data.ends_on) < seoulDateKey(new Date())) return null;
  return mapMission(data);
}

export function missionPointsForDuration(durationDays: number) {
  return Math.min(50, 5 + Math.ceil(durationDays / 7) * 5);
}

export async function setActiveMission(title: string, durationDays: number): Promise<Mission> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("set_my_mission", {
    mission_title: title,
    mission_duration: durationDays,
  });
  if (error) throw error;
  return mapMission(data);
}

function addDays(value: Date, days: number) {
  const result = new Date(value);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

export function hasPostedToday(posts: DailyPost[], memberId: string, now = new Date()) {
  const today = seoulDateKey(now);
  return posts.some((post) => post.memberId === memberId && seoulDateKey(new Date(post.createdAt)) === today);
}

export function calculateCurrentStreak(posts: DailyPost[], memberId: string, now = new Date()) {
  const activeDays = new Set(
    posts.filter((post) => post.memberId === memberId).map((post) => seoulDateKey(new Date(post.createdAt))),
  );
  let cursor = now;
  if (!activeDays.has(seoulDateKey(cursor))) cursor = addDays(cursor, -1);

  let streak = 0;
  while (activeDays.has(seoulDateKey(cursor))) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export async function setPostReaction(postId: string, userId: string, emoji: string | null) {
  const supabase = createClient();
  if (!emoji) {
    const { error } = await supabase.from("post_reactions").delete().eq("post_id", postId).eq("user_id", userId);
    if (error) throw error;
    return;
  }
  const { error } = await supabase.from("post_reactions").upsert(
    { post_id: postId, user_id: userId, emoji },
    { onConflict: "post_id,user_id" },
  );
  if (error) throw error;
}

export async function createPostComment(postId: string, userId: string, body: string): Promise<PostComment> {
  const supabase = createClient();
  const { data, error } = await supabase.from("post_comments")
    .insert({ post_id: postId, user_id: userId, body })
    .select("id,user_id,body,created_at")
    .single();
  if (error) throw error;
  return { id: data.id, userId: data.user_id, body: data.body, createdAt: data.created_at };
}

export async function loadNotifications(userId: string): Promise<LabNotification[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("notifications")
    .select("id,type,emoji,comment_preview,post_id,actor_id,mission_id,mission_title,created_at,read_at")
    .eq("recipient_id", userId)
    .order("created_at", { ascending: false })
    .limit(30);
  if (error) throw error;
  const rows = data ?? [];
  const actorIds = [...new Set(rows.map((item) => item.actor_id).filter((id): id is string => Boolean(id)))];
  const result = actorIds.length
    ? await supabase.from("profiles").select("id,name,initials,avatar_background").in("id", actorIds)
    : { data: [], error: null };
  if (result.error) throw result.error;
  return rows.map((item) => {
    const actor = (result.data ?? []).find((profile) => profile.id === item.actor_id);
    return {
      id: item.id,
      type: item.type as "reaction" | "comment" | "streak_reminder" | "mission_reminder",
      emoji: item.emoji,
      commentPreview: item.comment_preview,
      postId: item.post_id,
      actorId: item.actor_id,
      missionId: item.mission_id,
      missionTitle: item.mission_title,
      actorName: actor?.name ?? "Lab member",
      actorInitials: actor?.initials ?? "LB",
      actorAvatarBackground: actor?.avatar_background ?? "linear-gradient(135deg, #ffd84d, #ff8a4c)",
      createdAt: item.created_at,
      readAt: item.read_at,
    };
  });
}

export async function ensureDailyStreakReminder() {
  const supabase = createClient();
  const { error } = await supabase.rpc("ensure_my_daily_streak_reminder");
  if (error && error.code !== "PGRST202") throw error;
}

export async function markNotificationsRead(userId: string, notificationIds: string[]) {
  if (notificationIds.length === 0) return;
  const supabase = createClient();
  const { error } = await supabase.from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("recipient_id", userId)
    .in("id", notificationIds);
  if (error) throw error;
}
