import { createClient } from "./supabase/client";

export type QuestLocale = "ko" | "vi" | "en";
export type LocalizedText = Record<QuestLocale, string>;
export type QuestMissionType =
  | "quiz"
  | "paper"
  | "ordering"
  | "code-output"
  | "code-editor"
  | "graph"
  | "custom";
export type MissionTemplateType = QuestMissionType | "matching";

export type QuestChapter = {
  id: string;
  lab_id: string;
  order_index: number;
  title_i18n: LocalizedText;
  description_i18n: LocalizedText;
  active: boolean;
};

export type QuestMission = {
  id: string;
  chapter_id: string;
  paper_id: string | null;
  order_index: number;
  mission_type: QuestMissionType;
  title_i18n: LocalizedText;
  instructions_i18n: LocalizedText;
  content: Record<string, unknown>;
  validation: Record<string, unknown>;
  active: boolean;
};

export type ChapterDraft = {
  title: LocalizedText;
  description: LocalizedText;
};

export type MissionDraft = {
  title: LocalizedText;
  instructions: LocalizedText;
  missionType: MissionTemplateType;
  options: string[];
  answerIndex: number;
  items: string[];
  pairs: Array<{ left: string; right: string }>;
  prompt: string;
  expectedAnswer: string;
  starterCode: string;
  rewardPoints: number;
  paperId: string;
  paperTitle: string;
  paperUrl: string;
};

export type MissionGamePayload = {
  content: Record<string, unknown>;
  validation: Record<string, unknown>;
};

export function safeQuestPaperUrl(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return "";
  try {
    const url = new URL(value.trim());
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : "";
  } catch {
    return "";
  }
}

export function buildMissionGamePayload(
  draft: MissionDraft,
): MissionGamePayload {
  const rewardPoints = Math.min(1000, Math.max(0, draft.rewardPoints || 0));
  const sharedContent = { rewardPoints };

  switch (draft.missionType) {
    case "quiz": {
      const normalizedOptions = draft.options
        .map((option, originalIndex) => ({ option: option.trim(), originalIndex }))
        .filter((item) => item.option);
      return {
        content: {
          ...sharedContent,
          options: normalizedOptions.map((item) => item.option),
        },
        validation: {
          answerIndex: normalizedOptions.findIndex(
            (item) => item.originalIndex === draft.answerIndex,
          ),
        },
      };
    }
    case "matching": {
      const pairs = draft.pairs
        .map((pair) => ({ left: pair.left.trim(), right: pair.right.trim() }))
        .filter((pair) => pair.left && pair.right);
      return {
        content: { ...sharedContent, pairs },
        validation: { matching: true, pairCount: pairs.length },
      };
    }
    case "ordering": {
      const items = draft.items.map((item) => item.trim()).filter(Boolean);
      return {
        content: { ...sharedContent, items },
        validation: { correctOrder: items },
      };
    }
    case "code-output":
      return {
        content: { ...sharedContent, codeSnippet: draft.starterCode },
        validation: { expectedAnswer: draft.expectedAnswer.trim() },
      };
    case "code-editor":
      return {
        content: { ...sharedContent, starterCode: draft.starterCode },
        validation: { expectedAnswer: draft.expectedAnswer.trim() },
      };
    case "paper":
      return {
        content: {
          ...sharedContent,
          responsePlaceholder: draft.prompt,
          paperId: draft.paperId,
          paperTitle: draft.paperTitle,
          paperUrl: draft.paperUrl,
        },
        validation: { minLength: 1 },
      };
    case "graph":
      return {
        content: { ...sharedContent, graphPrompt: draft.prompt },
        validation: { minLength: 1 },
      };
    default:
      return {
        content: { ...sharedContent, confirmationLabel: draft.prompt },
        validation: {},
      };
  }
}

export function missionDraftError(draft: MissionDraft) {
  if (!Object.values(draft.title).some((value) => value.trim())) return "title";
  if (
    draft.missionType === "quiz" &&
    draft.options.filter((option) => option.trim()).length < 2
  ) {
    return "quiz-options";
  }
  if (
    draft.missionType === "quiz" &&
    (draft.answerIndex < 0 ||
      draft.answerIndex >= draft.options.length ||
      !draft.options[draft.answerIndex]?.trim())
  ) {
    return "quiz-answer";
  }
  if (
    draft.missionType === "matching" &&
    draft.pairs.filter((pair) => pair.left.trim() && pair.right.trim()).length < 2
  ) {
    return "matching-pairs";
  }
  if (
    draft.missionType === "ordering" &&
    draft.items.filter((item) => item.trim()).length < 2
  ) {
    return "ordering-items";
  }
  if (
    (draft.missionType === "code-output" ||
      draft.missionType === "code-editor") &&
    !draft.expectedAnswer.trim()
  ) {
    return "expected-answer";
  }
  return null;
}

