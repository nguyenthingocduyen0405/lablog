import Link from "next/link";
import { formatPostDate, type DailyPost, type LabMember } from "../lib/lab-social";

type DailyPostCardProps = {
  post: DailyPost;
  member: LabMember;
};

export default function DailyPostCard({ post, member }: DailyPostCardProps) {
  const imageStyle = post.imageDataUrl ? { backgroundImage: `url("${post.imageDataUrl}")` } : undefined;

  return (
    <article className="group overflow-hidden rounded-[2rem] bg-white p-2 shadow-[0_18px_55px_rgba(35,31,24,0.10)] ring-1 ring-black/[0.05] transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_70px_rgba(35,31,24,0.16)]">
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
    </article>
  );
}
