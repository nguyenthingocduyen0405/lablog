"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useLab } from "../lib/lab-tenancy";
import { useI18n } from "../lib/i18n";
import { createLabSlug } from "../lib/lab-slug";
import { useRolePreview } from "../lib/role-preview";

export default function LabsPage() {
  const { l } = useI18n();
  const { labs, activeLab, schemaReady, error, createLab, joinLab, switchLab } =
    useLab();
  const {
    isPlatformAdmin: platformAdminAccess,
    previewRole,
    previewLabRole,
  } = useRolePreview();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const visibleLabs = previewRole
    ? labs.filter((lab) => lab.id === activeLab.id)
    : labs;
  const platformAdmin = platformAdminAccess && !previewRole;
  const showPlatformControls = platformAdmin;

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const lab = await createLab({
        name: name.trim(),
        slug: createLabSlug(name),
        description: description.trim(),
        defaultLocale: "ko",
      });
      switchLab(lab, "/labs/" + lab.slug + "/quests");
    } catch (caught) {
      setMessage(
        caught instanceof Error ? caught.message : "Could not create lab.",
      );
      setBusy(false);
    }
  }

  async function handleJoin(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const lab = await joinLab(joinCode.trim().toUpperCase());
      switchLab(lab, "/");
    } catch (caught) {
      setMessage(
        caught instanceof Error ? caught.message : "Could not join lab.",
      );
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f5f3ee] px-5 py-10 text-stone-950 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[.2em] text-stone-400">
              LABLOG
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-5xl">
              {l("랩 관리", "Quản lý lab", "Manage labs")}
            </h1>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {platformAdmin && <Link href="/admin" className="rounded-full bg-stone-950 px-5 py-3 text-sm font-black text-white">{l("플랫폼 관리", "Quản trị hệ thống", "Platform admin")}</Link>}
          </div>
        </div>

        {!schemaReady && (
          <div className="mb-6 rounded-3xl border-2 border-amber-300 bg-amber-50 p-5 font-bold text-amber-900">
            {l(
              "Supabase에 멀티 랩 마이그레이션을 먼저 적용해 주세요.",
              "Hãy chạy migration multi-lab trên Supabase trước.",
              "Apply the multi-lab migration to Supabase first.",
            )}
          </div>
        )}

        <section className="grid gap-4 md:grid-cols-2">
          {visibleLabs.map((lab) => (
            <article
              key={lab.id}
              className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-black/[0.05]"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-stone-400">
                    {previewLabRole(lab.membershipRole) === "admin"
                      ? l("LAB 관리자", "QUẢN TRỊ VIÊN LAB", "LAB ADMIN")
                      : previewLabRole(lab.membershipRole) === "owner"
                        ? l("LAB 소유자", "CHỦ LAB", "LAB OWNER")
                        : l("멤버", "THÀNH VIÊN", "MEMBER")}
                  </p>
                  <h2 className="mt-1 text-2xl font-black">{lab.name}</h2>
                  <p className="mt-2 text-sm font-medium text-stone-500">
                    {lab.description || lab.slug}
                  </p>
                </div>
                {lab.id === activeLab.id && (
                  <span className="rounded-full bg-[#ffd84d] px-3 py-1 text-xs font-black">
                    ACTIVE
                  </span>
                )}
              </div>
              {(previewLabRole(lab.membershipRole) === "owner" ||
                previewLabRole(lab.membershipRole) === "admin") &&
                lab.joinCode && (
                  <p className="mt-5 rounded-2xl bg-stone-100 px-4 py-3 text-sm font-bold">
                    {l("초대 코드", "Mã mời", "Join code")}:{" "}
                    <span className="font-black tracking-widest">
                      {lab.joinCode}
                    </span>
                  </p>
                )}
              <Link
                href={"/labs/" + lab.slug}
                className="mt-5 block w-full rounded-2xl bg-stone-950 px-5 py-3 text-center text-sm font-black text-white"
              >
                {l("랩 포털 열기", "Mở portal lab", "Open lab portal")}
              </Link>
              {(previewLabRole(lab.membershipRole) === "owner" ||
                previewLabRole(lab.membershipRole) === "admin") && (
                <div className="mt-3 grid gap-2">
                  <Link href={"/labs/" + lab.slug + "/admin"} className="rounded-2xl bg-[#ffd84d] px-4 py-3 text-center text-sm font-black text-stone-950">
                    {l("랩 관리", "Quản trị Lab", "Lab administration")}
                  </Link>
                  <div className="grid grid-cols-2 gap-2">
                  <Link href={"/labs/" + lab.slug + "/settings"} className="rounded-2xl bg-stone-100 px-4 py-3 text-center text-sm font-black text-stone-600">
                    {l("포털 설정", "Cài đặt", "Settings")}
                  </Link>
                  <Link href={"/labs/" + lab.slug + "/quests"} className="rounded-2xl bg-violet-100 px-4 py-3 text-center text-sm font-black text-violet-700">
                    {l("퀘스트 설계", "Thiết kế Quest", "Design quests")}
                  </Link>
                  </div>
                </div>
              )}
            </article>
          ))}
        </section>

       <section className="mt-8 grid gap-5 lg:grid-cols-2">
          {showPlatformControls && <form
            onSubmit={handleCreate}
            className="rounded-[2rem] bg-white p-6 shadow-sm"
          >
            <h2 className="text-xl font-black">
              {l("새 랩 만들기", "Tạo lab mới", "Create a lab")}
            </h2>
            <input
              required
              minLength={2}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={l("랩 이름", "Tên lab", "Lab name")}
              className="mt-5 w-full rounded-2xl bg-stone-100 px-4 py-3 font-bold outline-none focus:ring-2 focus:ring-[#ffd84d]"
            />
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder={l("랩 소개", "Mô tả lab", "Lab description")}
              className="mt-3 min-h-24 w-full resize-none rounded-2xl bg-stone-100 px-4 py-3 font-bold outline-none focus:ring-2 focus:ring-[#ffd84d]"
            />
            <button
              disabled={busy || !schemaReady}
              className="mt-3 w-full rounded-2xl bg-[#ffd84d] px-5 py-3 font-black disabled:opacity-40"
            >
              {l("만들기", "Tạo lab", "Create")}
            </button>
         </form>}
         <form
            onSubmit={handleJoin}
            className="rounded-[2rem] bg-white p-6 shadow-sm"
          >
            <h2 className="text-xl font-black">
              {l(
                "초대 코드로 참여",
                "Tham gia bằng mã mời",
                "Join with a code",
              )}
            </h2>
            <input
              required
              value={joinCode}
              onChange={(event) => setJoinCode(event.target.value)}
              placeholder="ABCD1234"
              className="mt-5 w-full rounded-2xl bg-stone-100 px-4 py-3 text-center text-lg font-black uppercase tracking-[.25em] outline-none focus:ring-2 focus:ring-[#ffd84d]"
            />
            <button
              disabled={busy || !schemaReady}
              className="mt-3 w-full rounded-2xl bg-stone-950 px-5 py-3 font-black text-white disabled:opacity-40"
            >
              {l("참여하기", "Tham gia", "Join")}
            </button>
          </form>
        </section>
        {(message || error) && (
          <p
            role="alert"
            className="mt-5 rounded-2xl bg-red-50 p-4 font-bold text-red-700"
          >
            {message || error}
          </p>
        )}
      </div>
    </main>
  );
}
