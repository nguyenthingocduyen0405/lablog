import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  moveQuestItem,
  parseQuestBundle,
  resolveImportedPaperId,
  serializeQuestBundle,
  type QuestChapter,
  type QuestMission,
} from "../../app/lib/quest-admin";
import {
  changePaperReadingStatus,
  latestQuestionJob,
  localizedQuestionText,
  normalizePaperProgress,
  paperDraftError,
  paperDraftPayload,
  paperFileError,
  paperReadingSummary,
  type LabPaper,
  type PaperProgress,
  type PaperQuestionJob,
} from "../../app/lib/paper-club";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260805000000_quest_studio_paper_club.sql",
  ),
  "utf8",
);

const storageMigration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260806000000_paper_pdf_storage.sql"),
  "utf8",
);

const osQuestMigration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260807000000_os_lab_quest_catalog.sql",
  ),
  "utf8",
);

const paperAiMigration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260815000000_paper_ai_question_sets.sql",
  ),
  "utf8",
);

const paperAiHardeningMigration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260816000000_paper_ai_queue_hardening.sql",
  ),
  "utf8",
);

const paperAiPrivacyMigration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260817000000_paper_ai_error_privacy.sql",
  ),
  "utf8",
);

const paperAiHeartbeatMigration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260818000000_paper_ai_job_heartbeat.sql",
  ),
  "utf8",
);

const paperAiSingleLanguageMigration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260819000000_paper_ai_single_language.sql",
  ),
  "utf8",
);

const paperQuizScoringMigration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260820000000_paper_quiz_scoring.sql",
  ),
  "utf8",
);

const paperProgressCompatibilityMigration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260822000000_paper_progress_branch_compatibility.sql",
  ),
  "utf8",
);

const memberPaperContributionsMigration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260823000000_member_paper_contributions.sql",
  ),
  "utf8",
);

const paperAiWorker = readFileSync(
  resolve(process.cwd(), "workers/paper-question-worker/worker.py"),
  "utf8",
);

const ollamaServiceLimits = readFileSync(
  resolve(
    process.cwd(),
    "workers/paper-question-worker/ollama-lablog.conf",
  ),
  "utf8",
);

const paperAiWorkerService = readFileSync(
  resolve(
    process.cwd(),
    "workers/paper-question-worker/lablog-paper-ai.service",
  ),
  "utf8",
);

test("Paper Club migration protects collaborative data with RLS", () => {
  expect(migration).toContain("create table if not exists public.lab_papers");
  expect(migration).toContain("create table if not exists public.paper_progress");
  expect(migration).toContain("create table if not exists public.paper_comments");
  expect(migration).toContain("alter table public.lab_papers enable row level security");
  expect(migration).toContain("created_by = (select auth.uid())");
  expect(migration).toContain("user_id = (select auth.uid())");
  expect(migration).toContain("public.is_lab_admin(lab_id)");
  expect(migration).toContain(
    'drop policy if exists "Lab members can view papers"',
  );
  expect(migration).toContain(
    'drop policy if exists "Authors or admins can delete paper comments"',
  );
});

test("initial Paper PDF storage policy limits admin uploads to 20 MB", () => {
  expect(storageMigration).toContain("values ('paper-files', 'paper-files', true)");
  expect(storageMigration).toContain("public.is_lab_admin");
  expect(storageMigration).toContain("20971520");
  expect(storageMigration).toContain(
    'drop policy if exists "Paper members can upload PDFs"',
  );
  expect(storageMigration).toContain(
    'drop policy if exists "Paper files are publicly readable"',
  );
});

test("regular lab members can add papers and request AI quizzes", () => {
  expect(memberPaperContributionsMigration).toContain(
    'create policy "Lab members can create papers"',
  );
  expect(memberPaperContributionsMigration).toContain(
    "created_by = (select auth.uid())",
  );
  expect(memberPaperContributionsMigration).toContain(
    "public.is_lab_member(lab_id)",
  );
  expect(memberPaperContributionsMigration).toContain(
    "((storage.foldername(name))[2]) = (select auth.uid())::text",
  );
  expect(memberPaperContributionsMigration).toContain(
    'create policy "Lab members can request paper questions"',
  );
  expect(memberPaperContributionsMigration).toContain(
    "public.is_lab_member(paper.lab_id)",
  );

  const paperClub = readFileSync(
    resolve(process.cwd(), "app/labs/[slug]/papers/page.tsx"),
    "utf8",
  );
  expect(paperClub).toContain("const canContribute = Boolean(viewerId)");
  expect(paperClub).toContain(
    '{canContribute && <button type="button" onClick={() => setShowCreate',
  );
  expect(paperClub).toContain("showCreate && canContribute");
  expect(paperClub).toContain("canGenerate={canContribute}");
  expect(paperClub).toContain("{canGenerate && (");
  expect(paperClub).toContain("{canManage && <Link");
  expect(paperClub).toContain("{canManage && <button");
});

