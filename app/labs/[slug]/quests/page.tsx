"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useI18n } from "../../../lib/i18n";
import { useLab } from "../../../lib/lab-tenancy";
import { labQuestHref } from "../../../lib/lab-routing";
import {
  createStarterQuest,
  deleteQuestChapter,
  deleteQuestMission,
  EMPTY_LOCALIZED_TEXT,
  loadQuestContent,
  localizedText,
  importQuestBundle,
  missionDraftError,
  moveQuestItem,
  parseQuestBundle,
  reorderQuestChapters,
  reorderQuestMissions,
  saveQuestChapter,
  saveQuestMission,
  serializeQuestBundle,
  singleLanguageText,
  setQuestChapterActive,
  setQuestMissionActive,
  type ChapterDraft,
  type LocalizedText,
  type MissionDraft,
  type MissionTemplateType,
  type QuestLocale,
  type QuestChapter,
  type QuestMission,
} from "../../../lib/quest-admin";
import { loadPapers, type LabPaper } from "../../../lib/paper-club";
import { FEATURE_UNLOCK_STAGES } from "../../../lib/feature-access";

const TYPES: MissionTemplateType[] = [
  "custom",
  "quiz",
  "paper",
  "matching",
  "ordering",
  "code-output",
  "code-editor",
  "graph",
];

const emptyChapter = (): ChapterDraft => ({
  title: { ...EMPTY_LOCALIZED_TEXT },
  description: { ...EMPTY_LOCALIZED_TEXT },
});

const emptyMission = (): MissionDraft => ({
  title: { ...EMPTY_LOCALIZED_TEXT },
  instructions: { ...EMPTY_LOCALIZED_TEXT },
  missionType: "custom",
  options: ["", ""],
  answerIndex: 0,
  items: ["", ""],
  pairs: [{ left: "", right: "" }, { left: "", right: "" }],
  prompt: "",
  expectedAnswer: "",
  starterCode: "",
  rewardPoints: 10,
  paperId: "",
  paperTitle: "",
  paperUrl: "",
});

