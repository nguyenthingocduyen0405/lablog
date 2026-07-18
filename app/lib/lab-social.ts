import { createClient } from "./supabase/client";

export type AvatarConfig = {
  character: "person";
  gender: "male" | "female";
  body: "slim" | "round";
  skin: string;
  hair: "short" | "side" | "long" | "wave";
  hairColor: string;
  outfitColor: string;
  accessory: "none" | "glasses" | "star" | "headphones";
};

export const DEFAULT_AVATAR_CONFIG: AvatarConfig = {
  character: "person",
  gender: "female",
  body: "slim",
  skin: "#f2b98c",
  hair: "long",
  hairColor: "#3d2a22",
  outfitColor: "#7c5cff",
  accessory: "none",
};

export function mapAvatarConfig(value: unknown): AvatarConfig {
  const config = value && typeof value === "object" ? value as Partial<AvatarConfig> : {};
  return {
    character: "person",
    gender: ["male", "female"].includes(String(config.gender)) ? config.gender as AvatarConfig["gender"] : DEFAULT_AVATAR_CONFIG.gender,
    body: ["slim", "round"].includes(String(config.body)) ? config.body as AvatarConfig["body"] : DEFAULT_AVATAR_CONFIG.body,
    skin: typeof config.skin === "string" ? config.skin : DEFAULT_AVATAR_CONFIG.skin,
    hair: ["short", "side", "long", "wave"].includes(String(config.hair)) ? config.hair as AvatarConfig["hair"] : DEFAULT_AVATAR_CONFIG.hair,
    hairColor: typeof config.hairColor === "string" ? config.hairColor : DEFAULT_AVATAR_CONFIG.hairColor,
    outfitColor: typeof config.outfitColor === "string" ? config.outfitColor : DEFAULT_AVATAR_CONFIG.outfitColor,
    accessory: ["none", "glasses", "star", "headphones"].includes(String(config.accessory)) ? config.accessory as AvatarConfig["accessory"] : DEFAULT_AVATAR_CONFIG.accessory,
  };
}

export type LabMember = {
  id: string;
  name: string;
  initials: string;
  role: string;
  status: string;
  avatarBackground: string;
  avatarConfig: AvatarConfig;
  labSeat: number | null;
};

export const POST_STATUSES = [
  { value: "studying", label: "공부 중", emoji: "📚" },
  { value: "working", label: "진행 중", emoji: "🛠️" },
  { value: "experimenting", label: "실험 중", emoji: "🧪" },
  { value: "help", label: "도움 필요", emoji: "🆘" },
  { value: "completed", label: "완료", emoji: "✅" },
] as const;

export type PostStatus = (typeof POST_STATUSES)[number]["value"];
export type PostKind = "work" | "moment";

export const MOMENT_CATEGORIES = [
  { value: "daily", label: "일상", emoji: "🌿" },
  { value: "travel", label: "여행", emoji: "✈️" },
  { value: "food", label: "맛집", emoji: "🍜" },
  { value: "rest", label: "휴식", emoji: "☕" },
  { value: "event", label: "함께", emoji: "🎉" },
] as const;

export type MomentCategory = (typeof MOMENT_CATEGORIES)[number]["value"];

export function isMomentCategory(value: string): value is MomentCategory {
  return MOMENT_CATEGORIES.some((category) => category.value === value);
}

export function isPostStatus(value: string): value is PostStatus {
  return POST_STATUSES.some((status) => status.value === value);
}

export function getPostStatus(status: PostStatus) {
  return POST_STATUSES.find((item) => item.value === status) ?? POST_STATUSES[1];
}

