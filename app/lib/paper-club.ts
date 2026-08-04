import { createClient } from "./supabase/client";

export type PaperStatus = "to-read" | "reading" | "completed";

export type LabPaper = {
  id: string;
  lab_id: string;
  created_by: string | null;
  title: string;
  authors: string;
  abstract: string;
  paper_url: string;
  published_year: number | null;
  tags: string[];
  created_at: string;
};

export type PaperProgress = {
  paper_id: string;
  user_id: string;
  status: PaperStatus;
  progress_percent: number;
  updated_at: string;
};

export type PaperComment = {
  id: string;
  paper_id: string;
  user_id: string;
  body: string;
  created_at: string;
  author_name: string;
};

export type PaperQuestionJobStatus =
  | "queued"
  | "processing"
  | "completed"
  | "failed";

export type LocalizedQuestionText = {
  ko: string;
  vi: string;
  en: string;
};

export type PaperQuestion = {
  id: string;
  difficulty: "easy" | "medium" | "hard";
  section: string;
  question: LocalizedQuestionText;
  options: LocalizedQuestionText[];
  answer_index: number;
  explanation: LocalizedQuestionText;
  source_page: number | null;
  source_excerpt: string;
};

export type PaperQuestionPayload = {
  summary: LocalizedQuestionText;
  questions: PaperQuestion[];
};

export type PaperQuestionJob = {
  id: string;
  paper_id: string;
  requested_by: string;
  generation_locale: "ko" | "vi" | "en";
  status: PaperQuestionJobStatus;
  attempt_count: number;
  model: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
};

export type PaperQuestionSet = {
  paper_id: string;
  generated_by_job_id: string | null;
  model: string;
  payload: PaperQuestionPayload;
  created_at: string;
  updated_at: string;
};

export type PaperQuizScore = {
  paper_id: string;
  user_id: string;
  attempt_count: number;
  first_score: number;
  second_score: number | null;
  awarded_score: number;
  best_correct_count: number;
  last_correct_count: number;
  last_question_count: number;
  updated_at: string;
};

export type PaperQuizSubmission = {
  attempt_number: number;
  correct_count: number;
  question_count: number;
  raw_score: number;
  awarded_score: number;
  score_changed: boolean;
  is_completed: boolean;
  is_scored_attempt: boolean;
};

export type PaperDraft = {
  title: string;
  authors: string;
  abstract: string;
  paperUrl: string;
  publishedYear: string;
  tags: string;
};

export const EMPTY_PAPER_DRAFT: PaperDraft = {
  title: "",
  authors: "",
  abstract: "",
  paperUrl: "",
  publishedYear: "",
  tags: "",
};

export const MAX_PAPER_FILE_SIZE = 20 * 1024 * 1024;

export function paperFileError(
  file: Pick<File, "name" | "size" | "type"> | null,
) {
  if (!file) return "file";
  const isPdf =
    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  if (!isPdf) return "file-type";
  if (file.size > MAX_PAPER_FILE_SIZE) return "file-size";
  return null;
}

const PAPER_SELECT =
  "id,lab_id,created_by,title,authors,abstract,paper_url,published_year,tags,created_at" as const;

export function paperDraftError(draft: PaperDraft) {
  if (!draft.title.trim()) return "title";
  try {
    const url = new URL(draft.paperUrl.trim());
    if (!['http:', 'https:'].includes(url.protocol)) return "url";
  } catch {
    return "url";
  }
  if (draft.publishedYear.trim()) {
    const year = Number(draft.publishedYear);
    if (!Number.isInteger(year) || year < 1800 || year > 2200) return "year";
  }
  return null;
}

export function paperDraftPayload(draft: PaperDraft) {
  const error = paperDraftError(draft);
  if (error) throw new Error(`Invalid paper ${error}`);
  return {
    title: draft.title.trim(),
    authors: draft.authors.trim(),
    abstract: draft.abstract.trim(),
    paper_url: draft.paperUrl.trim(),
    published_year: draft.publishedYear.trim()
      ? Number(draft.publishedYear)
      : null,
    tags: [...new Set(draft.tags.split(",").map((tag) => tag.trim()).filter(Boolean))],
    updated_at: new Date().toISOString(),
  };
}