test("Paper AI migration protects jobs and exposes worker-only atomic RPCs", () => {
  expect(paperAiMigration).toContain(
    "create table if not exists public.paper_question_jobs",
  );
  expect(paperAiMigration).toContain(
    "create table if not exists public.paper_question_sets",
  );
  expect(paperAiMigration).toContain(
    "paper_question_jobs_one_active_per_paper_idx",
  );
  expect(paperAiMigration).toContain(
    'where status in (\'queued\', \'processing\')',
  );
  expect(paperAiMigration).toContain(
    'create policy "Lab admins can request paper questions"',
  );
  expect(paperAiMigration).toContain("requested_by = (select auth.uid())");
  expect(paperAiMigration).toContain("for update skip locked");
  expect(paperAiMigration).toContain(
    "public.complete_paper_question_job",
  );
  expect(paperAiMigration).toContain(
    "grant execute on function public.claim_paper_question_job(text)",
  );
  expect(paperAiMigration).toContain("to service_role");
});

test("JCloud worker generates one structured locale per request", () => {
  expect(paperAiWorker).toContain("/api/generate");
  expect(paperAiWorker).toContain("SingleLanguageQuestionSet");
  expect(paperAiWorker).toContain(
    "SingleLanguageQuestionSet.model_json_schema()",
  );
  expect(paperAiWorker).toContain(
    "SingleLanguageQuestionSet.model_validate_json",
  );
  expect(paperAiWorker).toContain('"ko": "natural Korean"');
  expect(paperAiWorker).toContain('"vi": "natural Vietnamese"');
  expect(paperAiWorker).toContain('"en": "natural English"');
  expect(paperAiWorker).toContain("localized[generation_locale]");
  expect(paperAiWorker).toContain('body.get("done_reason") == "length"');
  expect(paperAiWorker).toContain('"5m"');
  expect(paperAiWorker).toContain("ollama.unload(model)");
  expect(paperAiWorker).toContain("process.kill()");
  expect(paperAiWorker).toContain("PdfReader");
  expect(paperAiWorker).toContain('"think": False');
  expect(paperAiWorker).toContain("OLLAMA_URL must point to the local loopback");
  expect(paperAiWorker).toContain("NoRedirectHandler");
  expect(paperAiWorker).toContain("Paper PDF redirected outside the allowed host");
  expect(paperAiWorker).toContain("resource.RLIMIT_AS");
  expect(paperAiWorker).toContain("PAPER_MAX_PAGES");
  expect(paperAiWorker).toContain("paper_token_budget");
  expect(paperAiWorker).toContain("OLLAMA_NUM_PREDICT");
  expect(paperAiWorker).toContain("Emit compact JSON without indentation");
  expect(paperAiWorker).not.toContain("OPENAI_API_KEY");
  expect(paperAiWorker).not.toContain("client.responses");
  expect(paperAiWorker).toContain("difficulty_counts");
  expect(paperAiWorker).toContain("complete_paper_question_job");
  expect(paperAiWorker).toContain("fail_paper_question_job");
  expect(ollamaServiceLimits).toContain('OLLAMA_NUM_PARALLEL=1');
  expect(ollamaServiceLimits).toContain('OLLAMA_MAX_LOADED_MODELS=1');
  expect(ollamaServiceLimits).toContain('OLLAMA_KEEP_ALIVE=0');
  expect(ollamaServiceLimits).toContain("MemoryMax=5500M");
  expect(paperAiWorkerService).toContain("TimeoutStopSec=30min");
});

test("Paper AI queue stores and validates the requested interface locale", () => {
  expect(paperAiSingleLanguageMigration).toContain(
    "generation_locale text not null default 'ko'",
  );
  expect(paperAiSingleLanguageMigration).toContain(
    "generation_locale in ('ko', 'vi', 'en')",
  );
  expect(paperAiSingleLanguageMigration).toContain("job.generation_locale");
  expect(paperAiSingleLanguageMigration).toContain(
    "grant select (generation_locale)",
  );
});

