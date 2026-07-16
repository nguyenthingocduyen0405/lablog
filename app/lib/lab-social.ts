import { createClient } from "./supabase/client";

export type LabMember = {
  id: string;
  name: string;
  initials: string;
  role: string;
  status: string;
  avatarBackground: string;
};

export type DailyPost = {
  id: string;
  memberId: string;
  caption: string;
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
  type: "reaction" | "comment";
  emoji: string | null;
  commentPreview: string | null;
  postId: string;
  actorId: string;
  actorName: string;
  actorInitials: string;
  actorAvatarBackground: string;
  createdAt: string;
  readAt: string | null;
};

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

export async function createDailyPost(file: File, caption: string, memberId: string) {
  const supabase = createClient();
  const rawExtension = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const extension = rawExtension.replace(/[^a-z0-9]/g, "") || "jpg";
  const imagePath = `${memberId}/${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await supabase.storage.from("post-images").upload(imagePath, file, { contentType: file.type, upsert: false });
  if (uploadError) throw uploadError;

  const { data, error: postError } = await supabase.from("posts").insert({ user_id: memberId, caption, image_path: imagePath }).select("id,user_id,caption,image_path,created_at").single();
  if (postError) {
    await supabase.storage.from("post-images").remove([imagePath]);
    throw postError;
  }
  const { data: publicImage } = supabase.storage.from("post-images").getPublicUrl(data.image_path);
  return {
    id: data.id,
    memberId: data.user_id,
    caption: data.caption,
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
  const { data, error } = await supabase.from("posts").select("id,user_id,caption,image_path,created_at").order("created_at", { ascending: false });
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
      caption: post.caption,
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
    .select("id,type,emoji,comment_preview,post_id,actor_id,created_at,read_at")
    .eq("recipient_id", userId)
    .order("created_at", { ascending: false })
    .limit(30);
  if (error) throw error;
  const rows = data ?? [];
  const actorIds = [...new Set(rows.map((item) => item.actor_id))];
  const result = actorIds.length
    ? await supabase.from("profiles").select("id,name,initials,avatar_background").in("id", actorIds)
    : { data: [], error: null };
  if (result.error) throw result.error;
  return rows.map((item) => {
    const actor = (result.data ?? []).find((profile) => profile.id === item.actor_id);
    return {
      id: item.id,
      type: item.type as "reaction" | "comment",
      emoji: item.emoji,
      commentPreview: item.comment_preview,
      postId: item.post_id,
      actorId: item.actor_id,
      actorName: actor?.name ?? "Lab member",
      actorInitials: actor?.initials ?? "LB",
      actorAvatarBackground: actor?.avatar_background ?? "linear-gradient(135deg, #ffd84d, #ff8a4c)",
      createdAt: item.created_at,
      readAt: item.read_at,
    };
  });
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