export type DailyPost = {
  id: string;
  memberId: string;
  kind: PostKind;
  momentCategory: MomentCategory | null;
  missionId: string | null;
  missionTitle: string | null;
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

export type MissionActivity = Pick<DailyPost, "missionId" | "createdAt">;

const DATA_CACHE_MS = 15_000;
type CacheEntry<T> = { value: T; expiresAt: number };
let membersCache: CacheEntry<LabMember[]> | null = null;
let dailyPostsCache: CacheEntry<DailyPost[]> | null = null;
const missionActivityCache = new Map<string, CacheEntry<MissionActivity[]>>();
const calendarPostsCache = new Map<string, CacheEntry<DailyPost[]>>();
const activeMissionsCache = new Map<string, CacheEntry<Mission[]>>();
const notificationsCache = new Map<string, CacheEntry<LabNotification[]>>();
let calendarEventsCache: CacheEntry<CalendarEvent[]> | null = null;
const onlineMeetingsCache = new Map<string, CacheEntry<OnlineMeeting[]>>();
let reminderCheckedAt = 0;

function validCache<T>(entry: CacheEntry<T> | null | undefined) {
  return entry && entry.expiresAt > Date.now() ? entry.value : null;
}

function invalidatePostCaches(userId?: string) {
  dailyPostsCache = null;
  if (userId) {
    missionActivityCache.delete(userId);
    calendarPostsCache.delete(userId);
  }
}

export type PostReaction = { userId: string; emoji: string };

export type PostComment = {
  id: string;
  userId: string;
  body: string;
  createdAt: string;
};

export type LabNotification = {
  id: string;
  type: "reaction" | "comment" | "streak_reminder" | "mission_reminder" | "team_project_invite";
  emoji: string | null;
  commentPreview: string | null;
  postId: string | null;
  actorId: string | null;
  missionId: string | null;
  missionTitle: string | null;
  projectId: string | null;
  projectTitle: string | null;
  actorName: string;
  actorInitials: string;
  actorAvatarBackground: string;
  actorAvatarConfig: AvatarConfig;
  createdAt: string;
  readAt: string | null;
};

export const CALENDAR_EVENT_CATEGORIES = [
  { value: "travel", label: "여행", emoji: "✈️", color: "#9d83ff" },
  { value: "conference", label: "학회", emoji: "🎤", color: "#55c9a5" },
  { value: "deadline", label: "마감", emoji: "⏰", color: "#ff8a76" },
  { value: "leave", label: "휴가", emoji: "🌿", color: "#65a9ff" },
  { value: "other", label: "기타", emoji: "📌", color: "#f5c842" },
] as const;

export type CalendarEventCategory = (typeof CALENDAR_EVENT_CATEGORIES)[number]["value"];

export type CalendarEvent = {
  id: string;
  userId: string;
  title: string;
  description: string;
  category: CalendarEventCategory;
  startsOn: string;
  endsOn: string;
  createdAt: string;
};

export type OnlineMeeting = {
  id: string;
  creatorId: string;
  projectId: string;
  title: string;
  description: string;
  roomName: string;
  startsAt: string;
  endedAt: string | null;
  createdAt: string;
};

export type TeamProject = {
  id: string;
  ownerId: string;
  name: string;
  description: string;
  active: boolean;
  createdAt: string;
};

export type TeamProjectMember = {
  projectId: string;
  userId: string;
  role: "host" | "member";
  status: "invited" | "accepted";
  member: LabMember;
};

export type TeamProjectInvite = {
  project: TeamProject;
  hostName: string;
  createdAt: string;
};

export type MemberAvailability = {
  label: string;
  emoji: string;
  color: string;
  eventTitle: string;
};

const availabilityByCategory: Record<CalendarEventCategory, Omit<MemberAvailability, "eventTitle"> & { priority: number }> = {
  leave: { label: "휴가 중", emoji: "🌿", color: "#65a9ff", priority: 1 },
  travel: { label: "출장/여행 중", emoji: "✈️", color: "#9d83ff", priority: 2 },
  conference: { label: "학회 참석", emoji: "🎤", color: "#55c9a5", priority: 3 },
  deadline: { label: "집중 작업 중", emoji: "⏰", color: "#ff8a76", priority: 4 },
  other: { label: "일정 있음", emoji: "📌", color: "#f5c842", priority: 5 },
};

export function getMemberAvailability(events: CalendarEvent[], userId: string, day = seoulDateKey(new Date())): MemberAvailability | null {
  const currentEvent = events
    .filter((event) => event.userId === userId && event.startsOn <= day && event.endsOn >= day)
    .sort((a, b) => availabilityByCategory[a.category].priority - availabilityByCategory[b.category].priority)[0];
  if (!currentEvent) return null;
  const availability = availabilityByCategory[currentEvent.category];
  return { label: availability.label, emoji: availability.emoji, color: availability.color, eventTitle: currentEvent.title };
}

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

function mapCalendarEvent(row: Record<string, string>): CalendarEvent {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    description: row.description,
    category: row.category as CalendarEventCategory,
    startsOn: row.starts_on,
    endsOn: row.ends_on,
    createdAt: row.created_at,
  };
}