export const EMPTY_LOCALIZED_TEXT: LocalizedText = {
  ko: "",
  vi: "",
  en: "",
};

export function singleLanguageText(
  language: QuestLocale,
  text: string,
): LocalizedText {
  return { ko: "", vi: "", en: "", [language]: text };
}

export function localizedText(
  value: Partial<LocalizedText> | null | undefined,
): LocalizedText {
  return {
    ko: String(value?.ko ?? ""),
    vi: String(value?.vi ?? ""),
    en: String(value?.en ?? ""),
  };
}

export function moveQuestItem<T extends { id: string }>(
  items: T[],
  itemId: string,
  direction: -1 | 1,
) {
  const index = items.findIndex((item) => item.id === itemId);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= items.length) return items;
  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

export type QuestBundle = {
  version: 1;
  chapters: Array<{
    title_i18n: LocalizedText;
    description_i18n: LocalizedText;
    active: boolean;
    missions: Array<{
      mission_type: QuestMissionType;
      title_i18n: LocalizedText;
      instructions_i18n: LocalizedText;
      content: Record<string, unknown>;
      validation: Record<string, unknown>;
      active: boolean;
    }>;
  }>;
};

export function buildQuestBundle(
  chapters: QuestChapter[],
  missions: QuestMission[],
): QuestBundle {
  return {
    version: 1,
    chapters: [...chapters]
      .sort((a, b) => a.order_index - b.order_index)
      .map((chapter) => ({
        title_i18n: localizedText(chapter.title_i18n),
        description_i18n: localizedText(chapter.description_i18n),
        active: chapter.active,
        missions: missions
          .filter((mission) => mission.chapter_id === chapter.id)
          .sort((a, b) => a.order_index - b.order_index)
          .map((mission) => ({
            mission_type: mission.mission_type,
            title_i18n: localizedText(mission.title_i18n),
            instructions_i18n: localizedText(mission.instructions_i18n),
            content: mission.content,
            validation: mission.validation,
            active: mission.active,
          })),
      })),
  };
}

export function serializeQuestBundle(
  chapters: QuestChapter[],
  missions: QuestMission[],
) {
  return JSON.stringify(buildQuestBundle(chapters, missions), null, 2);
}

export function resolveImportedPaperId(
  missionType: QuestMissionType,
  content: Record<string, unknown>,
  validPaperIds: ReadonlySet<string>,
) {
  const paperId = typeof content.paperId === "string" ? content.paperId : "";
  return missionType === "paper" && validPaperIds.has(paperId)
    ? paperId
    : null;
}

const MISSION_TYPES: QuestMissionType[] = [
  "quiz",
  "paper",
  "ordering",
  "code-output",
  "code-editor",
  "graph",
  "custom",
];