export default function QuestEditorPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const { locale, l } = useI18n();
  const { labs, isLoading, switchLab } = useLab();
  const lab = useMemo(
    () => labs.find((candidate) => candidate.slug === slug),
    [labs, slug],
  );
  const [chapters, setChapters] = useState<QuestChapter[]>([]);
  const [missions, setMissions] = useState<QuestMission[]>([]);
  const [papers, setPapers] = useState<LabPaper[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [chapterDraft, setChapterDraft] = useState<ChapterDraft>(emptyChapter);
  const [chapterId, setChapterId] = useState<string | null>(null);
  const [missionDraft, setMissionDraft] = useState<MissionDraft>(emptyMission);
  const [missionChapterId, setMissionChapterId] = useState<string | null>(null);
  const [missionId, setMissionId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!lab) return;
    setLoading(true);
    try {
      const [result, paperResult] = await Promise.all([
        loadQuestContent(lab.id),
        loadPapers(lab.id).catch(() => [] as LabPaper[]),
      ]);
      setChapters(result.chapters);
      setMissions(result.missions);
      setPapers(paperResult);
      setError("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load quests.");
    } finally {
      setLoading(false);
    }
  }, [lab]);

  useEffect(() => {
    if (isLoading) return;
    if (!lab) return router.replace("/labs");
    if (!["owner", "admin"].includes(lab.membershipRole)) return;
    const timeoutId = window.setTimeout(() => {
      void refresh();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [isLoading, lab, refresh, router]);

  const translated = (text: LocalizedText) =>
    text[locale] || text.ko || text.vi || text.en;

  async function act(work: () => Promise<void>, success: string) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await work();
      await refresh();
      setNotice(success);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Action failed.");
    } finally {
      setBusy(false);
    }
  }

  async function submitChapter(event: FormEvent) {
    event.preventDefault();
    if (!lab) return;
    if (!Object.values(chapterDraft.title).some((value) => value.trim())) {
      setError(l("제목을 하나 이상 입력해 주세요.", "Hãy nhập tiêu đề bằng ít nhất một ngôn ngữ.", "Enter a title in at least one language."));
      return;
    }
    await act(async () => {
      await saveQuestChapter(
        lab.id,
        chapterDraft,
        chapters,
        chapterId ?? undefined,
      );
      setChapterId(null);
      setChapterDraft(emptyChapter());
    }, l("챕터를 저장했습니다.", "Đã lưu Chapter.", "Chapter saved."));
  }

  async function submitMission(event: FormEvent) {
    event.preventDefault();
    if (!missionChapterId || !lab) return;
    const draftError = missionDraftError(missionDraft);
    if (draftError) {
      setError(
        draftError === "title"
          ? l("제목을 입력하세요.", "Hãy nhập tiêu đề.", "Enter a title.")
          : draftError === "quiz-options"
            ? l("선택지를 두 개 이상 입력하세요.", "Nhập ít nhất hai lựa chọn.", "Enter at least two options.")
            : draftError === "matching-pairs"
              ? l("연결할 쌍을 두 개 이상 입력하세요.", "Nhập ít nhất hai cặp để nối.", "Enter at least two matching pairs.")
              : draftError === "ordering-items"
                ? l("순서 항목을 두 개 이상 입력하세요.", "Nhập ít nhất hai mục để sắp xếp.", "Enter at least two ordering items.")
                : l("정답을 입력하세요.", "Hãy nhập đáp án mong đợi.", "Enter the expected answer."),
      );
      return;
    }
    await act(async () => {
      await saveQuestMission(
        missionChapterId,
        missionDraft,
        missions,
        missionId ?? undefined,
      );
      closeMission();
    }, l("미션을 저장했습니다.", "Đã lưu Mission.", "Mission saved."));
  }

  function editChapter(chapter: QuestChapter) {
    setChapterId(chapter.id);
    setChapterDraft({
      title: localizedText(chapter.title_i18n),
      description: localizedText(chapter.description_i18n),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openMission(chapter: QuestChapter, mission?: QuestMission) {
    setMissionChapterId(chapter.id);
    setMissionId(mission?.id ?? null);
    if (!mission) return setMissionDraft(emptyMission());
    const options = Array.isArray(mission.content.options)
      ? mission.content.options.map(String)
      : ["", ""];
    const items = Array.isArray(mission.content.items)
      ? mission.content.items.map(String)
      : ["", ""];
    const pairs = Array.isArray(mission.content.pairs)
      ? mission.content.pairs.map((pair) => {
          const value = pair && typeof pair === "object" ? pair as Record<string, unknown> : {};
          return { left: String(value.left ?? ""), right: String(value.right ?? "") };
        })
      : items.map((item) => ({ left: item, right: "" }));
    setMissionDraft({
      title: localizedText(mission.title_i18n),
      instructions: localizedText(mission.instructions_i18n),
      missionType:
        mission.mission_type === "ordering" &&
        mission.validation.matching === true
          ? "matching"
          : mission.mission_type,
      options: options.length > 1 ? options : ["", ""],
      answerIndex:
        typeof mission.validation.answerIndex === "number"
          ? mission.validation.answerIndex
          : 0,
      items: items.length > 1 ? items : ["", ""],
      pairs: pairs.length > 1 ? pairs : [{ left: "", right: "" }, { left: "", right: "" }],
      prompt: String(
        mission.content.responsePlaceholder ??
          mission.content.graphPrompt ??
          mission.content.confirmationLabel ??
          "",
      ),
      expectedAnswer: String(mission.validation.expectedAnswer ?? ""),
      starterCode: String(
        mission.content.starterCode ?? mission.content.codeSnippet ?? "",
      ),
      rewardPoints:
        typeof mission.content.rewardPoints === "number"
          ? mission.content.rewardPoints
          : 10,
      paperId: mission.paper_id ?? "",
      paperTitle: String(mission.content.paperTitle ?? ""),
      paperUrl: String(mission.content.paperUrl ?? ""),
    });
  }

  function closeMission() {
    setMissionChapterId(null);
    setMissionId(null);
    setMissionDraft(emptyMission());
  }

  function moveChapter(chapterId: string, direction: -1 | 1) {
    if (!lab) return;
    const next = moveQuestItem(chapters, chapterId, direction);
    if (next === chapters) return;
    void act(
      () => reorderQuestChapters(lab.id, next.map((chapter) => chapter.id)),
      l("챕터 순서를 변경했습니다.", "Đã đổi thứ tự Chapter.", "Chapter order updated."),
    );
  }

  function moveMission(chapterId: string, missionId: string, direction: -1 | 1) {
    const siblings = missions.filter((mission) => mission.chapter_id === chapterId);
    const next = moveQuestItem(siblings, missionId, direction);
    if (next === siblings) return;
    void act(
      () => reorderQuestMissions(chapterId, next.map((mission) => mission.id)),
      l("미션 순서를 변경했습니다.", "Đã đổi thứ tự Mission.", "Mission order updated."),
    );
  }

  function exportQuest() {
    if (!lab) return;
    const blob = new Blob([serializeQuestBundle(chapters, missions)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${lab.slug}-quest.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setNotice(l("퀘스트를 내보냈습니다.", "Đã xuất Quest.", "Quest exported."));
  }

  async function importQuest(file: File) {
    if (!lab) return;
    const bundle = parseQuestBundle(await file.text());
    await act(
      () => importQuestBundle(lab.id, bundle),
      l("퀘스트를 가져왔습니다.", "Đã nhập Quest.", "Quest imported."),
    );
  }

  if (isLoading || !lab) return <Loading />;
  if (!["owner", "admin"].includes(lab.membershipRole)) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f5f3ee] px-5">
        <section className="rounded-[2rem] bg-white p-8 text-center shadow-sm">
          <div className="text-4xl">🔒</div>
          <h1 className="mt-4 text-2xl font-black">
            {l("관리자 권한이 필요합니다", "Cần quyền quản trị", "Admin access required")}
          </h1>
          <Link href="/labs" className="mt-6 inline-block rounded-full bg-stone-950 px-6 py-3 font-black text-white">
            {l("랩 관리로", "Về quản lý lab", "Back to labs")}
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f5f3ee] px-5 py-10 text-stone-950 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[.2em] text-violet-500">
              {lab.name} · QUEST STUDIO
            </p>
            <h1 className="mt-2 text-4xl font-black sm:text-6xl">
              {l("퀘스트 설계", "Thiết kế Quest", "Quest designer")}
            </h1>
            <p className="mt-3 max-w-2xl font-medium leading-7 text-stone-500">
              {l(
                "코드 없이 챕터와 미션을 만들고 공개 상태를 관리하세요.",
                "Tạo Chapter và Mission, quản lý xuất bản mà không cần code.",
                "Create chapters and missions and manage publishing without code.",
              )}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href={"/labs/" + lab.slug + "/papers"} className="rounded-full bg-violet-100 px-5 py-3 text-sm font-black text-violet-700">
              {l("페이퍼 클럽", "Paper Club", "Paper Club")}
            </Link>
            <button type="button" onClick={exportQuest} disabled={busy || chapters.length === 0} className="rounded-full bg-white px-5 py-3 text-sm font-black shadow-sm disabled:opacity-40">
              {l("내보내기", "Xuất JSON", "Export JSON")}
            </button>
            <label className="cursor-pointer rounded-full bg-white px-5 py-3 text-sm font-black shadow-sm">
              {l("가져오기", "Nhập JSON", "Import JSON")}
              <input type="file" accept="application/json,.json" disabled={busy} className="sr-only" onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (!file) return;
                void importQuest(file).catch((caught) => setError(caught instanceof Error ? caught.message : "Import failed."));
              }} />
            </label>
            <Link href={"/labs/" + lab.slug} className="rounded-full bg-white px-5 py-3 text-sm font-black shadow-sm">
              {l("랩 포털", "Portal lab", "Lab portal")}
            </Link>
            <button onClick={() => switchLab(lab, labQuestHref(lab.slug))} className="rounded-full bg-[#ffd84d] px-5 py-3 text-sm font-black">
              {l("미리보기", "Xem trước", "Preview")}
            </button>
            <Link href="/labs" className="rounded-full bg-white px-5 py-3 text-sm font-black shadow-sm">
              {l("랩 관리", "Quản lý lab", "Manage labs")}
            </Link>
          </div>
        </header>

        {(error || notice) && (
          <p
            role={error ? "alert" : "status"}
            className={
              "mt-6 rounded-2xl p-4 font-bold " +
              (error ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700")
            }
          >
            {error || notice}
          </p>
        )}

        <section className="mt-8 rounded-[2rem] bg-white p-6 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[.2em] text-violet-500">
            {l("기능 잠금 해제", "Mở khóa tính năng", "Feature unlocks")}
          </p>
          <h2 className="mt-2 text-2xl font-black">
            {l(
              "게임을 설계하면 기능이 열립니다",
              "Thiết kế game để mở khóa tính năng",
              "Design the game to unlock features",
            )}
          </h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {FEATURE_UNLOCK_STAGES.map((stage) => (
              <article key={stage.id} className="rounded-2xl bg-stone-100 p-4">
                <p className="text-xs font-black uppercase tracking-wider text-stone-400">
                  {stage.label}
                </p>
                <p className="mt-2 text-sm font-black">
                  {stage.features.join(" · ")}
                </p>
              </article>
            ))}
          </div>
          <p className="mt-4 text-sm font-bold text-stone-500">
            {l(
              "랩 소유자와 관리자는 설정을 위해 모든 기능을 바로 사용할 수 있습니다.",
              "Chủ lab và quản trị viên luôn truy cập được mọi tính năng để cấu hình.",
              "Lab owners and admins can always access every feature for setup.",
            )}
          </p>
        </section>

        {!loading && chapters.length === 0 && (
          <section className="mt-8 rounded-[2rem] bg-stone-950 p-8 text-white">
            <p className="text-xs font-black tracking-[.2em] text-[#ffd84d]">STARTER KIT</p>
            <h2 className="mt-3 text-3xl font-black">
              {l("빈 화면에서 시작하지 마세요", "Không cần bắt đầu từ trang trống", "Do not start empty")}
            </h2>
            <p className="mt-3 max-w-2xl font-medium leading-7 text-white/60">
              {l(
                "온보딩 챕터와 세 개의 미션을 만든 뒤 자유롭게 수정하세요.",
                "Tạo một Chapter onboarding cùng ba Mission mẫu rồi chỉnh sửa.",
                "Create an onboarding chapter with three starter missions, then customize it.",
              )}
            </p>
            <button
              disabled={busy}
              onClick={() =>
                void act(
                  async () => {
                    await createStarterQuest(lab.id);
                  },
                  l("시작 콘텐츠를 만들었습니다.", "Đã tạo nội dung mẫu.", "Starter content created."),
                )
              }
              className="mt-6 rounded-full bg-[#ffd84d] px-6 py-3 font-black text-stone-950 disabled:opacity-40"
            >
              {l("시작 콘텐츠 만들기", "Tạo nội dung mẫu", "Create starter content")}
            </button>
          </section>
        )}

        <div className="mt-8 grid gap-7 lg:grid-cols-[.8fr_1.2fr]">
          <ChapterEditor
            locale={locale}
            draft={chapterDraft}
            setDraft={setChapterDraft}
            editing={Boolean(chapterId)}
            busy={busy}
            l={l}
            onSubmit={submitChapter}
            onCancel={() => {
              setChapterId(null);
              setChapterDraft(emptyChapter());
            }}
          />

          <section className="space-y-5">
            {loading ? (
              <Loading compact />
            ) : (
              chapters.map((chapter, chapterIndex) => (
                <article key={chapter.id} className="rounded-[2rem] bg-white p-6 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-black tracking-[.15em] text-stone-400">
                        CHAPTER {chapter.order_index}
                      </p>
                      <h2 className="mt-2 text-2xl font-black">{translated(chapter.title_i18n)}</h2>
                      <p className="mt-2 font-medium text-stone-500">{translated(chapter.description_i18n)}</p>
                    </div>
                    <span className={
                      "rounded-full px-3 py-1 text-xs font-black " +
                      (chapter.active ? "bg-emerald-100 text-emerald-700" : "bg-stone-100 text-stone-500")
                    }>
                      {chapter.active ? "PUBLISHED" : "DRAFT"}
                    </span>
                  </div>
                  <div className="mt-5 flex flex-wrap gap-2">
                    <SmallButton onClick={() => moveChapter(chapter.id, -1)} disabled={chapterIndex === 0 || busy}>{l("위로", "Lên", "Up")}</SmallButton>
                    <SmallButton onClick={() => moveChapter(chapter.id, 1)} disabled={chapterIndex === chapters.length - 1 || busy}>{l("아래로", "Xuống", "Down")}</SmallButton>
                    <SmallButton disabled={busy} onClick={() => editChapter(chapter)}>{l("수정", "Sửa", "Edit")}</SmallButton>
                    <SmallButton disabled={busy} onClick={() =>
                      void act(
                        () => setQuestChapterActive(chapter.id, !chapter.active),
                        l("공개 상태를 변경했습니다.", "Đã đổi trạng thái.", "Publishing updated."),
                      )
                    }>
                      {chapter.active ? l("숨기기", "Ẩn", "Unpublish") : l("공개", "Xuất bản", "Publish")}
                    </SmallButton>
                    <SmallButton danger disabled={busy} onClick={() => {
                      if (!window.confirm(l("챕터와 모든 미션을 삭제할까요?", "Xóa Chapter và toàn bộ Mission?", "Delete chapter and all missions?"))) return;
                      void act(
                        () => deleteQuestChapter(chapter.id),
                        l("챕터를 삭제했습니다.", "Đã xóa Chapter.", "Chapter deleted."),
                      );
                    }}>{l("삭제", "Xóa", "Delete")}</SmallButton>
                  </div>

                  <div className="mt-6 space-y-3 border-t border-stone-100 pt-5">
                    {missions.filter((mission) => mission.chapter_id === chapter.id).map((mission, missionIndex, siblingMissions) => (
                      <div key={mission.id} className="rounded-2xl bg-stone-100 p-4">
                        <p className="text-[10px] font-black uppercase tracking-wider text-stone-400">
                          MISSION {mission.order_index} · {mission.mission_type}
                        </p>
                        <h3 className="mt-1 font-black">{translated(mission.title_i18n)}</h3>
                        <p className="mt-1 text-sm font-medium text-stone-500">{translated(mission.instructions_i18n)}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <SmallButton onClick={() => moveMission(chapter.id, mission.id, -1)} disabled={missionIndex === 0 || busy}>{l("위로", "Lên", "Up")}</SmallButton>
                          <SmallButton onClick={() => moveMission(chapter.id, mission.id, 1)} disabled={missionIndex === siblingMissions.length - 1 || busy}>{l("아래로", "Xuống", "Down")}</SmallButton>
                          <SmallButton disabled={busy} onClick={() => openMission(chapter, mission)}>{l("수정", "Sửa", "Edit")}</SmallButton>
                          <SmallButton disabled={busy} onClick={() =>
                            void act(
                              () => setQuestMissionActive(mission.id, !mission.active),
                              l("미션 상태를 변경했습니다.", "Đã đổi trạng thái Mission.", "Mission updated."),
                            )
                          }>{mission.active ? l("숨기기", "Ẩn", "Hide") : l("공개", "Hiện", "Show")}</SmallButton>
                          <SmallButton danger disabled={busy} onClick={() => {
                            if (!window.confirm(l("미션을 삭제할까요?", "Xóa Mission này?", "Delete this mission?"))) return;
                            void act(
                              () => deleteQuestMission(mission.id),
                              l("미션을 삭제했습니다.", "Đã xóa Mission.", "Mission deleted."),
                            );
                          }}>{l("삭제", "Xóa", "Delete")}</SmallButton>
                        </div>
                      </div>
                    ))}
                    <button disabled={busy} onClick={() => openMission(chapter)} className="w-full rounded-2xl border-2 border-dashed border-stone-200 px-4 py-3 text-sm font-black text-stone-500 disabled:opacity-40">
                      + {l("미션 추가", "Thêm Mission", "Add mission")}
                    </button>
                  </div>
                </article>
              ))
            )}
          </section>
        </div>
      </div>

      {missionChapterId && (
        <MissionEditor
          locale={locale}
          draft={missionDraft}
          setDraft={setMissionDraft}
          papers={papers}
          editing={Boolean(missionId)}
          busy={busy}
          l={l}
          onSubmit={submitMission}
          onClose={closeMission}
        />
      )}
    </main>
  );
}

function ChapterEditor({
  locale,
  draft,
  setDraft,
  editing,
  busy,
  l,
  onSubmit,
  onCancel,
}: {
  locale: QuestLocale;
  draft: ChapterDraft;
  setDraft: React.Dispatch<React.SetStateAction<ChapterDraft>>;
  editing: boolean;
  busy: boolean;
  l: (ko: string, vi: string, en: string) => string;
  onSubmit: (event: FormEvent) => void;
  onCancel: () => void;
}) {
  return (
    <section className="self-start rounded-[2rem] bg-white p-6 shadow-sm lg:sticky lg:top-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black">{editing ? l("챕터 수정", "Sửa Chapter", "Edit chapter") : l("새 챕터", "Chapter mới", "New chapter")}</h2>
        {editing && <button onClick={onCancel} className="text-sm font-black text-stone-400">{l("취소", "Hủy", "Cancel")}</button>}
      </div>
      <form onSubmit={onSubmit} className="mt-5 space-y-5">
        <LocalizedFields locale={locale} l={l} label={l("제목", "Tiêu đề", "Title")} value={draft.title} onChange={(title) => setDraft((value) => ({ ...value, title }))} />
        <LocalizedFields locale={locale} l={l} label={l("설명", "Mô tả", "Description")} value={draft.description} onChange={(description) => setDraft((value) => ({ ...value, description }))} multiline />
        <button disabled={busy} className="w-full rounded-2xl bg-stone-950 px-5 py-3 font-black text-white disabled:opacity-40">{l("챕터 저장", "Lưu Chapter", "Save chapter")}</button>
      </form>
    </section>
  );
}

function LocalizedFields({
  locale,
  l,
  label,
  value,
  onChange,
  multiline = false,
}: {
  locale: QuestLocale;
  l: (ko: string, vi: string, en: string) => string;
  label: string;
  value: LocalizedText;
  onChange: (value: LocalizedText) => void;
  multiline?: boolean;
}) {
  const inputValue = value[locale] || value.ko || value.vi || value.en;
  const inputProps = {
    value: inputValue,
    onChange: (
      event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) => onChange(singleLanguageText(locale, event.target.value)),
    placeholder: l(
      "한 언어로 한 번만 입력하세요",
      "Chỉ nhập một lần bằng bất kỳ ngôn ngữ nào",
      "Enter once in any language",
    ),
    className:
      "w-full rounded-xl bg-stone-100 px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-violet-300",
  };

  return (
    <fieldset>
      <legend className="mb-2 text-sm font-black">{label}</legend>
      {multiline ? <textarea {...inputProps} rows={3} /> : <input {...inputProps} />}
      <p className="mt-2 text-xs font-bold text-violet-600">
        {l(
          "한 번만 입력하면 이 내용이 모든 언어 화면에 표시됩니다.",
          "Chỉ cần nhập một lần; nội dung này sẽ hiển thị trên mọi giao diện ngôn ngữ.",
          "Enter once; this content will be shown in every language interface.",
        )}
      </p>
    </fieldset>
  );
}

function MissionEditor({
  locale,
  draft,
  setDraft,
  papers,
  editing,
  busy,
  l,
  onSubmit,
  onClose,
}: {
  locale: QuestLocale;
  draft: MissionDraft;
  setDraft: React.Dispatch<React.SetStateAction<MissionDraft>>;
  papers: LabPaper[];
  editing: boolean;
  busy: boolean;
  l: (ko: string, vi: string, en: string) => string;
  onSubmit: (event: FormEvent) => void;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);
  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const dialog = dialogRef.current;
    dialog?.querySelector<HTMLElement>("button, input, textarea, select")?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeRef.current();
        return;
      }
      if (event.key !== "Tab" || !dialog) return;
      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href]',
        ),
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, []);
  const typeLabel = (type: MissionTemplateType) =>
    ({
      custom: l("완료 확인", "Xác nhận hoàn thành", "Completion"),
      quiz: l("퀴즈", "Trắc nghiệm", "Quiz"),
      paper: l("텍스트 답변", "Câu trả lời văn bản", "Text response"),
      matching: l("연결하기", "Nối cột", "Matching"),
      ordering: l("순서 맞추기", "Sắp xếp thứ tự", "Ordering"),
      "code-output": l("출력 맞히기", "Đoán kết quả code", "Code output"),
      "code-editor": l("코드 작성", "Viết code", "Code editor"),
      graph: l("다이어그램 설명", "Giải thích sơ đồ", "Diagram response"),
    })[type];
  const draftIssue = missionDraftError(draft);
  const draftIssueLabel =
    draftIssue === "title"
      ? l("제목을 입력하세요.", "Hãy nhập tiêu đề.", "Enter a title.")
      : draftIssue === "quiz-options"
        ? l("선택지를 두 개 이상 입력하세요.", "Nhập ít nhất hai lựa chọn.", "Enter at least two options.")
        : draftIssue === "matching-pairs"
          ? l("연결할 쌍을 두 개 이상 입력하세요.", "Nhập ít nhất hai cặp để nối.", "Enter at least two matching pairs.")
          : draftIssue === "ordering-items"
            ? l("순서 항목을 두 개 이상 입력하세요.", "Nhập ít nhất hai mục để sắp xếp.", "Enter at least two ordering items.")
          : draftIssue === "expected-answer"
            ? l("정답을 입력하세요.", "Hãy nhập đáp án mong đợi.", "Enter the expected answer.")
            : draftIssue === "quiz-answer"
              ? l("빈 선택지는 정답으로 지정할 수 없습니다.", "Không thể chọn đáp án trống.", "A blank option cannot be the correct answer.")
            : "";

  const updateList = (
    field: "options" | "items",
    index: number,
    nextValue: string,
  ) =>
    setDraft((value) => ({
      ...value,
      [field]: value[field].map((item, itemIndex) =>
        itemIndex === index ? nextValue : item,
      ),
    }));

  const updatePair = (index: number, side: "left" | "right", value: string) =>
    setDraft((current) => ({
      ...current,
      pairs: current.pairs.map((pair, pairIndex) =>
        pairIndex === index ? { ...pair, [side]: value } : pair,
      ),
    }));

  return (
    <div
      ref={dialogRef}
      className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/50 p-3 backdrop-blur-sm sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-label={l("게임 빌더", "Trình thiết kế game", "Game builder")}
    >
      <div className="mx-auto my-3 max-w-5xl rounded-[2rem] bg-white p-5 shadow-2xl sm:my-6 sm:p-7">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[.2em] text-violet-500">GAME BUILDER</p>
            <h2 className="mt-1 text-2xl font-black">{editing ? l("미션 수정", "Sửa Mission", "Edit mission") : l("새 미션", "Mission mới", "New mission")}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label={l("닫기", "Đóng", "Close")} className="h-10 w-10 rounded-full bg-stone-100 font-black">×</button>
        </div>
        <form onSubmit={onSubmit} className="mt-6 grid gap-7 lg:grid-cols-[1.15fr_.85fr]">
          <div className="space-y-5">
            <fieldset>
              <legend className="text-sm font-black">{l("게임 템플릿", "Mẫu game", "Game template")}</legend>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {TYPES.map((type) => (
                  <button
                    key={type}
                    type="button"
                    aria-pressed={draft.missionType === type}
                    onClick={() => setDraft((value) => ({ ...value, missionType: type }))}
                    className={"rounded-2xl border-2 px-3 py-3 text-left text-sm font-black transition " + (draft.missionType === type ? "border-violet-500 bg-violet-50 text-violet-700" : "border-stone-100 bg-stone-50 text-stone-500")}
                  >
                    {typeLabel(type)}
                  </button>
                ))}
              </div>
            </fieldset>

            <LocalizedFields locale={locale} l={l} label={l("제목", "Tiêu đề", "Title")} value={draft.title} onChange={(title) => setDraft((value) => ({ ...value, title }))} />
            <LocalizedFields locale={locale} l={l} label={l("안내", "Hướng dẫn", "Instructions")} value={draft.instructions} onChange={(instructions) => setDraft((value) => ({ ...value, instructions }))} multiline />

            {draft.missionType === "quiz" && (
              <ListBuilder
                label={l("선택지와 정답", "Lựa chọn và đáp án", "Options and answer")}
                values={draft.options}
                selected={draft.answerIndex}
                selectable
                onSelect={(answerIndex) => setDraft((value) => ({ ...value, answerIndex }))}
                onChange={(index, value) => updateList("options", index, value)}
                onAdd={() => setDraft((value) => ({ ...value, options: [...value.options, ""] }))}
                l={l}
              />
            )}

            {draft.missionType === "matching" && (
              <MatchingBuilder
                pairs={draft.pairs}
                onChange={updatePair}
                onAdd={() => setDraft((value) => ({ ...value, pairs: [...value.pairs, { left: "", right: "" }] }))}
                l={l}
              />
            )}

            {draft.missionType === "ordering" && (
              <ListBuilder
                label={l("올바른 순서", "Thứ tự đúng", "Correct order")}
                values={draft.items}
                onChange={(index, value) => updateList("items", index, value)}
                onAdd={() => setDraft((value) => ({ ...value, items: [...value.items, ""] }))}
                l={l}
              />
            )}

            {(draft.missionType === "code-output" || draft.missionType === "code-editor") && (
              <div className="grid gap-4">
                <label className="text-sm font-black">
                  {draft.missionType === "code-output" ? l("코드 조각", "Đoạn code", "Code snippet") : l("코드 khởi đầu", "Code khởi đầu", "Starter code")}
                  <textarea value={draft.starterCode} onChange={(event) => setDraft((value) => ({ ...value, starterCode: event.target.value }))} rows={5} spellCheck={false} className="mt-2 w-full rounded-xl bg-stone-950 px-4 py-3 font-mono text-sm text-emerald-300 outline-none focus:ring-2 focus:ring-violet-300" />
                </label>
                <label className="text-sm font-black">
                  {l("예상 정답", "Đáp án mong đợi", "Expected answer")}
                  <textarea value={draft.expectedAnswer} onChange={(event) => setDraft((value) => ({ ...value, expectedAnswer: event.target.value }))} rows={2} className="mt-2 w-full rounded-xl bg-stone-100 px-4 py-3 font-mono text-sm font-bold outline-none focus:ring-2 focus:ring-violet-300" />
                </label>
              </div>
            )}

            {(["paper", "graph", "custom"] as MissionTemplateType[]).includes(draft.missionType) && (
              <label className="block text-sm font-black">
                {draft.missionType === "custom" ? l("완료 버튼 문구", "Nhãn nút hoàn thành", "Completion button label") : l("응답 안내 문구", "Gợi ý trả lời", "Response prompt")}
                <input value={draft.prompt} onChange={(event) => setDraft((value) => ({ ...value, prompt: event.target.value }))} placeholder={draft.missionType === "custom" ? l("완료했습니다", "Tôi đã hoàn thành", "I completed this") : l("답변을 입력하세요", "Nhập câu trả lời", "Enter your response")} className="mt-2 w-full rounded-xl bg-stone-100 px-4 py-3 font-bold outline-none focus:ring-2 focus:ring-violet-300" />
              </label>
            )}

            {draft.missionType === "paper" && (
              <label className="block text-sm font-black">
                {l("연결할 페이퍼", "Paper liên kết", "Linked paper")}
                <select
                  value={draft.paperId}
                  onChange={(event) => {
                    const paper = papers.find((item) => item.id === event.target.value);
                    setDraft((value) => ({
                      ...value,
                      paperId: paper?.id ?? "",
                      paperTitle: paper?.title ?? "",
                      paperUrl: paper?.paper_url ?? "",
                    }));
                  }}
                  className="mt-2 w-full rounded-xl bg-stone-100 px-4 py-3 font-bold outline-none focus:ring-2 focus:ring-violet-300"
                >
                  <option value="">{l("페이퍼 없이 응답만 받기", "Không liên kết paper", "No linked paper")}</option>
                  {papers.map((paper) => <option key={paper.id} value={paper.id}>{paper.title}</option>)}
                </select>
                {papers.length === 0 && <span className="mt-2 block text-xs font-bold text-stone-400">{l("Paper Club에 먼저 페이퍼를 추가하세요.", "Hãy thêm paper trong Paper Club trước.", "Add a paper in Paper Club first.")}</span>}
              </label>
            )}

            <label className="block text-sm font-black">
              {l("보상 포인트", "Điểm thưởng", "Reward points")}
              <input type="number" min={0} max={1000} value={draft.rewardPoints} onChange={(event) => setDraft((value) => ({ ...value, rewardPoints: Number(event.target.value) }))} className="mt-2 w-full rounded-xl bg-stone-100 px-4 py-3 font-bold outline-none focus:ring-2 focus:ring-violet-300" />
            </label>
          </div>

          <aside className="self-start rounded-[1.75rem] bg-stone-950 p-5 text-white lg:sticky lg:top-5">
            <p className="text-xs font-black uppercase tracking-[.2em] text-[#ffd84d]">LIVE PREVIEW</p>
            <GameDraftPreview draft={draft} locale={locale} typeLabel={typeLabel} l={l} />
            {draftIssueLabel && <p role="alert" className="mt-4 rounded-xl bg-red-500/15 px-3 py-3 text-sm font-bold text-red-200">{draftIssueLabel}</p>}
            <button disabled={busy || Boolean(draftIssue)} className="mt-6 w-full rounded-2xl bg-[#ffd84d] px-5 py-4 font-black text-stone-950 disabled:cursor-not-allowed disabled:opacity-40">{busy ? l("저장 중…", "Đang lưu…", "Saving…") : l("게임 저장", "Lưu game", "Save game")}</button>
          </aside>
        </form>
      </div>
    </div>
  );
}