export function normalizePaperProgress(status: PaperStatus, progress: number) {
  const progressPercent = Math.min(100, Math.max(0, Math.round(progress)));
  if (status === "completed" || progressPercent === 100) {
    return { status: "completed" as const, progressPercent: 100 };
  }
  if (status === "to-read" && progressPercent > 0) {
    return { status: "reading" as const, progressPercent };
  }
  return { status, progressPercent };
}

export function changePaperReadingStatus(
  status: PaperStatus,
  currentProgress: number,
) {
  if (status === "completed") {
    return { status, progressPercent: 100 };
  }
  if (status === "to-read") {
    return { status, progressPercent: 0 };
  }
  return {
    status,
    progressPercent: currentProgress >= 100 ? 95 : Math.max(0, currentProgress),
  };
}

export function paperReadingSummary(
  papers: LabPaper[],
  progress: PaperProgress[],
) {
  const readers = new Set(progress.map((item) => item.user_id)).size;
  const completed = progress.filter((item) => item.status === "completed").length;
  const average = progress.length
    ? Math.round(
        progress.reduce((sum, item) => sum + item.progress_percent, 0) /
          progress.length,
      )
    : 0;
  return { papers: papers.length, readers, completed, average };
}

export function localizedQuestionText(
  value: LocalizedQuestionText,
  locale: "ko" | "vi" | "en",
) {
  return value[locale]?.trim() || value.en.trim() || value.vi.trim() || value.ko.trim();
}

export function latestQuestionJob(
  jobs: PaperQuestionJob[],
  paperId: string,
) {
  return jobs.find((job) => job.paper_id === paperId);
}

export async function loadPapers(labId: string) {
  const supabase = createClient();
  const result = await supabase
    .from("lab_papers")
    .select(PAPER_SELECT)
    .eq("lab_id", labId)
    .order("created_at", { ascending: false });
  if (result.error) throw result.error;
  return (result.data ?? []) as LabPaper[];
}

export async function loadPaperClub(labId: string) {
  const supabase = createClient();
  const papers = await loadPapers(labId);
  if (papers.length === 0) {
    return {
      papers,
      progress: [] as PaperProgress[],
      comments: [] as PaperComment[],
      questionJobs: [] as PaperQuestionJob[],
      questionSets: [] as PaperQuestionSet[],
      quizScores: [] as PaperQuizScore[],
    };
  }
  const paperIds = papers.map((paper) => paper.id);
  const [progressResult, commentsResult, jobsResult, setsResult, scoresResult] = await Promise.all([
    supabase
      .from("paper_progress")
      .select("paper_id,user_id,status,progress_percent,updated_at")
      .in("paper_id", paperIds),
    supabase
      .from("paper_comments")
      .select("id,paper_id,user_id,body,created_at")
      .in("paper_id", paperIds)
      .order("created_at", { ascending: true }),
    supabase
      .from("paper_question_jobs")
      .select("id,paper_id,requested_by,generation_locale,status,attempt_count,model,created_at,started_at,completed_at")
      .in("paper_id", paperIds)
      .order("created_at", { ascending: false }),
    supabase
      .from("paper_question_sets")
      .select("paper_id,generated_by_job_id,model,payload,created_at,updated_at")
      .in("paper_id", paperIds),
    supabase
      .from("paper_quiz_scores")
      .select("paper_id,user_id,attempt_count,first_score,second_score,awarded_score,best_correct_count,last_correct_count,last_question_count,updated_at")
      .in("paper_id", paperIds),
  ]);
  if (progressResult.error) throw progressResult.error;
  if (commentsResult.error) throw commentsResult.error;
  if (jobsResult.error) throw jobsResult.error;
  if (setsResult.error) throw setsResult.error;
  if (scoresResult.error) throw scoresResult.error;

  const rawComments = (commentsResult.data ?? []) as Omit<
    PaperComment,
    "author_name"
  >[];
  const userIds = [...new Set(rawComments.map((comment) => comment.user_id))];
  const names = new Map<string, string>();
  if (userIds.length > 0) {
    const profilesResult = await supabase
      .from("profiles")
      .select("id,name")
      .in("id", userIds);
    if (!profilesResult.error) {
      for (const profile of profilesResult.data ?? []) {
        names.set(String(profile.id), String(profile.name || "Member"));
      }
    }
  }

  return {
    papers,
    progress: (progressResult.data ?? []) as PaperProgress[],
    comments: rawComments.map((comment) => ({
      ...comment,
      author_name: names.get(comment.user_id) ?? "Member",
    })),
    questionJobs: (jobsResult.data ?? []) as PaperQuestionJob[],
    questionSets: (setsResult.data ?? []) as PaperQuestionSet[],
    quizScores: (scoresResult.data ?? []) as PaperQuizScore[],
  };
}