test("Paper Quiz scores retries server-side and completes at 35 points", () => {
  expect(paperQuizScoringMigration).toContain(
    "create table if not exists public.paper_quiz_scores",
  );
  expect(paperQuizScoringMigration).toContain("public.submit_paper_quiz");
  expect(paperQuizScoringMigration).toContain(
    "calculated_score * 0.8",
  );
  expect(paperQuizScoringMigration).toContain(
    "next_awarded := prior_awarded",
  );
  expect(paperQuizScoringMigration).toContain("next_awarded >= 35");
  expect(paperQuizScoringMigration).toContain(
    "jsonb_array_length(submitted_answers)",
  );
  expect(paperQuizScoringMigration).toContain(
    "public.get_paper_quiz_reward_total",
  );
  expect(paperQuizScoringMigration).toContain(
    "public.is_lab_member(target_lab_id, target_user_id)",
  );
  expect(paperProgressCompatibilityMigration).toContain(
    'create policy "Members can create their paper progress"',
  );
  expect(paperProgressCompatibilityMigration).toContain(
    'create policy "Members can update their paper progress"',
  );
  const memberProfile = readFileSync(
    resolve(process.cwd(), "app/members/[id]/page.tsx"),
    "utf8",
  );
  expect(memberProfile).toContain("loadPaperQuizRewardTotal");
  expect(memberProfile).toContain("teamProjectScore +");
  expect(memberProfile).toContain("paperQuizScore");
});

test("Paper AI worker heartbeats long local generations", () => {
  expect(paperAiHeartbeatMigration).toContain(
    "public.heartbeat_paper_question_job",
  );
  expect(paperAiHeartbeatMigration).toContain(
    "stale.updated_at < now() - interval '45 minutes'",
  );
  expect(paperAiHeartbeatMigration).toContain("to service_role");
  expect(paperAiWorker).toContain('"heartbeat_paper_question_job"');
  expect(paperAiWorker).toContain("heartbeat()");
});

test("Paper AI queue releases stale jobs after the final attempt", () => {
  expect(paperAiHardeningMigration).toContain("exhausted.attempt_count >= 10");
  expect(paperAiHardeningMigration).toContain("status = 'failed'");
  expect(paperAiHardeningMigration).toContain(
    "Generation stopped after the maximum number of attempts.",
  );
  expect(paperAiHardeningMigration).toContain("for update skip locked");
});

test("Paper AI provider errors stay hidden from lab members", () => {
  expect(paperAiPrivacyMigration).toContain(
    "revoke select on public.paper_question_jobs from authenticated",
  );
  expect(paperAiPrivacyMigration).toContain("grant select (");
  expect(paperAiPrivacyMigration).not.toContain("error_message,");
});

test("Paper questions localize with fallback and use the latest job per paper", () => {
  const text = { ko: "", vi: "Bản dịch", en: "Translation" };
  expect(localizedQuestionText(text, "vi")).toBe("Bản dịch");
  expect(localizedQuestionText(text, "ko")).toBe("Translation");
  const jobs = [
    { id: "new", paper_id: "paper-1" },
    { id: "old", paper_id: "paper-1" },
  ] as PaperQuestionJob[];
  expect(latestQuestionJob(jobs, "paper-1")?.id).toBe("new");
  expect(latestQuestionJob(jobs, "missing")).toBeUndefined();
});

test("OS Lab catalog migration seeds 12 specialized games with protected progress", () => {
  expect(osQuestMigration).toContain(
    "create table if not exists public.quest_mission_progress",
  );
  expect(osQuestMigration).toContain(
    'drop policy if exists "Members can view own quest mission progress"',
  );
  expect(osQuestMigration).toContain("public.is_lab_member(chapter.lab_id)");
  expect(osQuestMigration).toContain("'os-chapter-1'");
  expect(osQuestMigration).toContain("'os-c1-m1'");
  expect(osQuestMigration).toContain("'os-c3-m4'");
  expect(osQuestMigration.match(/'os-c[123]-m[1234]'/g)).toHaveLength(12);
  expect(osQuestMigration).toContain("'renderer', 'os-lab'");
  expect(osQuestMigration).toContain("paper''s main idea");
  expect(osQuestMigration).toContain("on conflict (id) do update");
});

test("Quest ordering RPC validates complete chapter and mission lists", () => {
  expect(migration).toContain("public.reorder_quest_chapters");
  expect(migration).toContain("public.reorder_quest_missions");
  expect(migration).toContain("count(distinct item_id)");
  expect(migration).toContain("staging_offset + array_position");
  expect(migration).toContain("grant execute on function public.reorder_quest_chapters");
  expect(migration).toContain("protect_lab_paper_identity");
  expect(migration).toContain("quest_missions_validate_paper");
  expect(migration).toContain("protect_quest_chapter_lab");
  expect(migration).toContain("sync_paper_mission_snapshots");
  expect(migration).toContain("update of paper_id, chapter_id, content");
  expect(migration).toContain("status = 'completed' and progress_percent = 100");
});

