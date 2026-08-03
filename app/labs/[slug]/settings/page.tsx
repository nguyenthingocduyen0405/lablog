"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import LabMapLayoutEditor from "../../../components/lab-map-layout-editor";
import { labInitials, normalizeLabAccent } from "../../../lib/lab-branding";
import { useI18n } from "../../../lib/i18n";
import { type Lab, useLab } from "../../../lib/lab-tenancy";
import { useRolePreview } from "../../../lib/role-preview";
import {
  labMapFileError,
  labMapStoragePath,
  removeLabMapFile,
  uploadLabMapFile,
} from "../../../lib/lab-assets";

export default function LabPortalSettingsPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const { labs, isLoading } = useLab();
  const { previewLabRole } = useRolePreview();
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

  const visibleRole = previewLabRole(lab.membershipRole);
  if (visibleRole !== "owner" && visibleRole !== "admin") {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f5f3ee] px-5">
        <section className="rounded-[2rem] bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-black">
            {l(
              "관리자 권한이 필요합니다",
              "Cần quyền quản trị",
              "Admin access required",
            )}
          </h1>
          <Link
            href={"/labs/" + lab.slug}
            className="mt-5 inline-block rounded-full bg-stone-950 px-5 py-3 font-black text-white"
          >
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
  const [mapAspectRatio, setMapAspectRatio] = useState(lab.mapAspectRatio);
  const [mapSeatLayout, setMapSeatLayout] = useState(lab.mapSeatLayout);
  const [pendingMapFile, setPendingMapFile] = useState<File | null>(null);
  const [pendingMapPreviewUrl, setPendingMapPreviewUrl] = useState("");
  const [accent, setAccent] = useState(
    normalizeLabAccent(lab.themeConfig.accent ?? ""),
  );
  const [defaultLocale, setDefaultLocale] = useState<"ko" | "vi" | "en">(
    lab.defaultLocale,
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(
    () => () => {
      if (pendingMapPreviewUrl) URL.revokeObjectURL(pendingMapPreviewUrl);
    },
    [pendingMapPreviewUrl],
  );

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const previousPath = labMapStoragePath(lab.mapImageUrl);
    let uploadedPath = "";

    try {
      let nextMapImageUrl = mapImageUrl;
      if (pendingMapFile) {
        const upload = await uploadLabMapFile(lab.id, pendingMapFile);
        uploadedPath = upload.path;
        nextMapImageUrl = upload.publicUrl;
      }

      const updated = await updateLab(lab.id, {
        name,
        description,
        logoUrl,
        mapImageUrl: nextMapImageUrl,
        mapAspectRatio,
        mapSeatLayout,
        accent,
        defaultLocale,
      });

      setMapImageUrl(updated.mapImageUrl);
      setMapAspectRatio(updated.mapAspectRatio);
      setMapSeatLayout(updated.mapSeatLayout);
      setPendingMapFile(null);
      setPendingMapPreviewUrl("");

      if (
        previousPath &&
        previousPath !== uploadedPath &&
        updated.mapImageUrl !== lab.mapImageUrl
      ) {
        await removeLabMapFile(previousPath).catch(() => undefined);
      }

      setMessage(
        l(
          "포털 설정과 랩 지도 배치를 저장했습니다.",
          "Đã lưu cài đặt portal và bố cục sơ đồ Lab.",
          "Portal settings and the Lab map layout were saved.",
        ),
      );
    } catch (caught) {
      if (uploadedPath) {
        await removeLabMapFile(uploadedPath).catch(() => undefined);
      }
      setMessage(
        caught instanceof Error
          ? caught.message
          : l(
              "포털 설정을 저장하지 못했습니다.",
              "Không thể lưu cài đặt portal.",
              "Could not save portal settings.",
            ),
      );
    } finally {
      setBusy(false);
    }
  }

  function selectMap(file: File) {
    const issue = labMapFileError(file);
    if (issue) {
      setMessage(
        issue === "type"
          ? l(
              "PNG, JPEG 또는 WebP 이미지를 선택해 주세요.",
              "Hãy chọn ảnh PNG, JPEG hoặc WebP.",
              "Choose a PNG, JPEG, or WebP image.",
            )
          : l(
              "랩 지도 이미지는 10MB 이하여야 합니다.",
              "Ảnh sơ đồ Lab phải có dung lượng tối đa 10 MB.",
              "The Lab map image must be 10 MB or smaller.",
            ),
      );
      return;
    }

    setMessage("");
    setPendingMapFile(file);
    setPendingMapPreviewUrl(URL.createObjectURL(file));
  }

  const previewAccent = normalizeLabAccent(accent);
  return (
    <main className="min-h-screen bg-[#f5f3ee] px-5 py-10 text-stone-950 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[.2em] text-stone-400">
              {lab.name} · PORTAL
            </p>
            <h1 className="mt-2 text-4xl font-black">
              {l("포털 설정", "Cài đặt portal", "Portal settings")}
            </h1>
          </div>
          <Link
            href={"/labs/" + lab.slug}
            className="rounded-full bg-white px-5 py-3 text-sm font-black shadow-sm"
          >
            {l("미리보기", "Xem portal", "View portal")}
          </Link>
        </header>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_.8fr]">
          <form
            onSubmit={submit}
            className="space-y-5 rounded-[2rem] bg-white p-6 shadow-sm"
          >
            <Field
              label={l("랩 이름", "Tên lab", "Lab name")}
              value={name}
              onChange={setName}
              required
            />
            <label className="block text-sm font-black">
              {l("설명", "Mô tả", "Description")}
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={4}
                className="mt-2 w-full rounded-xl bg-stone-100 px-4 py-3 font-bold outline-none focus:ring-2 focus:ring-violet-300"
              />
            </label>
            <Field
              label="Logo URL"
              value={logoUrl}
              onChange={setLogoUrl}
              placeholder="https://"
            />

            <section
              aria-labelledby="lab-map-settings-title"
              className="rounded-2xl border border-violet-100 bg-violet-50/70 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[.18em] text-violet-500">
                    LAB MAP EDITOR
                  </p>
                  <h2
                    id="lab-map-settings-title"
                    className="mt-1 text-lg font-black"
                  >
                    {l("랩 지도", "Sơ đồ Lab", "Lab map")}
                  </h2>
                  <p className="mt-1 text-xs font-bold text-stone-500">
                    {l(
                      "새 이미지를 선택하고 좌석 번호를 맞춘 뒤 저장하세요.",
                      "Chọn ảnh mới, kéo các số vào đúng ghế rồi lưu.",
                      "Choose a new image, align the seat numbers, then save.",
                    )}
                  </p>
                </div>
                <label
                  className={`cursor-pointer rounded-xl bg-violet-600 px-4 py-2 text-sm font-black text-white ${busy ? "pointer-events-none opacity-40" : ""}`}
                >
                  {l("지도 선택", "Chọn sơ đồ", "Choose map")}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    disabled={busy}
                    className="sr-only"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      event.target.value = "";
                      if (file) selectMap(file);
                    }}
                  />
                </label>
              </div>

              <div className="mt-4">
                <LabMapLayoutEditor
                  imageUrl={pendingMapPreviewUrl || mapImageUrl}
                  aspectRatio={mapAspectRatio}
                  seats={mapSeatLayout}
                  disabled={busy}
                  onAspectRatioChange={setMapAspectRatio}
                  onSeatsChange={setMapSeatLayout}
                />
              </div>

              {pendingMapFile && (
                <p className="mt-3 rounded-xl bg-amber-100 px-3 py-2 text-xs font-black text-amber-800">
                  {l(
                    "새 지도는 저장하기 전까지 멤버에게 표시되지 않습니다.",
                    "Sơ đồ mới chưa hiển thị cho thành viên cho đến khi bạn lưu.",
                    "The new map stays private until you save.",
                  )}
                </p>
              )}

              <p className="mt-3 text-xs font-bold text-stone-400">
                PNG, JPEG, WebP · MAX 10 MB
              </p>
              <div className="mt-3">
                <Field
                  label={l(
                    "지도 이미지 URL",
                    "URL ảnh sơ đồ",
                    "Map image URL",
                  )}
                  value={mapImageUrl}
                  onChange={(value) => {
                    setMapImageUrl(value);
                    setPendingMapFile(null);
                    setPendingMapPreviewUrl("");
                  }}
                  placeholder="/lab-tour-room-v5.png"
                />
              </div>
            </section>

            <label className="block text-sm font-black">
              {l("브랜드 색상", "Màu thương hiệu", "Brand colour")}
              <div className="mt-2 flex gap-3">
                <input
                  type="color"
                  value={previewAccent}
                  onChange={(event) => setAccent(event.target.value)}
                  className="h-12 w-16 rounded-xl bg-stone-100 p-1"
                />
                <input
                  value={accent}
                  onChange={(event) => setAccent(event.target.value)}
                  pattern="#[0-9a-fA-F]{6}"
                  className="flex-1 rounded-xl bg-stone-100 px-4 py-3 font-bold uppercase"
                />
              </div>
            </label>

            <label className="block text-sm font-black">
              {l("기본 언어", "Ngôn ngữ mặc định", "Default language")}
              <select
                value={defaultLocale}
                onChange={(event) =>
                  setDefaultLocale(
                    event.target.value as "ko" | "vi" | "en",
                  )
                }
                className="mt-2 w-full rounded-xl bg-stone-100 px-4 py-3 font-bold"
              >
                <option value="ko">한국어</option>
                <option value="vi">Tiếng Việt</option>
                <option value="en">English</option>
              </select>
            </label>

            <button
              disabled={busy || name.trim().length < 2}
              className="w-full rounded-2xl px-5 py-4 font-black text-stone-950 disabled:opacity-40"
              style={{ backgroundColor: previewAccent }}
            >
              {busy
                ? l("저장 중...", "Đang lưu...", "Saving...")
                : l("포털 저장", "Lưu portal", "Save portal")}
            </button>
            {message && (
              <p
                role="status"
                className="rounded-xl bg-stone-100 p-3 text-sm font-bold"
              >
                {message}
              </p>
            )}
          </form>

          <aside className="self-start rounded-[2rem] bg-stone-950 p-6 text-white shadow-xl lg:sticky lg:top-6">
            <p className="text-xs font-black tracking-[.2em] text-white/40">
              LIVE PREVIEW
            </p>
            <div className="mt-5 flex items-center gap-4">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoUrl}
                  alt=""
                  className="h-16 w-16 rounded-2xl bg-white object-contain p-2"
                />
              ) : (
                <div
                  className="grid h-16 w-16 place-items-center rounded-2xl font-black text-stone-950"
                  style={{ backgroundColor: previewAccent }}
                >
                  {labInitials(name)}
                </div>
              )}
              <div>
                <h2 className="text-2xl font-black">{name || lab.name}</h2>
                <p className="mt-1 text-sm font-medium text-white/50">
                  {description ||
                    l(
                      "랩 포털 설명",
                      "Mô tả portal lab",
                      "Lab portal description",
                    )}
                </p>
              </div>
            </div>
            <div
              className="mt-6 h-2 rounded-full"
              style={{ backgroundColor: previewAccent }}
            />
          </aside>
        </div>
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block text-sm font-black">
      {label}
      <input
        required={required}
        minLength={required ? 2 : undefined}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-2 w-full rounded-xl bg-stone-100 px-4 py-3 font-bold outline-none focus:ring-2 focus:ring-violet-300"
      />
    </label>
  );
}