export async function createPaper(
  labId: string,
  userId: string,
  draft: PaperDraft,
) {
  const supabase = createClient();
  const result = await supabase
    .from("lab_papers")
    .insert({
      ...paperDraftPayload(draft),
      lab_id: labId,
      created_by: userId,
    })
    .select(PAPER_SELECT)
    .single();
  if (result.error) throw result.error;
  return result.data as LabPaper;
}

export async function uploadPaperFile(
  labId: string,
  userId: string,
  file: File,
) {
  const validationError = paperFileError(file);
  if (validationError) throw new Error(`Invalid paper ${validationError}`);

  const supabase = createClient();
  const path = `${labId}/${userId}/${crypto.randomUUID()}.pdf`;
  const upload = await supabase.storage.from("paper-files").upload(path, file, {
    contentType: "application/pdf",
    upsert: false,
  });
  if (upload.error) throw upload.error;

  const { data } = supabase.storage.from("paper-files").getPublicUrl(upload.data.path);
  return data.publicUrl;
}

export async function deletePaper(paperId: string) {
  const supabase = createClient();
  const result = await supabase.from("lab_papers").delete().eq("id", paperId);
  if (result.error) throw result.error;
}

export async function savePaperProgress(
  paperId: string,
  userId: string,
  status: PaperStatus,
  progress: number,
) {
  const supabase = createClient();
  const normalized = normalizePaperProgress(status, progress);
  const result = await supabase
    .from("paper_progress")
    .upsert(
      {
        paper_id: paperId,
        user_id: userId,
        status: normalized.status,
        progress_percent: normalized.progressPercent,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "paper_id,user_id" },
    );
  if (result.error) throw result.error;
}

export async function createPaperComment(
  paperId: string,
  userId: string,
  body: string,
) {
  const trimmed = body.trim();
  if (!trimmed || trimmed.length > 2000) {
    throw new Error("Comment must contain between 1 and 2000 characters.");
  }
  const supabase = createClient();
  const result = await supabase.from("paper_comments").insert({
    paper_id: paperId,
    user_id: userId,
    body: trimmed,
  });
  if (result.error) throw result.error;
}

export async function deletePaperComment(commentId: string) {
  const supabase = createClient();
  const result = await supabase
    .from("paper_comments")
    .delete()
    .eq("id", commentId);
  if (result.error) throw result.error;
}

export async function requestPaperQuestionSet(
  paperId: string,
  userId: string,
  locale: "ko" | "vi" | "en",
) {
  const supabase = createClient();
  const result = await supabase.from("paper_question_jobs").insert({
    paper_id: paperId,
    requested_by: userId,
    generation_locale: locale,
  });
  if (result.error?.code === "23505") {
    throw new Error("Question generation is already queued for this paper.");
  }
  if (result.error) throw result.error;
}

export async function submitPaperQuiz(
  paperId: string,
  answers: number[],
) {
  const supabase = createClient();
  const result = await supabase
    .rpc("submit_paper_quiz", {
      target_paper_id: paperId,
      submitted_answers: answers,
    })
    .single();
  if (result.error) throw result.error;
  return result.data as PaperQuizSubmission;
}

export async function loadPaperQuizRewardTotal(
  userId: string,
  labId: string,
) {
  const supabase = createClient();
  const result = await supabase.rpc("get_paper_quiz_reward_total", {
    target_user_id: userId,
    target_lab_id: labId,
  });
  if (result.error && ["PGRST202", "42883"].includes(result.error.code)) return 0;
  if (result.error) throw result.error;
  return Number(result.data ?? 0);
}
