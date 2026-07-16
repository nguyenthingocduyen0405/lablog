"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import {
  createPostComment,
  formatPostDate,
  setPostReaction,
  type DailyPost,
  type LabMember,
} from "../lib/lab-social";

type DailyPostCardProps = {
  post: DailyPost;
  member: LabMember;
  currentUserId: string;
  members: LabMember[];
};

const reactionOptions = ["👏", "🔥", "💡", "❤️"];

export default function DailyPostCard({ post, member, currentUserId, members }: DailyPostCardProps) {
  const imageStyle = post.imageDataUrl ? { backgroundImage: `url("${post.imageDataUrl}")` } : undefined;
  const [reactions, setReactions] = useState(post.reactions);
  const [comments, setComments] = useState(post.comments);
  const [showComments, setShowComments] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const myReaction = reactions.find((item) => item.userId === currentUserId)?.emoji;
  const reactionCounts = useMemo(() => reactionOptions.map((emoji) => ({
    emoji,
    count: reactions.filter((item) => item.emoji === emoji).length,
  })), [reactions]);

  async function handleReaction(emoji: string) {
    if (isSaving) return;
    const previous = reactions;
    const nextEmoji = myReaction === emoji ? null : emoji;
    setReactions((current) => [
      ...current.filter((item) => item.userId !== currentUserId),
      ...(nextEmoji ? [{ userId: currentUserId, emoji: nextEmoji }] : []),
    ]);
    setIsSaving(true);
    setError("");
    try {
      await setPostReaction(post.id, currentUserId, nextEmoji);
    } catch {
      setReactions(previous);
      setError("반응을 저장하지 못했어요.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const body = String(new FormData(form).get("comment")).trim();
    if (!body || isSaving) return;
    setIsSaving(true);
    setError("");
    try {
      const comment = await createPostComment(post.id, currentUserId, body);
      setComments((current) => [...current, comment]);
      form.reset();
      setShowComments(true);
    } catch {
      setError("댓글을 저장하지 못했어요.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <article id={`post-${post.id}`} className="group scroll-mt-24 overflow-hidden rounded-[2rem] bg-white p-2 shadow-[0_18px_55px_rgba(35,31,24,0.10)] ring-1 ring-black/[0.05] transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_70px_rgba(35,31,24,0.16)]">
      <div
        className="relative flex aspect-[4/5] flex-col justify-between overflow-hidden rounded-[1.55rem] bg-stone-950 p-5 text-white"
        style={post.imageDataUrl ? undefined : { background: post.background }}
      >
        {post.imageDataUrl && (
          <>
            <div className="absolute -inset-8 scale-110 bg-cover bg-center opacity-50 blur-2xl" style={imageStyle} />
            <div className="absolute inset-0 bg-contain bg-center bg-no-repeat" style={imageStyle} />
          </>
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/70" />
        <Link href={`/members/${member.id}`} className="relative z-10 flex w-fit items-center gap-2 rounded-full bg-black/25 py-1.5 pl-1.5 pr-3 backdrop-blur-md transition hover:bg-black/40">
          <span className="flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-black text-stone-900" style={{ background: member.avatarBackground }}>
            {member.initials}
          </span>
          <span className="text-sm font-bold">{member.name}</span>
        </Link>

        {!post.imageDataUrl && (
          <div className="relative z-10 flex flex-1 items-center justify-center text-7xl drop-shadow-lg transition duration-300 group-hover:scale-110">
            {post.emoji}
          </div>
        )}

        <div className="relative z-10">
          <p className="text-lg font-bold leading-7 text-white drop-shadow-sm">{post.caption}</p>
          <p className="mt-2 text-xs font-semibold text-white/70">{formatPostDate(post.createdAt)}</p>
        </div>
      </div>
      <div className="px-2 pb-2 pt-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            {reactionCounts.map(({ emoji, count }) => (
              <button key={emoji} type="button" disabled={isSaving} onClick={() => handleReaction(emoji)} aria-label={`React with ${emoji}`} className={`rounded-full px-2.5 py-1.5 text-sm font-bold transition ${myReaction === emoji ? "bg-[#ffd84d] ring-2 ring-stone-900" : "bg-stone-100 hover:bg-stone-200"}`}>
                {emoji}{count > 0 && <span className="ml-1 text-xs">{count}</span>}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => setShowComments((current) => !current)} className="shrink-0 rounded-full px-2 py-1.5 text-xs font-black text-stone-500 hover:bg-stone-100">
            {"\uB313\uAE00"} {comments.length}
          </button>
        </div>
        {error && <p className="mt-2 text-xs font-bold text-red-500">{error}</p>}
        {showComments && (
          <div className="mt-3 border-t border-stone-100 pt-3">
            <div className="max-h-48 space-y-3 overflow-y-auto">
              {comments.length === 0 && <p className="py-3 text-center text-xs font-semibold text-stone-400">{"\uCCAB \uB313\uAE00\uC744 \uB0A8\uACA8 \uBCF4\uC138\uC694."}</p>}
              {comments.map((comment) => {
                const author = members.find((item) => item.id === comment.userId);
                return (
                  <div key={comment.id} className="flex gap-2">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[9px] font-black" style={{ background: author?.avatarBackground ?? "#e7e5e4" }}>{author?.initials ?? "LB"}</span>
                    <div className="min-w-0 rounded-2xl bg-stone-100 px-3 py-2 text-xs">
                      <p className="font-black">{author?.name ?? "Lab member"}</p>
                      <p className="mt-0.5 break-words font-medium leading-5 text-stone-600">{comment.body}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            <form onSubmit={handleComment} className="mt-3 flex gap-2">
              <input name="comment" required maxLength={300} placeholder={"\uB313\uAE00\uC744 \uB0A8\uACA8 \uBCF4\uC138\uC694..."} className="min-w-0 flex-1 rounded-full bg-stone-100 px-4 py-2.5 text-xs font-semibold outline-none ring-[#ffd84d] transition focus:ring-2" />
              <button type="submit" disabled={isSaving} className="rounded-full bg-stone-950 px-4 py-2.5 text-xs font-black text-white disabled:opacity-50">{"\uB4F1\uB85D"}</button>
            </form>
          </div>
        )}
      </div>
    </article>
  );
}