function ListBuilder({ label, values, selected = 0, selectable = false, onSelect, onChange, onAdd, l }: {
  label: string;
  values: string[];
  selected?: number;
  selectable?: boolean;
  onSelect?: (index: number) => void;
  onChange: (index: number, value: string) => void;
  onAdd: () => void;
  l: (ko: string, vi: string, en: string) => string;
}) {
  return (
    <fieldset>
      <legend className="text-sm font-black">{label}</legend>
      <div className="mt-2 space-y-2">
        {values.map((value, index) => (
          <div key={index} className="flex items-center gap-2">
            {selectable ? <input type="radio" name="correct" checked={selected === index} onChange={() => onSelect?.(index)} aria-label={l("정답 " + (index + 1), "Đáp án đúng " + (index + 1), "Correct option " + (index + 1))} /> : <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-stone-200 text-xs font-black">{index + 1}</span>}
            <input value={value} onChange={(event) => onChange(index, event.target.value)} placeholder={l("항목", "Mục", "Item") + " " + (index + 1)} className="min-w-0 flex-1 rounded-xl bg-stone-100 px-4 py-3 font-bold" />
          </div>
        ))}
      </div>
      <button type="button" onClick={onAdd} className="mt-2 text-sm font-black text-violet-600">+ {l("항목 추가", "Thêm mục", "Add item")}</button>
    </fieldset>
  );
}

function MatchingBuilder({ pairs, onChange, onAdd, l }: {
  pairs: Array<{ left: string; right: string }>;
  onChange: (index: number, side: "left" | "right", value: string) => void;
  onAdd: () => void;
  l: (ko: string, vi: string, en: string) => string;
}) {
  return (
    <fieldset>
      <legend className="text-sm font-black">{l("연결할 쌍", "Các cặp nối cột", "Matching pairs")}</legend>
      <p className="mt-1 text-xs font-bold text-stone-400">{l("왼쪽과 오른쪽에 서로 맞는 내용을 같은 줄에 입력하세요.", "Nhập hai nội dung tương ứng trên cùng một hàng.", "Enter matching left and right values on the same row.")}</p>
      <div className="mt-3 space-y-2">
        {pairs.map((pair, index) => (
          <div key={index} className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            <input value={pair.left} onChange={(event) => onChange(index, "left", event.target.value)} placeholder={l("왼쪽", "Cột trái", "Left") + " " + (index + 1)} className="min-w-0 rounded-xl bg-stone-100 px-4 py-3 font-bold" />
            <span className="grid h-8 w-8 place-items-center rounded-full bg-violet-100 text-sm font-black text-violet-600">↔</span>
            <input value={pair.right} onChange={(event) => onChange(index, "right", event.target.value)} placeholder={l("오른쪽", "Cột phải", "Right") + " " + (index + 1)} className="min-w-0 rounded-xl bg-stone-100 px-4 py-3 font-bold" />
          </div>
        ))}
      </div>
      <button type="button" onClick={onAdd} className="mt-2 text-sm font-black text-violet-600">+ {l("쌍 추가", "Thêm cặp", "Add pair")}</button>
    </fieldset>
  );
}

function GameDraftPreview({ draft, locale, typeLabel, l }: {
  draft: MissionDraft;
  locale: QuestLocale;
  typeLabel: (type: MissionTemplateType) => string;
  l: (ko: string, vi: string, en: string) => string;
}) {
  const title = draft.title[locale] || draft.title.ko || draft.title.vi || draft.title.en || l("제목 없는 미션", "Mission chưa có tiêu đề", "Untitled mission");
  const instructions = draft.instructions[locale] || draft.instructions.ko || draft.instructions.vi || draft.instructions.en;
  const previewItems =
    draft.missionType === "quiz"
      ? draft.options
      : draft.missionType === "ordering"
        ? draft.items
        : [];
  return (
    <div className="mt-4 rounded-2xl bg-white/10 p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black">{typeLabel(draft.missionType)}</span>
        <span className="text-xs font-black text-[#ffd84d]">+{draft.rewardPoints || 0} PT</span>
      </div>
      <h3 className="mt-4 text-xl font-black">{title}</h3>
      {instructions && <p className="mt-2 text-sm leading-6 text-white/60">{instructions}</p>}
      {previewItems.filter(Boolean).length > 0 && <div className="mt-4 space-y-2">{previewItems.filter(Boolean).map((item, index) => <div key={index} className="rounded-xl bg-white/10 px-3 py-2 text-sm font-bold">{index + 1}. {item}</div>)}</div>}
      {draft.missionType === "matching" && <div className="mt-4 space-y-2">{draft.pairs.filter((pair) => pair.left || pair.right).map((pair, index) => <div key={index} className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-sm font-bold"><span className="rounded-xl bg-white/10 px-3 py-2">{pair.left || "—"}</span><span className="text-violet-300">↔</span><span className="rounded-xl bg-white/10 px-3 py-2">{pair.right || "—"}</span></div>)}</div>}
      {(draft.missionType === "code-output" || draft.missionType === "code-editor") && <pre className="mt-4 overflow-x-auto rounded-xl bg-black/30 p-3 text-xs text-emerald-300">{draft.starterCode || "// code"}</pre>}
      {(["paper", "graph"] as MissionTemplateType[]).includes(draft.missionType) && <div className="mt-4 min-h-20 rounded-xl bg-white/10 p-3 text-sm text-white/40">{draft.prompt || l("응답 영역", "Khu vực trả lời", "Response area")}</div>}
      {draft.missionType === "custom" && <div className="mt-4 rounded-xl bg-[#ffd84d] px-3 py-3 text-center text-sm font-black text-stone-950">{draft.prompt || l("완료했습니다", "Tôi đã hoàn thành", "I completed this")}</div>}
    </div>
  );
}

function SmallButton({ children, onClick, danger = false, disabled = false }: { children: React.ReactNode; onClick: () => void; danger?: boolean; disabled?: boolean }) {
  return <button type="button" onClick={onClick} disabled={disabled} className={"rounded-full px-3 py-2 text-xs font-black disabled:cursor-not-allowed disabled:opacity-30 " + (danger ? "bg-red-50 text-red-600" : "bg-stone-100 text-stone-600")}>{children}</button>;
}

function Loading({ compact = false }: { compact?: boolean }) {
  return <div className={compact ? "py-16 text-center" : "grid min-h-screen place-items-center bg-[#f5f3ee]"}><p className="text-sm font-black tracking-[.2em] text-stone-400">LABLOG</p></div>;
}
