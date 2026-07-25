"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { labInitials, normalizeLabAccent } from "../../../lib/lab-branding";
import { useI18n } from "../../../lib/i18n";
import { type Lab, useLab } from "../../../lib/lab-tenancy";

export default function LabPortalSettingsPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const { labs, isLoading } = useLab();
  const { l } = useI18n();
  const lab = useMemo(
    () => labs.find((candidate) => candidate.slug === slug),
    [labs, slug],
  );

  useEffect(() => {
    if (!isLoading && !lab) router.replace("/labs");
  }, [isLoading, lab, router]);

  if (isLoading || !lab) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f5f3ee]">
        <p className="font-black text-stone-400">LABLOG</p>
      </main>
    );
  }
  if (lab.membershipRole !== "owner" && lab.membershipRole !== "admin") {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f5f3ee] px-5">
        <section className="rounded-[2rem] bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-black">
            {l("관리자 권한이 필요합니다", "Cần quyền quản trị", "Admin access required")}
          </h1>
          <Link href={"/labs/" + lab.slug} className="mt-5 inline-block rounded-full bg-stone-950 px-5 py-3 font-black text-white">
            {l("포털로", "Về portal", "Back to portal")}
          </Link>
        </section>
      </main>
    );
  }
  return <PortalSettingsForm key={lab.id} lab={lab} />;
}

function PortalSettingsForm({ lab }: { lab: Lab }) {
  const { updateLab } = useLab();
  const { l } = useI18n();
  const [name, setName] = useState(lab.name);
  const [description, setDescription] = useState(lab.description);
  const [logoUrl, setLogoUrl] = useState(lab.logoUrl ?? "");
  const [mapImageUrl, setMapImageUrl] = useState(lab.mapImageUrl);
  const [accent, setAccent] = useState(
    normalizeLabAccent(lab.themeConfig.accent ?? ""),
  );
  const [defaultLocale, setDefaultLocale] = useState<"ko" | "vi" | "en">(
    lab.defaultLocale,
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      await updateLab(lab.id, {
        name,
        description,
        logoUrl,
        mapImageUrl,
        accent,
        defaultLocale,
      });
      setMessage(l("저장했습니다.", "Đã lưu cài đặt portal.", "Portal settings saved."));
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Could not save portal settings.");
    } finally {
      setBusy(false);
    }
  }

  const previewAccent = normalizeLabAccent(accent);
  return (
    <main className="min-h-screen bg-[#f5f3ee] px-5 py-10 text-stone-950 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[.2em] text-stone-400">{lab.name} · PORTAL</p>
            <h1 className="mt-2 text-4xl font-black">{l("포털 설정", "Cài đặt portal", "Portal settings")}</h1>
          </div>
          <Link href={"/labs/" + lab.slug} className="rounded-full bg-white px-5 py-3 text-sm font-black shadow-sm">
            {l("미리보기", "Xem portal", "View portal")}
          </Link>
        </header>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_.8fr]">
          <form onSubmit={submit} className="space-y-5 rounded-[2rem] bg-white p-6 shadow-sm">
            <Field label={l("랩 이름", "Tên lab", "Lab name")} value={name} onChange={setName} required />
            <label className="block text-sm font-black">
              {l("설명", "Mô tả", "Description")}
              <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={4} className="mt-2 w-full rounded-xl bg-stone-100 px-4 py-3 font-bold outline-none focus:ring-2 focus:ring-violet-300" />
            </label>
            <Field label="Logo URL" value={logoUrl} onChange={setLogoUrl} placeholder="https://…" />
            <Field label={l("랩 맵 이미지", "Ảnh bản đồ lab", "Lab map image")} value={mapImageUrl} onChange={setMapImageUrl} placeholder="/lab-tour-room-v5.png" />
            <label className="block text-sm font-black">
              {l("대표 색상", "Màu thương hiệu", "Brand colour")}
              <div className="mt-2 flex gap-3">
                <input type="color" value={previewAccent} onChange={(event) => setAccent(event.target.value)} className="h-12 w-16 rounded-xl bg-stone-100 p-1" />
                <input value={accent} onChange={(event) => setAccent(event.target.value)} pattern="#[0-9a-fA-F]{6}" className="flex-1 rounded-xl bg-stone-100 px-4 py-3 font-bold uppercase" />
              </div>
            </label>
            <label className="block text-sm font-black">
              {l("기본 언어", "Ngôn ngữ mặc định", "Default language")}
              <select value={defaultLocale} onChange={(event) => setDefaultLocale(event.target.value as "ko" | "vi" | "en")} className="mt-2 w-full rounded-xl bg-stone-100 px-4 py-3 font-bold">
                <option value="ko">한국어</option><option value="vi">Tiếng Việt</option><option value="en">English</option>
              </select>
            </label>
            <button disabled={busy || name.trim().length < 2} className="w-full rounded-2xl px-5 py-4 font-black text-stone-950 disabled:opacity-40" style={{ backgroundColor: previewAccent }}>
              {busy ? l("저장 중…", "Đang lưu…", "Saving…") : l("포털 저장", "Lưu portal", "Save portal")}
            </button>
            {message && <p role="status" className="rounded-xl bg-stone-100 p-3 text-sm font-bold">{message}</p>}
          </form>

          <aside className="self-start rounded-[2rem] bg-stone-950 p-6 text-white shadow-xl lg:sticky lg:top-6">
            <p className="text-xs font-black tracking-[.2em] text-white/40">LIVE PREVIEW</p>
            <div className="mt-5 flex items-center gap-4">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt="" className="h-16 w-16 rounded-2xl bg-white object-contain p-2" />
              ) : (
                <div className="grid h-16 w-16 place-items-center rounded-2xl font-black text-stone-950" style={{ backgroundColor: previewAccent }}>{labInitials(name)}</div>
              )}
              <div><h2 className="text-2xl font-black">{name || lab.name}</h2><p className="mt-1 text-sm font-medium text-white/50">{description || l("랩 포털 설명", "Mô tả portal lab", "Lab portal description")}</p></div>
            </div>
            <div className="mt-6 h-2 rounded-full" style={{ backgroundColor: previewAccent }} />
          </aside>
        </div>
      </div>
    </main>
  );
}

function Field({ label, value, onChange, placeholder, required = false }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; required?: boolean }) {
  return (
    <label className="block text-sm font-black">
      {label}
      <input required={required} minLength={required ? 2 : undefined} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="mt-2 w-full rounded-xl bg-stone-100 px-4 py-3 font-bold outline-none focus:ring-2 focus:ring-violet-300" />
    </label>
  );
}