function mapOnlineMeeting(row: Record<string, string | number | null>): OnlineMeeting {
  return {
    id: String(row.id),
    creatorId: String(row.creator_id),
    projectId: String(row.project_id),
    title: String(row.title),
    description: String(row.description),
    roomName: String(row.room_name),
    startsAt: String(row.starts_at),
    endedAt: typeof row.ended_at === "string" ? row.ended_at : null,
    createdAt: String(row.created_at),
  };
}

function mapTeamProject(row: Record<string, string | boolean>): TeamProject {
  return {
    id: String(row.id),
    ownerId: String(row.owner_id),
    name: String(row.name),
    description: String(row.description),
    active: Boolean(row.active),
    createdAt: String(row.created_at),
  };
}

export async function loadLabMembers(): Promise<LabMember[]> {
  const cached = validCache(membersCache);
  if (cached) return cached;
  const supabase = createClient();
  let { data, error } = await supabase.from("profiles").select("id,name,role,status,initials,avatar_background,avatar_config,lab_seat").order("created_at");
  if (error?.code === "42703") {
    const fallback = await supabase.from("profiles").select("id,name,role,status,initials,avatar_background,avatar_config").order("created_at");
    data = fallback.data?.map((profile) => ({ ...profile, lab_seat: null })) ?? null;
    error = fallback.error;
  }
  if (error) throw error;
  const members = (data ?? []).map((profile) => ({
    id: profile.id,
    name: profile.name,
    role: profile.role,
    status: profile.status,
    initials: profile.initials,
    avatarBackground: profile.avatar_background,
    avatarConfig: mapAvatarConfig(profile.avatar_config),
    labSeat: typeof profile.lab_seat === "number" ? profile.lab_seat : null,
  }));
  membersCache = { value: members, expiresAt: Date.now() + DATA_CACHE_MS };
  return members;
}

export async function saveLabSeat(userId: string, labSeat: number) {
  if (!Number.isInteger(labSeat) || labSeat < 0 || labSeat > 7) throw new Error("Invalid lab seat");
  const supabase = createClient();
  const { error } = await supabase.from("profiles").update({ lab_seat: labSeat }).eq("id", userId);
  if (error) throw error;
  membersCache = null;
}

export async function saveAvatarConfig(userId: string, avatarConfig: AvatarConfig) {
  const supabase = createClient();
  const { error } = await supabase.from("profiles").update({ avatar_config: avatarConfig }).eq("id", userId);
  if (error) throw error;
  membersCache = null;
}

export async function loadCalendarEvents(): Promise<CalendarEvent[]> {
  const cached = validCache(calendarEventsCache);
  if (cached) return cached;
  const supabase = createClient();
  const { data, error } = await supabase.from("calendar_events")
    .select("id,user_id,title,description,category,starts_on,ends_on,created_at")
    .order("starts_on", { ascending: true })
    .limit(500);
  if (error) throw error;
  const events = (data ?? []).map((row) => mapCalendarEvent(row));
  calendarEventsCache = { value: events, expiresAt: Date.now() + DATA_CACHE_MS };
  return events;
}

export async function createCalendarEvent(input: {
  userId: string;
  title: string;
  description: string;
  category: CalendarEventCategory;
  startsOn: string;
  endsOn: string;
}): Promise<CalendarEvent> {
  const supabase = createClient();
  const { data, error } = await supabase.from("calendar_events").insert({
    user_id: input.userId,
    title: input.title,
    description: input.description,
    category: input.category,
    starts_on: input.startsOn,
    ends_on: input.endsOn,
  }).select("id,user_id,title,description,category,starts_on,ends_on,created_at").single();
  if (error) throw error;
  calendarEventsCache = null;
  return mapCalendarEvent(data);
}