export function parseQuestBundle(value: string): QuestBundle {
  const parsed = JSON.parse(value) as Partial<QuestBundle>;
  if (parsed.version !== 1 || !Array.isArray(parsed.chapters)) {
    throw new Error("Unsupported Quest bundle.");
  }
  for (const chapter of parsed.chapters) {
    if (
      !chapter ||
      typeof chapter !== "object" ||
      !Array.isArray(chapter.missions) ||
      !Object.values(localizedText(chapter.title_i18n)).some((text) => text.trim())
    ) {
      throw new Error("Invalid chapter in Quest bundle.");
    }
    if (typeof chapter.active !== "boolean") {
      throw new Error("Invalid chapter publishing state in Quest bundle.");
    }
    for (const mission of chapter.missions) {
      if (
        !mission ||
        !MISSION_TYPES.includes(mission.mission_type) ||
        !mission.content ||
        Array.isArray(mission.content) ||
        typeof mission.content !== "object" ||
        !mission.validation ||
        Array.isArray(mission.validation) ||
        typeof mission.validation !== "object" ||
        !Object.values(localizedText(mission.title_i18n)).some((text) => text.trim())
      ) {
        throw new Error("Invalid mission in Quest bundle.");
      }
      if (typeof mission.active !== "boolean") {
        throw new Error("Invalid mission publishing state in Quest bundle.");
      }
      if (
        mission.mission_type === "paper" &&
        mission.content.paperUrl &&
        !safeQuestPaperUrl(mission.content.paperUrl)
      ) {
        throw new Error("Invalid paper URL in Quest bundle.");
      }
      if (mission.mission_type === "quiz") {
        const options = Array.isArray(mission.content.options)
          ? mission.content.options
          : [];
        const answerIndex = mission.validation.answerIndex;
        if (
          options.length < 2 ||
          options.some(
            (option) => typeof option !== "string" || !option.trim(),
          ) ||
          !Number.isInteger(answerIndex) ||
          Number(answerIndex) < 0 ||
          Number(answerIndex) >= options.length
        ) {
          throw new Error("Invalid quiz answer in Quest bundle.");
        }
      }
      if (mission.mission_type === "ordering") {
        const pairs = mission.content.pairs;
        const items = mission.content.items;
        const correctOrder = mission.validation.correctOrder;
        const validMatching =
          Array.isArray(pairs) &&
          pairs.length >= 2 &&
          pairs.every(
            (pair) =>
              pair &&
              typeof pair === "object" &&
              typeof (pair as { left?: unknown }).left === "string" &&
              Boolean((pair as { left: string }).left.trim()) &&
              typeof (pair as { right?: unknown }).right === "string" &&
              Boolean((pair as { right: string }).right.trim()),
          ) &&
          mission.validation.matching === true &&
          mission.validation.pairCount === pairs.length;
        const validLegacyOrdering =
          !Array.isArray(items) ||
          items.length < 2
            ? false
            : items.every((item) => typeof item === "string" && item.trim()) &&
              Array.isArray(correctOrder) &&
              correctOrder.length === items.length &&
              correctOrder.every((item) => typeof item === "string" && item.trim());
        if (!validMatching && !validLegacyOrdering)
          throw new Error("Invalid matching mission in Quest bundle.");
      }
      if (
        ["code-output", "code-editor"].includes(mission.mission_type) &&
        (typeof mission.validation.expectedAnswer !== "string" ||
          !mission.validation.expectedAnswer.trim())
      ) {
        throw new Error("Invalid code answer in Quest bundle.");
      }
    }
  }
  return parsed as QuestBundle;
}

export function buildStarterQuest() {
  return {
    chapter: {
      title_i18n: {
        ko: "랩 온보딩",
        vi: "Làm quen với lab",
        en: "Lab onboarding",
      },
      description_i18n: {
        ko: "새 멤버가 연구실의 사람, 규칙, 목표를 알아가는 첫 챕터입니다.",
        vi: "Chapter đầu tiên giúp thành viên mới hiểu con người, quy tắc và mục tiêu của lab.",
        en: "A first chapter for learning the lab's people, rules, and goals.",
      },
    },
    missions: [
      {
        mission_type: "custom" as const,
        title_i18n: {
          ko: "랩 멤버 알아보기",
          vi: "Làm quen với thành viên",
          en: "Meet the lab",
        },
        instructions_i18n: {
          ko: "랩 멤버 두 명에게 인사하고 각자의 연구 주제를 알아보세요.",
          vi: "Chào hỏi hai thành viên và tìm hiểu chủ đề nghiên cứu của họ.",
          en: "Meet two members and learn about their research topics.",
        },
      },
      {
        mission_type: "quiz" as const,
        title_i18n: {
          ko: "랩 규칙 확인",
          vi: "Kiểm tra quy tắc lab",
          en: "Know the lab rules",
        },
        instructions_i18n: {
          ko: "문제가 생겼을 때 가장 먼저 해야 할 일을 고르세요.",
          vi: "Chọn việc nên làm đầu tiên khi có vấn đề.",
          en: "Choose what to do first when a problem occurs.",
        },
        options: [
          "랩장 또는 담당자에게 알린다",
          "아무에게도 말하지 않는다",
          "다른 사람의 계정으로 처리한다",
        ],
        answerIndex: 0,
      },
      {
        mission_type: "paper" as const,
        title_i18n: {
          ko: "첫 연구 목표 공유",
          vi: "Chia sẻ mục tiêu đầu tiên",
          en: "Share your first goal",
        },
        instructions_i18n: {
          ko: "이번 주에 이루고 싶은 연구 목표를 짧게 작성하세요.",
          vi: "Viết ngắn gọn mục tiêu nghiên cứu bạn muốn đạt trong tuần này.",
          en: "Write a short research goal you want to achieve this week.",
        },
      },
    ],
  };
}

const CHAPTER_SELECT =
  "id,lab_id,order_index,title_i18n,description_i18n,active" as const;