test("Quest bundles preserve order and reject unsupported content", () => {
  const chapters: QuestChapter[] = [
    {
      id: "chapter-2",
      lab_id: "lab-1",
      order_index: 2,
      title_i18n: { ko: "", vi: "Hai", en: "Two" },
      description_i18n: { ko: "", vi: "", en: "" },
      active: true,
    },
    {
      id: "chapter-1",
      lab_id: "lab-1",
      order_index: 1,
      title_i18n: { ko: "", vi: "Một", en: "One" },
      description_i18n: { ko: "", vi: "", en: "" },
      active: true,
    },
  ];
  const missions: QuestMission[] = [
    {
      id: "mission-1",
      chapter_id: "chapter-1",
      paper_id: "paper-1",
      order_index: 1,
      mission_type: "paper",
      title_i18n: { ko: "", vi: "Đọc paper", en: "Read paper" },
      instructions_i18n: { ko: "", vi: "Tóm tắt", en: "Summarize" },
      content: { paperId: "paper-1", paperUrl: "https://example.com/paper" },
      validation: { minLength: 1 },
      active: true,
    },
  ];

  const parsed = parseQuestBundle(serializeQuestBundle(chapters, missions));
  expect(parsed.chapters.map((chapter) => chapter.title_i18n.en)).toEqual([
    "One",
    "Two",
  ]);
  expect(parsed.chapters[0].missions[0].content.paperId).toBe("paper-1");
  expect(() => parseQuestBundle('{"version":2,"chapters":[]}')).toThrow(
    "Unsupported Quest bundle",
  );
  expect(() =>
    parseQuestBundle(
      JSON.stringify({
        version: 1,
        chapters: [{ title_i18n: {}, missions: [] }],
      }),
    ),
  ).toThrow("Invalid chapter");
  expect(() =>
    parseQuestBundle(
      serializeQuestBundle(chapters, missions).replace(
        "https://example.com/paper",
        "javascript:alert(1)",
      ),
    ),
  ).toThrow("Invalid paper URL");
});

test("Quest import preserves only Paper links validated for the target lab", () => {
  const linked = new Set(["paper-in-this-lab"]);
  expect(
    resolveImportedPaperId(
      "paper",
      { paperId: "paper-in-this-lab" },
      linked,
    ),
  ).toBe("paper-in-this-lab");
  expect(
    resolveImportedPaperId("paper", { paperId: "paper-in-another-lab" }, linked),
  ).toBeNull();
  expect(
    resolveImportedPaperId("quiz", { paperId: "paper-in-this-lab" }, linked),
  ).toBeNull();
});

test("Quest items move only within their valid boundaries", () => {
  const items = [{ id: "a" }, { id: "b" }, { id: "c" }];
  expect(moveQuestItem(items, "b", -1).map((item) => item.id)).toEqual([
    "b",
    "a",
    "c",
  ]);
  expect(moveQuestItem(items, "a", -1)).toBe(items);
  expect(moveQuestItem(items, "missing", 1)).toBe(items);
});

test("Paper input rejects unsafe URLs and normalizes reading progress", () => {
  const draft = {
    title: "Operating systems paper",
    authors: "OS Lab",
    abstract: "A useful paper",
    paperUrl: "https://example.com/paper.pdf",
    publishedYear: "2026",
    tags: "OS, systems, OS",
  };
  expect(paperDraftError(draft)).toBeNull();
  expect(paperDraftPayload(draft)).toMatchObject({
    paper_url: "https://example.com/paper.pdf",
    published_year: 2026,
    tags: ["OS", "systems"],
  });
  expect(paperDraftError({ ...draft, paperUrl: "javascript:alert(1)" })).toBe(
    "url",
  );
  expect(normalizePaperProgress("to-read", 25)).toEqual({
    status: "reading",
    progressPercent: 25,
  });
  expect(normalizePaperProgress("reading", 100)).toEqual({
    status: "completed",
    progressPercent: 100,
  });
  expect(changePaperReadingStatus("reading", 100)).toEqual({
    status: "reading",
    progressPercent: 95,
  });
  expect(changePaperReadingStatus("to-read", 65)).toEqual({
    status: "to-read",
    progressPercent: 0,
  });
});