export async function deleteCalendarEvent(eventId: string, userId: string) {
  const supabase = createClient();
  const { error } = await supabase.from("calendar_events").delete().eq("id", eventId).eq("user_id", userId);
  if (error) throw error;
  calendarEventsCache = null;
}

export async function loadOnlineMeetings(projectId: string): Promise<OnlineMeeting[]> {
  const cached = validCache(onlineMeetingsCache.get(projectId));
  if (cached) return cached;
  const supabase = createClient();
  const { data, error } = await supabase.from("online_meetings")
    .select("id,creator_id,project_id,title,description,room_name,starts_at,ended_at,created_at")
    .eq("project_id", projectId)
    .is("ended_at", null)
    .order("starts_at", { ascending: false })
    .limit(1);
  if (error && ["PGRST205", "42P01"].includes(error.code)) return [];
  if (error) throw error;
  const meetings = (data ?? []).map(mapOnlineMeeting);
  onlineMeetingsCache.set(projectId, { value: meetings, expiresAt: Date.now() + DATA_CACHE_MS });
  return meetings;
}

export async function startProjectMeeting(projectId: string, title: string): Promise<OnlineMeeting> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("start_project_meeting", { target_project_id: projectId, meeting_title: title });
  if (error) throw error;
  onlineMeetingsCache.delete(projectId);
  return mapOnlineMeeting(data);
}

export async function endProjectMeeting(meetingId: string, projectId: string) {
  const supabase = createClient();
  const { error } = await supabase.rpc("end_project_meeting", { target_meeting_id: meetingId });
  if (error) throw error;
  onlineMeetingsCache.delete(projectId);
}

export async function loadTeamProjects(userId: string): Promise<TeamProject[]> {
  const supabase = createClient();
  const { data: memberRows, error } = await supabase.from("team_project_members")
    .select("project_id")
    .eq("user_id", userId)
    .eq("status", "accepted");
  if (error && ["PGRST205", "42P01"].includes(error.code)) return [];
  if (error) throw error;
  const projectIds = [...new Set((memberRows ?? []).map((row) => row.project_id))];
  if (projectIds.length === 0) return [];
  const projects = await supabase.from("team_projects")
    .select("id,owner_id,name,description,active,created_at")
    .in("id", projectIds)
    .eq("active", true)
    .order("created_at", { ascending: false });
  if (projects.error) throw projects.error;
  return (projects.data ?? []).map(mapTeamProject);
}

export async function loadTeamProjectInvites(userId: string): Promise<TeamProjectInvite[]> {
  const supabase = createClient();
  const { data: rows, error } = await supabase.from("team_project_members")
    .select("project_id,invited_by,created_at")
    .eq("user_id", userId)
    .eq("status", "invited")
    .order("created_at", { ascending: false });
  if (error && ["PGRST205", "42P01"].includes(error.code)) return [];
  if (error) throw error;
  if (!rows?.length) return [];
  const projectIds = [...new Set(rows.map((row) => row.project_id))];
  const hostIds = [...new Set(rows.map((row) => row.invited_by))];
  const [projects, hosts] = await Promise.all([
    supabase.from("team_projects").select("id,owner_id,name,description,active,created_at").in("id", projectIds),
    supabase.from("profiles").select("id,name").in("id", hostIds),
  ]);
  if (projects.error) throw projects.error;
  if (hosts.error) throw hosts.error;
  return rows.flatMap((row) => {
    const projectRow = (projects.data ?? []).find((project) => project.id === row.project_id);
    if (!projectRow) return [];
    const host = (hosts.data ?? []).find((profile) => profile.id === row.invited_by);
    return [{ project: mapTeamProject(projectRow), hostName: host?.name ?? "Lab member", createdAt: row.created_at }];
  });
}