const MISSION_SELECT =
  "id,chapter_id,paper_id,order_index,mission_type,title_i18n,instructions_i18n,content,validation,active" as const;

export async function loadQuestContent(labId: string) {
  const supabase = createClient();
  const chaptersResult = await supabase
    .from("quest_chapters")
    .select(CHAPTER_SELECT)
    .eq("lab_id", labId)
    .order("order_index");
  if (chaptersResult.error) throw chaptersResult.error;

  const chapters = (chaptersResult.data ?? []) as QuestChapter[];
  if (chapters.length === 0) {
    return { chapters, missions: [] as QuestMission[] };
  }

  const missionsResult = await supabase
    .from("quest_missions")
    .select(MISSION_SELECT)
    .in(
      "chapter_id",
      chapters.map((chapter) => chapter.id),
    )
    .order("order_index");
  if (missionsResult.error) throw missionsResult.error;
  return {
    chapters,
    missions: (missionsResult.data ?? []) as QuestMission[],
  };
}

export async function createStarterQuest(labId: string) {
  const supabase = createClient();
  const template = buildStarterQuest();
  const chapterResult = await supabase
    .from("quest_chapters")
    .insert({
      lab_id: labId,
      order_index: 1,
      title_i18n: template.chapter.title_i18n,
      description_i18n: template.chapter.description_i18n,
      active: true,
    })
    .select(CHAPTER_SELECT)
    .single();
  if (chapterResult.error) throw chapterResult.error;

  const chapter = chapterResult.data as QuestChapter;
  const missionResult = await supabase
    .from("quest_missions")
    .insert(
      template.missions.map((mission, index) => ({
        chapter_id: chapter.id,
        order_index: index + 1,
        mission_type: mission.mission_type,
        title_i18n: mission.title_i18n,
        instructions_i18n: mission.instructions_i18n,
        content:
          "options" in mission ? { options: mission.options } : {},
        validation:
          "answerIndex" in mission
            ? { answerIndex: mission.answerIndex }
            : {},
        active: true,
      })),
    )
    .select(MISSION_SELECT);
  if (missionResult.error) {
    await supabase.from("quest_chapters").delete().eq("id", chapter.id);
    throw missionResult.error;
  }
  return {
    chapter,
    missions: (missionResult.data ?? []) as QuestMission[],
  };
}

export async function ensureStarterQuest(labId: string) {
  const supabase = createClient();
  const existing = await supabase
    .from("quest_chapters")
    .select("id", { count: "exact", head: true })
    .eq("lab_id", labId);
  if (existing.error) throw existing.error;
  if ((existing.count ?? 0) > 0) return null;
  return createStarterQuest(labId);
}

export async function saveQuestChapter(
  labId: string,
  draft: ChapterDraft,
  chapters: QuestChapter[],
  chapterId?: string,
) {
  const supabase = createClient();
  const payload = {
    title_i18n: draft.title,
    description_i18n: draft.description,
  };
  const query = chapterId
    ? supabase
        .from("quest_chapters")
        .update(payload)
        .eq("id", chapterId)
        .eq("lab_id", labId)
    : supabase.from("quest_chapters").insert({
        ...payload,
        lab_id: labId,
        order_index:
          Math.max(0, ...chapters.map((chapter) => chapter.order_index)) + 1,
        active: true,
      });
  const result = await query.select(CHAPTER_SELECT).single();
  if (result.error) throw result.error;
  return result.data as QuestChapter;
}

export async function setQuestChapterActive(
  chapterId: string,
  active: boolean,
) {
  const supabase = createClient();
  const result = await supabase
    .from("quest_chapters")
    .update({ active })
    .eq("id", chapterId);
  if (result.error) throw result.error;
}

export async function deleteQuestChapter(chapterId: string) {
  const supabase = createClient();
  const result = await supabase
    .from("quest_chapters")
    .delete()
    .eq("id", chapterId);
  if (result.error) throw result.error;
}