test("Paper upload validates the selected PDF", () => {
  expect(paperFileError(null)).toBe("file");
  expect(paperFileError({ name: "paper.pdf", type: "application/pdf", size: 1024 })).toBeNull();
  expect(paperFileError({ name: "paper.txt", type: "text/plain", size: 1024 })).toBe("file-type");
  expect(paperFileError({ name: "paper.pdf", type: "application/pdf", size: 20 * 1024 * 1024 + 1 })).toBe("file-size");
});

test("Paper reading summary counts readers, completions, and average progress", () => {
  const papers = [{ id: "paper-1" }, { id: "paper-2" }] as LabPaper[];
  const progress = [
    { user_id: "a", status: "completed", progress_percent: 100 },
    { user_id: "b", status: "reading", progress_percent: 50 },
    { user_id: "a", status: "reading", progress_percent: 25 },
  ] as PaperProgress[];
  expect(paperReadingSummary(papers, progress)).toEqual({
    papers: 2,
    readers: 2,
    completed: 1,
    average: 58,
  });
});

test("Quest Studio exposes ordering, JSON bundles, and Paper Club linking", () => {
  const editor = readFileSync(
    resolve(process.cwd(), "app/labs/[slug]/quests/page.tsx"),
    "utf8",
  );
  const player = readFileSync(
    resolve(process.cwd(), "app/labquest/generic-labquest.tsx"),
    "utf8",
  );
  expect(editor).toContain("reorderQuestChapters");
  expect(editor).toContain("serializeQuestBundle");
  expect(editor).toContain("accept=\"application/json,.json\"");
  expect(editor).toContain("Linked paper");
  expect(editor).toContain('event.key === "Escape"');
  expect(editor).toContain('document.body.style.overflow = "hidden"');
  expect(player).toContain("PAPER CLUB");
  expect(player).toContain("View discussion");
  const paperClub = readFileSync(
    resolve(process.cwd(), "app/labs/[slug]/papers/page.tsx"),
    "utf8",
  );
  expect(paperClub).toContain("scrollIntoView");
  expect(paperClub).not.toContain("changePaperReadingStatus");
  expect(paperClub).not.toContain('type="range"');
  expect(paperClub).not.toContain("Mark as completed");
  expect(paperClub).toContain("submitPaperQuiz");
  expect(paperClub).toContain("Submit first attempt");
  expect(paperClub).toContain("Submit improvement attempt (80%)");
  expect(paperClub).toContain("Submit practice");
  expect(paperClub).toContain("Reach 35 points to complete the paper automatically.");
  expect(paperClub).toContain("createQuizLayout");
  expect(paperClub).toContain('accept="application/pdf,.pdf"');
  expect(paperClub).toContain("uploadPaperFile");
  expect(paperClub).toContain("requestPaperQuestionSet");
  expect(paperClub).toContain(
    "requestPaperQuestionSet(paper.id, viewerId, locale)",
  );
  expect(paperClub).toContain("generated in your current language");
  expect(paperClub).toContain("PaperQuestionCard");
  expect(paperClub).toContain("AI PAPER QUIZ");
  expect(paperClub).toContain("aria-pressed");
  expect(paperClub).toContain("AI is working");
  expect(paperClub).toContain("questionSet?.generated_by_job_id");
  expect(paperClub).not.toContain("job.error_message");
  expect(paperClub).not.toContain('<Field label="URL *"');
});

test("Paper Club route is protected for signed-out visitors", async ({ page }) => {
  await page.goto("/labs/os-lab/papers");
  await expect(page).toHaveURL(/\/login$/);
});

test("Paper Club launches a replayable, persistent Paper Arena explainer", () => {
  const paperClub = readFileSync(
    resolve(process.cwd(), "app/labs/[slug]/papers/page.tsx"),
    "utf8",
  );
  const arena = readFileSync(
    resolve(process.cwd(), "app/components/paper-arena.tsx"),
    "utf8",
  );

  expect(paperClub).toContain("<PaperArena");
  expect(paperClub).toContain("lablog:paper-arena:v3:");
  expect(paperClub).toContain("window.localStorage.setItem");
  expect(paperClub).toContain("Replay Paper Arena");
  expect(arena).toContain('role="dialog"');
  expect(arena).toContain('event.key === "Escape"');
  expect(arena).toContain("BEGINNER STORY");
  expect(arena).toContain("PEER REVIEW");
  expect(arena).toContain("CONFERENCE CHALLENGE");
  expect(arena).toContain("JOURNAL CHALLENGE");
  expect(arena).toContain("Move paper to the next gate");
  expect(arena).toContain("routeProgress.conference < 3");
  expect(arena).toContain("routeProgress.journal < 3");
  expect(arena).toContain("Mark both statements O or X");
  expect(arena).toContain("MISCONCEPTION CLEARED");
});