export async function loadTeamProjectMembers(projectIds: string[]): Promise<TeamProjectMember[]> {
  if (projectIds.length === 0) return [];
  const supabase = createClient();
  const { data: rows, error } = await supabase.from("team_project_members")
    .select("project_id,user_id,role,status")
    .in("project_id", projectIds)
    .in("status", ["invited", "accepted"]);
  if (error && ["PGRST205", "42P01"].includes(error.code)) return [];
  if (error) throw error;
  const userIds = [...new Set((rows ?? []).map((row) => row.user_id))];
  if (userIds.length === 0) return [];
  const profiles = await supabase.from("profiles").select("id,name,role,status,initials,avatar_background,avatar_config,lab_seat").in("id", userIds);
  if (profiles.error) throw profiles.error;
  return (rows ?? []).flatMap((row) => {
    const profile = (profiles.data ?? []).find((item) => item.id === row.user_id);
    if (!profile) return [];
    return [{ projectId: row.project_id, userId: row.user_id, role: row.role as "host" | "member", status: row.status as "invited" | "accepted", member: {
      id: profile.id, name: profile.name, role: profile.role, status: profile.status, initials: profile.initials,
      avatarBackground: profile.avatar_background, avatarConfig: mapAvatarConfig(profile.avatar_config), labSeat: typeof profile.lab_seat === "number" ? profile.lab_seat : null,
    } }];
  });
}

export async function createTeamProject(name: string, description: string, invitedUserIds: string[]): Promise<TeamProject> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("create_team_project", { project_name: name, project_description: description, invited_user_ids: invitedUserIds });
  if (error) throw error;
  notificationsCache.clear();
  return mapTeamProject(data);
}

export async function respondToTeamProjectInvite(projectId: string, response: "accepted" | "declined", userId: string) {
  const supabase = createClient();
  const { error } = await supabase.rpc("respond_to_team_project_invite", { target_project_id: projectId, response_status: response });
  if (error) throw error;
  notificationsCache.delete(userId);
}

