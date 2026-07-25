"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  loadLabAdminMembers,
  removeLabMember,
  rotateLabJoinCode,
  updateLabMemberRole,
  type LabAdminMember,
} from "../../../lib/admin";
import { useI18n } from "../../../lib/i18n";
import { useLab } from "../../../lib/lab-tenancy";

export default function LabAdminPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const { labs, isLoading } = useLab();
  const { l } = useI18n();
  const lab = useMemo(() => labs.find((item) => item.slug === slug), [labs, slug]);
  const canManage = lab?.membershipRole === "owner" || lab?.membershipRole === "admin";
  const [members, setMembers] = useState<LabAdminMember[]>([]);
  const [rotatedJoinCode, setRotatedJoinCode] = useState<string | null>(null);
  const [busyUserId, setBusyUserId] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!isLoading && !lab) router.replace("/labs");
  }, [isLoading, lab, router]);

  useEffect(() => {
    if (!lab || !canManage) return;
    let cancelled = false;
    loadLabAdminMembers(lab.id)
      .then((nextMembers) => {
        if (!cancelled) setMembers(nextMembers);
      })
      .catch((caught) => {
        if (!cancelled) setMessage(caught instanceof Error ? caught.message : "Could not load members.");
      });
    return () => {
      cancelled = true;
    };
  }, [canManage, lab]);

  async function refreshMembers() {
    if (!lab) return;
    setMembers(await loadLabAdminMembers(lab.id));
  }

  async function changeRole(member: LabAdminMember, role: "admin" | "member") {
    if (!lab) return;
    setBusyUserId(member.userId);
    setMessage("");
    try {
      await updateLabMemberRole(lab.id, member.userId, role);
      await refreshMembers();
      setMessage(l("역할을 변경했습니다.", "Đã cập nhật vai trò.", "Role updated."));
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Could not update role.");
    } finally {
      setBusyUserId("");
    }
  }

  async function removeMember(member: LabAdminMember) {
    if (!lab || !window.confirm(l("이 멤버를 랩에서 삭제할까요?", "Xóa thành viên này khỏi Lab?", "Remove this member from the lab?"))) return;
    setBusyUserId(member.userId);
    setMessage("");
    try {
      await removeLabMember(lab.id, member.userId);
      await refreshMembers();
      setMessage(l("멤버를 삭제했습니다.", "Đã xóa thành viên.", "Member removed."));
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Could not remove member.");
    } finally {
      setBusyUserId("");
    }
  }

  async function rotateCode() {
    if (!lab) return;
    setMessage("");
    try {
      setRotatedJoinCode(await rotateLabJoinCode(lab.id));
      setMessage(l("새 초대 코드를 만들었습니다.", "Đã tạo mã mời mới.", "New join code created."));
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Could not rotate join code.");
    }
  }

  if (isLoading || !lab) return <Loading />;
  if (!canManage) {
    return <main className="grid min-h-screen place-items-center bg-[#f5f3ee] px-5"><section className="rounded-[2rem] bg-white p-8 text-center shadow-sm"><h1 className="text-2xl font-black">{l("랩 관리자 권한이 필요합니다", "Cần quyền quản trị Lab", "Lab admin access required")}</h1><Link href={"/labs/" + lab.slug} className="mt-6 inline-block rounded-full bg-stone-950 px-6 py-3 font-black text-white">{l("랩 포털", "Portal Lab", "Lab portal")}</Link></section></main>;
  }

  return (
    <main className="min-h-screen bg-[#f5f3ee] px-5 py-10 text-stone-950 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="text-xs font-black uppercase tracking-[.2em] text-violet-500">{lab.name} · ADMIN</p><h1 className="mt-2 text-4xl font-black sm:text-6xl">{l("랩 관리", "Quản trị Lab", "Lab administration")}</h1></div>
          <div className="flex flex-wrap gap-2"><Link href={"/labs/" + lab.slug + "/settings"} className="rounded-full bg-white px-5 py-3 text-sm font-black shadow-sm">{l("포털 설정", "Cài đặt", "Settings")}</Link><Link href={"/labs/" + lab.slug + "/quests"} className="rounded-full bg-violet-600 px-5 py-3 text-sm font-black text-white">Quest Studio</Link><Link href={"/labs/" + lab.slug} className="rounded-full bg-stone-950 px-5 py-3 text-sm font-black text-white">{l("랩 포털", "Portal", "Portal")}</Link></div>
        </header>

        <section className="mt-8 grid gap-5 lg:grid-cols-[.7fr_1.3fr]">
          <aside className="self-start rounded-[2rem] bg-stone-950 p-6 text-white shadow-xl">
            <p className="text-xs font-black uppercase tracking-widest text-white/40">JOIN CODE</p>
            <p className="mt-3 break-all text-3xl font-black tracking-[.2em] text-[#ffd84d]">{(rotatedJoinCode ?? lab.joinCode) || "—"}</p>
            <p className="mt-4 text-sm font-medium leading-6 text-white/50">{l("코드를 변경하면 이전 코드는 즉시 만료됩니다.", "Khi đổi mã, mã cũ hết hiệu lực ngay lập tức.", "Rotating the code immediately expires the previous one.")}</p>
            <button type="button" onClick={() => void rotateCode()} className="mt-5 w-full rounded-2xl bg-white px-5 py-3 font-black text-stone-950">{l("새 코드 만들기", "Tạo mã mới", "Rotate join code")}</button>
          </aside>

          <section className="rounded-[2rem] bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-widest text-stone-400">MEMBERS</p><h2 className="mt-1 text-2xl font-black">{members.length} {l("명", "thành viên", "members")}</h2></div></div>
            <div className="mt-5 divide-y divide-stone-100">
              {members.map((member) => {
                const isOwner = member.membershipRole === "owner";
                const canRemove = !isOwner && (lab.membershipRole === "owner" || member.membershipRole === "member");
                return (
                  <article key={member.userId} className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center">
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-stone-100 font-black">{Array.from(member.name).slice(0, 1).join("").toUpperCase()}</div>
                    <div className="min-w-0 flex-1"><h3 className="truncate font-black">{member.name}</h3><p className="truncate text-sm font-medium text-stone-400">{member.profileRole || member.status || "Lab member"}</p></div>
                    {lab.membershipRole === "owner" && !isOwner ? (
                      <select disabled={busyUserId === member.userId} value={member.membershipRole} onChange={(event) => void changeRole(member, event.target.value as "admin" | "member")} className="rounded-xl bg-stone-100 px-3 py-2 text-sm font-black"><option value="member">Member</option><option value="admin">Admin</option></select>
                    ) : <span className="rounded-full bg-stone-100 px-3 py-2 text-xs font-black uppercase">{member.membershipRole}</span>}
                    {canRemove && <button type="button" disabled={busyUserId === member.userId} onClick={() => void removeMember(member)} className="rounded-xl bg-red-50 px-3 py-2 text-sm font-black text-red-600 disabled:opacity-40">{l("삭제", "Xóa", "Remove")}</button>}
                  </article>
                );
              })}
            </div>
          </section>
        </section>
        {message && <p role="status" className="mt-5 rounded-2xl bg-white p-4 font-bold shadow-sm">{message}</p>}
      </div>
    </main>
  );
}

function Loading() {
  return <main className="grid min-h-screen place-items-center bg-[#f5f3ee]"><p className="font-black tracking-[.2em] text-stone-400">LABLOG ADMIN</p></main>;
}