export async function saveQuestMission(
  chapterId: string,
  draft: MissionDraft,
  missions: QuestMission[],
  missionId?: string,
) {
  const supabase = createClient();
  const game = buildMissionGamePayload(draft);
  const existingMission = missionId
    ? missions.find((mission) => mission.id === missionId)
    : undefined;
  const specializedMission =
    existingMission?.content.renderer === "os-lab";
  const payload = {
    mission_type: specializedMission
      ? existingMission.mission_type
      : draft.missionType === "matching"
        ? "ordering"
        : draft.missionType,
    paper_id: draft.missionType === "paper" && draft.paperId ? draft.paperId : null,
    title_i18n: draft.title,
    instructions_i18n: draft.instructions,
    content: specializedMission
      ? {
          ...existingMission.content,
          rewardPoints: game.content.rewardPoints,
        }
      : game.content,
    validation: specializedMission
      ? existingMission.validation
      : game.validation,
  };
  const query = missionId
    ? supabase
        .from("quest_missions")
        .update(payload)
        .eq("id", missionId)
        .eq("chapter_id", chapterId)
    : supabase.from("quest_missions").insert({
        ...payload,
        chapter_id: chapterId,
        order_index:
          Math.max(
            0,
            ...missions
              .filter((mission) => mission.chapter_id === chapterId)
              .map((mission) => mission.order_index),
          ) + 1,
        active: true,
      });
  const result = await query.select(MISSION_SELECT).single();
  if (result.error) throw result.error;
  return result.data as QuestMission;
}

export async function setQuestMissionActive(
  missionId: string,
  active: boolean,
) {
  const supabase = createClient();
  const result = await supabase
    .from("quest_missions")
    .update({ active })
    .eq("id", missionId);
  if (result.error) throw result.error;
}

export async function deleteQuestMission(missionId: string) {
  const supabase = createClient();
  const result = await supabase
    .from("quest_missions")
    .delete()
    .eq("id", missionId);
  if (result.error) throw result.error;
}

export async function reorderQuestChapters(
  labId: string,
  orderedIds: string[],
) {
  const supabase = createClient();
  const result = await supabase.rpc("reorder_quest_chapters", {
    target_lab_id: labId,
    ordered_ids: orderedIds,
  });
  if (result.error) throw result.error;
}

export async function reorderQuestMissions(
  chapterId: string,
  orderedIds: string[],
) {
  const supabase = createClient();
  const result = await supabase.rpc("reorder_quest_missions", {
    target_chapter_id: chapterId,
    ordered_ids: orderedIds,
  });
  if (result.error) throw result.error;
}

export async function importQuestBundle(labId: string, bundle: QuestBundle) {
  const supabase = createClient();
  const current = await loadQuestContent(labId);
  const requestedPaperIds = [
    ...new Set(
      bundle.chapters.flatMap((chapter) =>
        chapter.missions
          .filter((mission) => mission.mission_type === "paper")
          .map((mission) => mission.content.paperId)
          .filter(
            (paperId): paperId is string =>
              typeof paperId === "string" &&
              /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
                paperId,
              ),
          ),
      ),
    ),
  ];
  const validPaperIds = new Set<string>();
  if (requestedPaperIds.length > 0) {
    const paperResult = await supabase
      .from("lab_papers")
      .select("id")
      .eq("lab_id", labId)
      .in("id", requestedPaperIds);
    if (paperResult.error) throw paperResult.error;
    for (const paper of paperResult.data ?? []) validPaperIds.add(paper.id);
  }
  let chapterIndex = Math.max(
    0,
    ...current.chapters.map((chapter) => chapter.order_index),
  );
  const createdChapterIds: string[] = [];
  try {
    for (const chapter of bundle.chapters) {
      chapterIndex += 1;
      const chapterResult = await supabase
        .from("quest_chapters")
        .insert({
          lab_id: labId,
          order_index: chapterIndex,
          title_i18n: chapter.title_i18n,
          description_i18n: chapter.description_i18n,
          active: chapter.active,
        })
        .select("id")
        .single();
      if (chapterResult.error) throw chapterResult.error;
      const chapterId = String(chapterResult.data.id);
      createdChapterIds.push(chapterId);
      if (chapter.missions.length > 0) {
        const missionResult = await supabase.from("quest_missions").insert(
          chapter.missions.map((mission, index) => {
            const paperId = resolveImportedPaperId(
              mission.mission_type,
              mission.content,
              validPaperIds,
            );
            return {
              chapter_id: chapterId,
              order_index: index + 1,
              mission_type: mission.mission_type,
              paper_id: paperId,
              title_i18n: mission.title_i18n,
              instructions_i18n: mission.instructions_i18n,
              content:
                mission.mission_type === "paper" && !paperId
                  ? { ...mission.content, paperId: "" }
                  : mission.content,
              validation: mission.validation,
              active: mission.active,
            };
          }),
        );
        if (missionResult.error) throw missionResult.error;
      }
    }
  } catch (error) {
    if (createdChapterIds.length > 0) {
      await supabase.from("quest_chapters").delete().in("id", createdChapterIds);
    }
    throw error;
  }
}