export async function createDailyPost(
  file: File,
  caption: string,
  status: PostStatus,
  kind: PostKind,
  momentCategory: MomentCategory | null,
  memberId: string,
  missionId: string | null,
) {
  const supabase = createClient();
  const rawExtension = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const extension = rawExtension.replace(/[^a-z0-9]/g, "") || "jpg";
  const imagePath = `${memberId}/${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await supabase.storage.from("post-images").upload(imagePath, file, { contentType: file.type, upsert: false });
  if (uploadError) throw uploadError;

  const { data, error: postError } = await supabase.from("posts").insert({
    user_id: memberId,
    post_kind: kind,
    moment_category: kind === "moment" ? momentCategory : null,
    mission_id: missionId,
    caption,
    status,
    image_path: imagePath,
  }).select("id,user_id,post_kind,moment_category,mission_id,mission_title,score_awarded,caption,status,image_path,created_at").single();
  if (postError) {
    await supabase.storage.from("post-images").remove([imagePath]);
    throw postError;
  }
  invalidatePostCaches(memberId);
  const { data: publicImage } = supabase.storage.from("post-images").getPublicUrl(data.image_path);
  return {
    id: data.id,
    memberId: data.user_id,
    kind: data.post_kind as PostKind,
    momentCategory: data.moment_category as MomentCategory | null,
    missionId: data.mission_id,
    missionTitle: data.mission_title,
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
  const cached = validCache(dailyPostsCache);
  if (cached) return cached;
  const supabase = createClient();
  const { data, error } = await supabase.from("posts").select("id,user_id,post_kind,moment_category,mission_id,mission_title,score_awarded,caption,status,image_path,created_at").order("created_at", { ascending: false });
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
  const mappedPosts = posts.map((post) => {
    const { data: publicImage } = supabase.storage.from("post-images").getPublicUrl(post.image_path);
    return {
      id: post.id,
      memberId: post.user_id,
      kind: (post.post_kind ?? "work") as PostKind,
      momentCategory: post.moment_category as MomentCategory | null,
      missionId: post.mission_id,
      missionTitle: post.mission_title,
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
  dailyPostsCache = { value: mappedPosts, expiresAt: Date.now() + DATA_CACHE_MS };
  return mappedPosts;
}

export async function loadMissionActivity(userId: string): Promise<MissionActivity[]> {
  const cached = validCache(missionActivityCache.get(userId));
  if (cached) return cached;
  const supabase = createClient();
  const { data, error } = await supabase.from("posts")
    .select("mission_id,created_at")
    .eq("user_id", userId)
    .eq("post_kind", "work")
    .order("created_at", { ascending: false });
  if (error) throw error;
  const activity = (data ?? []).map((post) => ({ missionId: post.mission_id, createdAt: post.created_at }));
  missionActivityCache.set(userId, { value: activity, expiresAt: Date.now() + DATA_CACHE_MS });
  return activity;
}

export async function loadCalendarPosts(userId: string): Promise<DailyPost[]> {
  const cached = validCache(calendarPostsCache.get(userId));
  if (cached) return cached;
  const supabase = createClient();
  const { data, error } = await supabase.from("posts")
    .select("id,user_id,post_kind,moment_category,mission_id,mission_title,score_awarded,caption,status,image_path,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  const calendarPosts = (data ?? []).map((post) => {
    const { data: publicImage } = supabase.storage.from("post-images").getPublicUrl(post.image_path);
    return {
      id: post.id,
      memberId: post.user_id,
      kind: (post.post_kind ?? "work") as PostKind,
      momentCategory: post.moment_category as MomentCategory | null,
      missionId: post.mission_id,
      missionTitle: post.mission_title,
      scoreAwarded: post.score_awarded ?? 0,
      caption: post.caption,
      status: (post.status ?? "working") as PostStatus,
      createdAt: post.created_at,
      imageDataUrl: publicImage.publicUrl,
      background: "linear-gradient(145deg, #292524, #57534e)",
      emoji: "✨",
      reactions: [],
      comments: [],
    } satisfies DailyPost;
  });
  calendarPostsCache.set(userId, { value: calendarPosts, expiresAt: Date.now() + DATA_CACHE_MS });
  return calendarPosts;
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

export function hasMissionUpdateToday(posts: MissionActivity[], missionId: string, now = new Date()) {
  const today = seoulDateKey(now);
  return posts.some((post) => post.missionId === missionId && seoulDateKey(new Date(post.createdAt)) === today);
}

export function countMissionUpdateDays(posts: MissionActivity[], missionId: string) {
  return new Set(
    posts.filter((post) => post.missionId === missionId).map((post) => seoulDateKey(new Date(post.createdAt))),
  ).size;
}

export async function loadActiveMissions(userId: string): Promise<Mission[]> {
  const cached = validCache(activeMissionsCache.get(userId));
  if (cached) return cached;
  const supabase = createClient();
  const { data, error } = await supabase.from("missions")
    .select("id,user_id,title,duration_days,points_per_update,started_on,ends_on,active,created_at")
    .eq("user_id", userId)
    .eq("active", true)
    .gte("ends_on", seoulDateKey(new Date()))
    .order("created_at", { ascending: false })
    .limit(20);
  if (error && error.code !== "PGRST205") throw error;
  const missions = (data ?? []).map(mapMission);
  activeMissionsCache.set(userId, { value: missions, expiresAt: Date.now() + DATA_CACHE_MS });
  return missions;
}

export async function loadActiveMission(userId: string): Promise<Mission | null> {
  const missions = await loadActiveMissions(userId);
  return missions[0] ?? null;
}

export function missionPointsForDuration(durationDays: number) {
  if (durationDays <= 7) return 2;
  if (durationDays <= 14) return 3;
  if (durationDays <= 30) return 5;
  return Math.min(10, 5 + Math.ceil((durationDays - 30) / 30));
}

export async function addMission(title: string, durationDays: number): Promise<Mission> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("set_my_mission", {
    mission_title: title,
    mission_duration: durationDays,
  });
  if (error) throw error;
  const mission = mapMission(data);
  activeMissionsCache.delete(mission.userId);
  return mission;
}

export const setActiveMission = addMission;

function addDays(value: Date, days: number) {
  const result = new Date(value);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

export function hasPostedToday(posts: DailyPost[], memberId: string, now = new Date()) {
  const today = seoulDateKey(now);
  return posts.some((post) => post.kind === "work" && post.memberId === memberId && seoulDateKey(new Date(post.createdAt)) === today);
}

export function calculateCurrentStreak(posts: DailyPost[], memberId: string, now = new Date()) {
  const activeDays = new Set(
    posts.filter((post) => post.kind === "work" && post.memberId === memberId).map((post) => seoulDateKey(new Date(post.createdAt))),
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
    dailyPostsCache = null;
    return;
  }
  const { error } = await supabase.from("post_reactions").upsert(
    { post_id: postId, user_id: userId, emoji },
    { onConflict: "post_id,user_id" },
  );
  if (error) throw error;
  dailyPostsCache = null;
}

export async function createPostComment(postId: string, userId: string, body: string): Promise<PostComment> {
  const supabase = createClient();
  const { data, error } = await supabase.from("post_comments")
    .insert({ post_id: postId, user_id: userId, body })
    .select("id,user_id,body,created_at")
    .single();
  if (error) throw error;
  dailyPostsCache = null;
  return { id: data.id, userId: data.user_id, body: data.body, createdAt: data.created_at };
}

export async function loadNotifications(userId: string): Promise<LabNotification[]> {
  const cached = validCache(notificationsCache.get(userId));
  if (cached) return cached;
  const supabase = createClient();
  let { data, error } = await supabase.from("notifications")
    .select("id,type,emoji,comment_preview,post_id,actor_id,mission_id,mission_title,project_id,project_title,created_at,read_at")
    .eq("recipient_id", userId)
    .neq("type", "mission_invite")
    .order("created_at", { ascending: false })
    .limit(30);
  if (error?.code === "42703") {
    const fallback = await supabase.from("notifications")
      .select("id,type,emoji,comment_preview,post_id,actor_id,mission_id,mission_title,created_at,read_at")
      .eq("recipient_id", userId)
      .neq("type", "mission_invite")
      .order("created_at", { ascending: false })
      .limit(30);
    data = fallback.data?.map((item) => ({ ...item, project_id: null, project_title: null })) ?? null;
    error = fallback.error;
  }
  if (error) throw error;
  const rows = data ?? [];
  const actorIds = [...new Set(rows.map((item) => item.actor_id).filter((id): id is string => Boolean(id)))];
  const result = actorIds.length
    ? await supabase.from("profiles").select("id,name,initials,avatar_background,avatar_config").in("id", actorIds)
    : { data: [], error: null };
  if (result.error) throw result.error;
  const notifications = rows.map((item) => {
    const actor = (result.data ?? []).find((profile) => profile.id === item.actor_id);
    return {
      id: item.id,
      type: item.type as LabNotification["type"],
      emoji: item.emoji,
      commentPreview: item.comment_preview,
      postId: item.post_id,
      actorId: item.actor_id,
      missionId: item.mission_id,
      missionTitle: item.mission_title,
      projectId: item.project_id,
      projectTitle: item.project_title,
      actorName: actor?.name ?? "Lab member",
      actorInitials: actor?.initials ?? "LB",
      actorAvatarBackground: actor?.avatar_background ?? "linear-gradient(135deg, #ffd84d, #ff8a4c)",
      actorAvatarConfig: mapAvatarConfig(actor?.avatar_config),
      createdAt: item.created_at,
      readAt: item.read_at,
    };
  });
  notificationsCache.set(userId, { value: notifications, expiresAt: Date.now() + DATA_CACHE_MS });
  return notifications;
}

export async function ensureDailyStreakReminder() {
  if (Date.now() - reminderCheckedAt < 60_000) return;
  const supabase = createClient();
  const { error } = await supabase.rpc("ensure_my_daily_streak_reminder");
  if (error && error.code !== "PGRST202") throw error;
  reminderCheckedAt = Date.now();
}

export async function markNotificationsRead(userId: string, notificationIds: string[]) {
  if (notificationIds.length === 0) return;
  const supabase = createClient();
  const { error } = await supabase.from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("recipient_id", userId)
    .in("id", notificationIds);
  if (error) throw error;
  const cached = validCache(notificationsCache.get(userId));
  if (cached) {
    const ids = new Set(notificationIds);
    const readAt = new Date().toISOString();
    notificationsCache.set(userId, {
      value: cached.map((item) => ids.has(item.id) ? { ...item, readAt } : item),
      expiresAt: Date.now() + DATA_CACHE_MS,
    });
  }
}
