"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useI18n } from "../../../lib/i18n";
import { useLab } from "../../../lib/lab-tenancy";
import { useRolePreview } from "../../../lib/role-preview";
import { createClient } from "../../../lib/supabase/client";
import {
  createPaper,
  createPaperComment,
  changePaperReadingStatus,
  deletePaper,
  deletePaperComment,
  EMPTY_PAPER_DRAFT,
  latestQuestionJob,
  loadPaperClub,
  localizedQuestionText,
  paperDraftError,
  paperFileError,
  paperReadingSummary,
  requestPaperQuestionSet,
  savePaperProgress,
  uploadPaperFile,
  type LabPaper,
  type PaperComment,
  type PaperDraft,
  type PaperProgress,
  type PaperQuestionJob,
  type PaperQuestionSet,
  type PaperStatus,
} from "../../../lib/paper-club";

type ProgressDraft = { status: PaperStatus; progress: number };

export default function PaperClubPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const { labs, isLoading } = useLab();
  const { previewLabRole } = useRolePreview();
  const { locale, l } = useI18n();
  const lab = useMemo(
    () => labs.find((candidate) => candidate.slug === slug),
    [labs, slug],
  );
  const [papers, setPapers] = useState<LabPaper[]>([]);
  const [progress, setProgress] = useState<PaperProgress[]>([]);
  const [comments, setComments] = useState<PaperComment[]>([]);
  const [questionJobs, setQuestionJobs] = useState<PaperQuestionJob[]>([]);
  const [questionSets, setQuestionSets] = useState<PaperQuestionSet[]>([]);
  const [viewerId, setViewerId] = useState("");
  const [progressDrafts, setProgressDrafts] = useState<Record<string, ProgressDraft>>({});
  const [paperDraft, setPaperDraft] = useState<PaperDraft>(EMPTY_PAPER_DRAFT);
  const [paperFile, setPaperFile] = useState<File | null>(null);
  const [selectedPaperId, setSelectedPaperId] = useState("");
  const [commentBody, setCommentBody] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const dirtyProgressRef = useRef(new Set<string>());
  const discussionTriggerRef = useRef<HTMLButtonElement | null>(null);

  const refresh = useCallback(async (silent = false) => {
    if (!lab) return;
    if (!silent) setLoading(true);
    try {
      const [club, auth] = await Promise.all([
        loadPaperClub(lab.id),
        createClient().auth.getUser(),
      ]);
      const nextViewerId = auth.data.user?.id ?? "";
      setPapers(club.papers);
      setProgress(club.progress);
      setComments(club.comments);
      setQuestionJobs(club.questionJobs);
      setQuestionSets(club.questionSets);
      setError("");
      setViewerId(nextViewerId);
      setProgressDrafts((current) => {
        const next: Record<string, ProgressDraft> = {};
        for (const paper of club.papers) {
          if (dirtyProgressRef.current.has(paper.id) && current[paper.id]) {
            next[paper.id] = current[paper.id];
            continue;
          }
          const saved = club.progress.find(
            (item) => item.paper_id === paper.id && item.user_id === nextViewerId,
          );
          next[paper.id] = {
            status: saved?.status ?? "to-read",
            progress: saved?.progress_percent ?? 0,
          };
        }
        return next;
      });
      setSelectedPaperId((current) => {
        if (current && club.papers.some((paper) => paper.id === current)) return current;
        const requested = new URLSearchParams(window.location.search).get("paper");
        return requested && club.papers.some((paper) => paper.id === requested)
          ? requested
          : "";
      });
      setError("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load Paper Club.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [lab]);

  useEffect(() => {
    if (isLoading) return;
    if (!lab) return router.replace("/labs");
    const timeoutId = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [isLoading, lab, refresh, router]);

  useEffect(() => {
    if (!questionJobs.some((job) => job.status === "queued" || job.status === "processing")) {
      return;
    }
    const intervalId = window.setInterval(() => void refresh(true), 4_000);
    return () => window.clearInterval(intervalId);
  }, [questionJobs, refresh]);

  useEffect(() => {
    if (!selectedPaperId || loading) return;
    const frame = window.requestAnimationFrame(() => {
      const discussion = document.getElementById("discussion");
      discussion?.scrollIntoView({ behavior: "smooth", block: "start" });
      discussion?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [loading, selectedPaperId]);

  async function run(work: () => Promise<void>, success: string) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await work();
      await refresh(true);
      setNotice(success);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Action failed.");
    } finally {
      setBusy(false);
    }
  }

  async function submitPaper(event: FormEvent) {
    event.preventDefault();
    const metadataIssue = paperDraftError({
      ...paperDraft,
      paperUrl: "https://uploaded-paper.local/paper.pdf",
    });
    if (!lab || !viewerId || metadataIssue || paperFileError(paperFile)) return;
    await run(async () => {
      const paperUrl = await uploadPaperFile(lab.id, viewerId, paperFile!);
      await createPaper(lab.id, viewerId, { ...paperDraft, paperUrl });
      setPaperDraft(EMPTY_PAPER_DRAFT);
      setPaperFile(null);
      setShowCreate(false);
    }, l("페이퍼를 추가했습니다.", "Đã thêm paper.", "Paper added."));
  }

  async function submitComment(event: FormEvent) {
    event.preventDefault();
    if (!selectedPaperId || !viewerId || !commentBody.trim()) return;
    await run(async () => {
      await createPaperComment(selectedPaperId, viewerId, commentBody);
      setCommentBody("");
    }, l("댓글을 남겼습니다.", "Đã gửi bình luận.", "Comment posted."));
  }

  function closeDiscussion() {
    setSelectedPaperId("");
    const params = new URLSearchParams(window.location.search);
    if (params.has("paper")) {
      params.delete("paper");
      const query = params.toString();
      router.replace(
        `/labs/${lab?.slug ?? slug}/papers${query ? `?${query}` : ""}`,
        { scroll: false },
      );
    }
    window.requestAnimationFrame(() => discussionTriggerRef.current?.focus());
  }

  if (isLoading || !lab) return <Loading />;
  const visibleRole = previewLabRole(lab.membershipRole);
  const canManage = visibleRole === "owner" || visibleRole === "admin";
  const summary = paperReadingSummary(papers, progress);
  const selectedPaper = papers.find((paper) => paper.id === selectedPaperId);
  const selectedComments = comments.filter((comment) => comment.paper_id === selectedPaperId);
  const issue = paperDraftError({
    ...paperDraft,
    paperUrl: "https://uploaded-paper.local/paper.pdf",
  }) ?? paperFileError(paperFile);

  return (
    <main className="min-h-screen bg-[#f5f3ee] px-5 py-8 text-stone-950 sm:px-8 sm:py-12">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[.2em] text-violet-500">{lab.name} · PAPER CLUB</p>
            <h1 className="mt-2 text-4xl font-black sm:text-6xl">{l("함께 읽는 페이퍼", "Cùng nhau đọc paper", "Read papers together")}</h1>
            <p className="mt-3 max-w-2xl font-medium leading-7 text-stone-500">{l("읽기 진도를 공유하고 논문별로 토론하세요.", "Theo dõi tiến độ đọc và thảo luận theo từng paper.", "Track reading progress and discuss each paper with your lab.")}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {canManage && <button type="button" onClick={() => setShowCreate((value) => !value)} className="rounded-full bg-[#ffd84d] px-5 py-3 text-sm font-black">+ {l("페이퍼 추가", "Thêm paper", "Add paper")}</button>}
            {canManage && <Link href={"/labs/" + lab.slug + "/quests"} className="rounded-full bg-violet-600 px-5 py-3 text-sm font-black text-white">{l("퀘스트 연결", "Liên kết Quest", "Connect Quest")}</Link>}
            <Link href={"/labs/" + lab.slug} className="rounded-full bg-white px-5 py-3 text-sm font-black shadow-sm">{l("랩 포털", "Portal Lab", "Lab portal")}</Link>
          </div>
        </header>

        {(error || notice) && <p role={error ? "alert" : "status"} className={"mt-6 rounded-2xl p-4 font-bold " + (error ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700")}>{error || notice}</p>}

        <section aria-label={l("읽기 요약", "Tổng quan đọc", "Reading summary")} className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <SummaryCard value={summary.papers} label={l("페이퍼", "Paper", "Papers")} />
          <SummaryCard value={summary.readers} label={l("참여자", "Người đọc", "Readers")} />
          <SummaryCard value={summary.completed} label={l("완독 기록", "Lượt hoàn thành", "Completions")} />
          <SummaryCard value={summary.average + "%"} label={l("평균 진도", "Tiến độ TB", "Average progress")} />
        </section>

        {showCreate && canManage && (
          <PaperForm draft={paperDraft} setDraft={setPaperDraft} file={paperFile} setFile={setPaperFile} issue={issue} busy={busy} l={l} onSubmit={submitPaper} />
        )}

        {loading ? <Loading compact /> : papers.length === 0 ? (
          <section className="mt-8 rounded-[2rem] bg-white p-10 text-center shadow-sm">
            <div className="text-5xl">📚</div>
            <h2 className="mt-4 text-2xl font-black">{l("첫 페이퍼를 기다리고 있어요", "Chưa có paper nào", "Waiting for the first paper")}</h2>
            <p className="mt-2 font-medium text-stone-500">{canManage ? l("페이퍼를 추가해 읽기 모임을 시작하세요.", "Thêm paper để bắt đầu câu lạc bộ đọc.", "Add a paper to start the reading club.") : l("랩 관리자가 곧 페이퍼를 추가할 거예요.", "Quản trị Lab sẽ thêm paper sớm.", "A lab admin will add a paper soon.")}</p>
          </section>
        ) : (
          <section className="mt-8 grid gap-5 lg:grid-cols-2">
            {papers.map((paper) => {
              const draft = progressDrafts[paper.id] ?? { status: "to-read" as const, progress: 0 };
              const paperProgress = progress.filter((item) => item.paper_id === paper.id);
              const completedCount = paperProgress.filter((item) => item.status === "completed").length;
              const questionJob = latestQuestionJob(questionJobs, paper.id);
              const questionSet = questionSets.find((item) => item.paper_id === paper.id);
              return (
                <article key={paper.id} className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-black/[0.04]">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-xs font-black uppercase tracking-[.15em] text-violet-500">{paper.published_year || "PAPER"}</p>
                      <h2 className="mt-2 text-2xl font-black leading-tight">{paper.title}</h2>
                      {paper.authors && <p className="mt-2 text-sm font-bold text-stone-500">{paper.authors}</p>}
                    </div>
                    {canManage && <button type="button" aria-label={l("페이퍼 삭제", "Xóa paper", "Delete paper")} disabled={busy} onClick={() => {
                      if (!window.confirm(l("이 페이퍼와 토론을 삭제할까요?", "Xóa paper và toàn bộ thảo luận?", "Delete this paper and its discussion?"))) return;
                      void run(() => deletePaper(paper.id), l("페이퍼를 삭제했습니다.", "Đã xóa paper.", "Paper deleted."));
                    }} className="rounded-full bg-red-50 px-3 py-2 text-xs font-black text-red-600 disabled:opacity-40">{l("삭제", "Xóa", "Delete")}</button>}
                  </div>
                  {paper.abstract && <p className="mt-4 line-clamp-3 text-sm font-medium leading-6 text-stone-500">{paper.abstract}</p>}
                  {paper.tags.length > 0 && <div className="mt-4 flex flex-wrap gap-2">{paper.tags.map((tag) => <span key={tag} className="rounded-full bg-violet-50 px-3 py-1 text-xs font-black text-violet-600">#{tag}</span>)}</div>}

                  <div className="mt-5 rounded-2xl bg-stone-100 p-4">
                    <label className="flex cursor-pointer items-center gap-3 rounded-xl bg-white px-4 py-4 font-black">
                      <input disabled={busy} type="checkbox" checked={draft.status === "completed"} onChange={(event) => {
                      const normalized = changePaperReadingStatus(event.target.checked ? "completed" : "to-read", draft.progress);
                      dirtyProgressRef.current.add(paper.id);
                      setProgressDrafts((current) => ({ ...current, [paper.id]: { status: normalized.status, progress: normalized.progressPercent } }));
                      }} className="h-5 w-5 shrink-0 accent-violet-600 disabled:opacity-40" />
                      <span className="min-w-0">
                        <span className="block text-sm">{l("완독으로 표시", "Đánh dấu đã đọc xong", "Mark as completed")}</span>
                        <span className="mt-1 block text-xs font-medium text-stone-500">{l("읽기를 마쳤다면 체크하세요.", "Đánh dấu khi bạn đã đọc xong paper.", "Check this after you finish reading the paper.")}</span>
                      </span>
                    </label>
                    <button type="button" disabled={busy || !viewerId} onClick={() => void run(async () => {
                      await savePaperProgress(paper.id, viewerId, draft.status, draft.progress);
                      dirtyProgressRef.current.delete(paper.id);
                    }, l("읽기 표시를 저장했습니다.", "Đã lưu đánh dấu đọc.", "Reading mark saved."))} className="mt-3 w-full rounded-xl bg-stone-950 px-4 py-3 text-sm font-black text-white disabled:opacity-40">{l("표시 저장", "Lưu đánh dấu", "Save mark")}</button>
                  </div>

                  <div className="mt-5 flex flex-wrap items-center gap-2">
                    <a href={paper.paper_url} target="_blank" rel="noreferrer" className="rounded-full bg-violet-600 px-4 py-2 text-sm font-black text-white">{l("페이퍼 열기 ↗", "Mở paper ↗", "Open paper ↗")}</a>
                    <button type="button" onClick={(event) => {
                      discussionTriggerRef.current = event.currentTarget;
                      setSelectedPaperId(paper.id);
                    }} className="rounded-full bg-stone-100 px-4 py-2 text-sm font-black">{l("토론", "Thảo luận", "Discussion")} ({comments.filter((comment) => comment.paper_id === paper.id).length})</button>
                    <span className="ml-auto text-xs font-bold text-stone-400">✓ {completedCount}</span>
                  </div>
                  <PaperQuestionCard
                    key={`quiz-${paper.id}-${questionSet?.generated_by_job_id ?? "pending"}`}
                    busy={busy}
                    canManage={canManage}
                    job={questionJob}
                    locale={locale}
                    questionSet={questionSet}
                    l={l}
                    onGenerate={() => void run(
                      () => requestPaperQuestionSet(paper.id, viewerId, locale),
                      l(
                        "AI 질문 생성을 요청했습니다.",
                        "Đã xếp hàng tạo câu hỏi AI.",
                        "AI question generation queued.",
                      ),
                    )}
                  />
                </article>
              );
            })}
          </section>
        )}

        {selectedPaper && (
          <section id="discussion" tabIndex={-1} className="mt-8 scroll-mt-6 rounded-[2rem] bg-stone-950 p-5 text-white shadow-xl outline-none focus:ring-2 focus:ring-violet-400 sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[.2em] text-[#ffd84d]">DISCUSSION</p>
                <h2 className="mt-2 text-2xl font-black">{selectedPaper.title}</h2>
              </div>
              <button type="button" onClick={closeDiscussion} aria-label={l("토론 닫기", "Đóng thảo luận", "Close discussion")} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/10 font-black">×</button>
            </div>
            <div className="mt-6 space-y-3">
              {selectedComments.length === 0 && <p className="rounded-2xl bg-white/5 p-5 text-sm font-bold text-white/50">{l("첫 질문이나 인상을 남겨보세요.", "Hãy để lại câu hỏi hoặc cảm nhận đầu tiên.", "Leave the first question or observation.")}</p>}
              {selectedComments.map((comment) => (
                <article key={comment.id} className="rounded-2xl bg-white/10 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-black">{comment.author_name}</p>
                    {(comment.user_id === viewerId || canManage) && <button type="button" disabled={busy} onClick={() => void run(() => deletePaperComment(comment.id), l("댓글을 삭제했습니다.", "Đã xóa bình luận.", "Comment deleted."))} className="text-xs font-black text-red-300 disabled:opacity-40">{l("삭제", "Xóa", "Delete")}</button>}
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-white/70">{comment.body}</p>
                  <time className="mt-2 block text-[11px] font-bold text-white/30">{new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(comment.created_at))}</time>
                </article>
              ))}
            </div>
            <form onSubmit={submitComment} className="mt-5 flex flex-col gap-3 sm:flex-row">
              <label className="sr-only" htmlFor="paper-comment">{l("댓글", "Bình luận", "Comment")}</label>
              <textarea id="paper-comment" value={commentBody} onChange={(event) => setCommentBody(event.target.value)} maxLength={2000} rows={2} placeholder={l("질문, 메모 또는 관점을 공유하세요", "Chia sẻ câu hỏi, ghi chú hoặc góc nhìn", "Share a question, note, or perspective")} className="min-w-0 flex-1 rounded-2xl bg-white px-4 py-3 text-sm font-bold text-stone-950 outline-none focus:ring-2 focus:ring-[#ffd84d]" />
              <button disabled={busy || !commentBody.trim()} className="rounded-2xl bg-[#ffd84d] px-6 py-3 font-black text-stone-950 disabled:opacity-40">{l("게시", "Đăng", "Post")}</button>
            </form>
          </section>
        )}
      </div>
    </main>
  );
}

function PaperQuestionCard({ busy, canManage, job, locale, questionSet, l, onGenerate }: {
  busy: boolean;
  canManage: boolean;
  job: PaperQuestionJob | undefined;
  locale: "ko" | "vi" | "en";
  questionSet: PaperQuestionSet | undefined;
  l: (ko: string, vi: string, en: string) => string;
  onGenerate: () => void;
}) {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const active = job?.status === "queued" || job?.status === "processing";
  const questions = questionSet?.payload.questions ?? [];
  const generateLabel = questionSet
    ? l("질문 다시 만들기", "Tạo lại câu hỏi", "Regenerate questions")
    : job?.status === "failed"
      ? l("다시 시도", "Thử lại", "Try again")
      : l("AI 질문 만들기", "Tạo câu hỏi bằng AI", "Generate AI questions");

  return (
    <section aria-label={l("AI 질문", "Câu hỏi AI", "AI questions")} className="mt-5 rounded-2xl border border-violet-100 bg-violet-50/70 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[.15em] text-violet-600">AI PAPER QUIZ</p>
          <p className="mt-1 text-sm font-bold text-stone-600">
            {questions.length > 0
              ? l(
                `${questions.length}개의 질문 · 현재 언어로 생성`,
                `${questions.length} câu hỏi · tạo bằng ngôn ngữ hiện tại`,
                `${questions.length} questions · generated in your current language`,
              )
              : l(
                "논문 내용을 바탕으로 학습 질문을 만들어요.",
                "Tạo bộ câu hỏi học tập dựa trên nội dung paper.",
                "Create a study quiz grounded in this paper.",
              )}
          </p>
        </div>
        {active && (
          <span role="status" className="rounded-full bg-amber-100 px-3 py-2 text-xs font-black text-amber-700">
            {job?.status === "queued"
              ? l("대기 중", "Đang chờ", "Queued")
              : l("PDF 분석 중", "Đang phân tích PDF", "Analyzing PDF")}
          </span>
        )}
      </div>

      {job?.status === "failed" && (
        <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-xs font-bold text-red-700">
          {l("생성에 실패했습니다.", "Không thể tạo câu hỏi.", "Question generation failed.")}
        </p>
      )}

      {questionSet && (
        <details className="mt-4 rounded-xl bg-white p-4 shadow-sm">
          <summary className="cursor-pointer font-black text-violet-700">
            {l("퀴즈 풀기", "Làm bộ câu hỏi", "Take the quiz")}
          </summary>
          <p className="mt-3 text-sm font-medium leading-6 text-stone-600">
            {localizedQuestionText(questionSet.payload.summary, locale)}
          </p>
          <div className="mt-5 space-y-5">
            {questions.map((question, questionIndex) => {
              const selected = answers[question.id];
              const revealed = selected !== undefined;
              const correct = selected === question.answer_index;
              return (
                <article key={question.id} className="rounded-2xl border border-stone-100 p-4">
                  <div className="flex flex-wrap items-center gap-2 text-[11px] font-black uppercase tracking-wide text-stone-400">
                    <span>{questionIndex + 1}/{questions.length}</span>
                    <span>·</span>
                    <span>{question.difficulty}</span>
                    {question.section && <><span>·</span><span>{question.section}</span></>}
                  </div>
                  <h3 className="mt-2 text-sm font-black leading-6">
                    {localizedQuestionText(question.question, locale)}
                  </h3>
                  <div className="mt-3 grid gap-2">
                    {question.options.map((option, optionIndex) => {
                      const isSelected = selected === optionIndex;
                      const isCorrectOption = revealed && optionIndex === question.answer_index;
                      const optionClass = isCorrectOption
                        ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                        : isSelected
                          ? "border-red-300 bg-red-50 text-red-800"
                          : "border-stone-200 bg-white text-stone-700 hover:border-violet-300";
                      return (
                        <button
                          key={optionIndex}
                          type="button"
                          aria-pressed={isSelected}
                          onClick={() => setAnswers((current) => ({ ...current, [question.id]: optionIndex }))}
                          className={`rounded-xl border px-3 py-3 text-left text-sm font-bold transition ${optionClass}`}
                        >
                          {String.fromCharCode(65 + optionIndex)}. {localizedQuestionText(option, locale)}
                        </button>
                      );
                    })}
                  </div>
                  {revealed && (
                    <div className={`mt-3 rounded-xl p-3 text-sm font-bold ${correct ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"}`}>
                      <p>{correct ? l("정답입니다.", "Chính xác.", "Correct.") : l("다시 확인해 보세요.", "Hãy xem lại đáp án.", "Review the answer.")}</p>
                      <p className="mt-1 font-medium leading-6">{localizedQuestionText(question.explanation, locale)}</p>
                      {(question.source_page || question.source_excerpt) && (
                        <p className="mt-2 text-xs font-medium opacity-75">
                          {question.source_page ? `${l("페이지", "Trang", "Page")} ${question.source_page}: ` : ""}
                          {question.source_excerpt}
                        </p>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </details>
      )}

      {canManage && (
        <button
          type="button"
          disabled={busy || active}
          onClick={onGenerate}
          className="mt-4 rounded-full bg-violet-600 px-4 py-2 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          {active ? l("AI 처리 중…", "AI đang xử lý…", "AI is working…") : generateLabel}
        </button>
      )}
    </section>
  );
}

function PaperForm({ draft, setDraft, file, setFile, issue, busy, l, onSubmit }: {
  draft: PaperDraft;
  setDraft: React.Dispatch<React.SetStateAction<PaperDraft>>;
  file: File | null;
  setFile: React.Dispatch<React.SetStateAction<File | null>>;
  issue: string | null;
  busy: boolean;
  l: (ko: string, vi: string, en: string) => string;
  onSubmit: (event: FormEvent) => void;
}) {
  const field = (key: keyof PaperDraft, value: string) => setDraft((current) => ({ ...current, [key]: value }));
  const hasStarted = Boolean(file) || Object.values(draft).some((value) => value.trim());
  return (
    <form onSubmit={onSubmit} className="mt-7 rounded-[2rem] bg-white p-6 shadow-sm">
      <div>
        <p className="text-xs font-black uppercase tracking-[.2em] text-violet-500">PAPER LIBRARY</p>
        <h2 className="mt-2 text-2xl font-black">{l("새 페이퍼 추가", "Thêm paper mới", "Add a new paper")}</h2>
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <Field label={l("제목 *", "Tiêu đề *", "Title *")} value={draft.title} onChange={(value) => field("title", value)} />
        <Field label={l("저자", "Tác giả", "Authors")} value={draft.authors} onChange={(value) => field("authors", value)} />
        <label className="text-sm font-black">
          {l("PDF 파일 *", "Tệp PDF *", "PDF file *")}
          <input
            aria-describedby="paper-file-help"
            type="file"
            accept="application/pdf,.pdf"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            className="mt-2 block w-full rounded-xl bg-stone-100 px-4 py-3 text-sm font-bold file:mr-4 file:rounded-full file:border-0 file:bg-violet-600 file:px-4 file:py-2 file:font-black file:text-white"
          />
          <span id="paper-file-help" className="mt-2 block text-xs font-medium text-stone-500">
            {file
              ? file.name
              : l("PDF만 업로드할 수 있어요 (최대 20MB).", "Chỉ tải lên PDF (tối đa 20 MB).", "PDF only (up to 20 MB).")}
          </span>
        </label>
        <Field label={l("출판 연도", "Năm xuất bản", "Published year")} type="number" value={draft.publishedYear} onChange={(value) => field("publishedYear", value)} placeholder="2026" />
        <Field label={l("태그 (쉼표로 구분)", "Tag (phân cách bằng dấu phẩy)", "Tags (comma separated)")} value={draft.tags} onChange={(value) => field("tags", value)} placeholder="OS, Systems, ML" />
        <label className="text-sm font-black">{l("초록 / 메모", "Tóm tắt / ghi chú", "Abstract / note")}<textarea value={draft.abstract} onChange={(event) => field("abstract", event.target.value)} rows={3} className="mt-2 w-full rounded-xl bg-stone-100 px-4 py-3 font-medium outline-none focus:ring-2 focus:ring-violet-300" /></label>
      </div>
      {issue && hasStarted && <p role="alert" className="mt-4 text-sm font-black text-red-600">{issue === "title" ? l("제목을 입력하세요.", "Hãy nhập tiêu đề.", "Enter a title.") : issue === "file" ? l("PDF 파일을 선택하세요.", "Hãy chọn tệp PDF.", "Choose a PDF file.") : issue === "file-type" ? l("PDF 파일만 업로드할 수 있어요.", "Chỉ có thể tải lên tệp PDF.", "Only PDF files can be uploaded.") : issue === "file-size" ? l("파일 크기는 20MB 이하여야 해요.", "Tệp phải có dung lượng tối đa 20 MB.", "The file must be 20 MB or smaller.") : l("출판 연도를 확인하세요.", "Kiểm tra năm xuất bản.", "Check the published year.")}</p>}
      <button disabled={busy || Boolean(issue)} className="mt-5 rounded-full bg-stone-950 px-6 py-3 font-black text-white disabled:opacity-40">{busy ? l("저장 중…", "Đang lưu…", "Saving…") : l("라이브러리에 추가", "Thêm vào thư viện", "Add to library")}</button>
    </form>
  );
}

function Field({ label, value, onChange, type = "text", placeholder = "" }: { label: string; value: string; onChange: (value: string) => void; type?: string; placeholder?: string }) {
  return <label className="text-sm font-black">{label}<input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="mt-2 w-full rounded-xl bg-stone-100 px-4 py-3 font-bold outline-none focus:ring-2 focus:ring-violet-300" /></label>;
}

function SummaryCard({ value, label }: { value: string | number; label: string }) {
  return <article className="rounded-2xl bg-white p-5 shadow-sm"><p className="text-2xl font-black sm:text-3xl">{value}</p><p className="mt-1 text-xs font-black uppercase tracking-wider text-stone-400">{label}</p></article>;
}

function Loading({ compact = false }: { compact?: boolean }) {
  return <div className={compact ? "py-20 text-center" : "grid min-h-screen place-items-center bg-[#f5f3ee]"}><p className="text-sm font-black tracking-[.2em] text-stone-400">LABLOG</p></div>;
}
