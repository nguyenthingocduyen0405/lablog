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
  } satisfies DailyPost;
}

export async function loadDailyPosts(): Promise<DailyPost[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("posts").select("id,user_id,caption,image_path,created_at").order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((post) => {
    const { data: publicImage } = supabase.storage.from("post-images").getPublicUrl(post.image_path);
    return {
      id: post.id,
      memberId: post.user_id,
      caption: post.caption,
      createdAt: post.created_at,
      imageDataUrl: publicImage.publicUrl,
      background: "linear-gradient(145deg, #292524, #57534e)",
      emoji: "\u2728",
    };
  });
}

export function formatPostDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}
