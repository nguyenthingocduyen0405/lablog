import { createClient } from "./supabase/client";
import {
  loadQuestContent,
  type QuestChapter,
  type QuestMission,
} from "./quest-admin";

export type OsLabQuestCatalog = {
  chapters: QuestChapter[];
  missions: QuestMission[];
  missionByKey: Map<string, QuestMission>;
  completedKeys: Set<string>;
};

const osGameKey = (mission: QuestMission) =>
  mission.content.renderer === "os-lab" &&
  typeof mission.content.gameKey === "string"
    ? mission.content.gameKey
    : "";

export function osMissionKey(chapter: number, mission: number) {
  return "os-c" + chapter + "-m" + mission;
}

export async function loadOsLabQuestCatalog(
  labId: string,
  userId: string,
): Promise<OsLabQuestCatalog> {
  const content = await loadQuestContent(labId);
  const missions = content.missions.filter((mission) => osGameKey(mission));
  const missionByKey = new Map(
    missions.map((mission) => [osGameKey(mission), mission]),
  );
  if (missions.length === 0) {
    return {
      chapters: content.chapters,
      missions,
      missionByKey,
      completedKeys: new Set(),
    };
  }

  const supabase = createClient();
  const progress = await supabase
    .from("quest_mission_progress")
    .select("mission_id")
    .eq("user_id", userId)
    .in(
      "mission_id",
      missions.map((mission) => mission.id),
    );
  if (progress.error) throw progress.error;
  const completedIds = new Set(
    (progress.data ?? []).map((item) => String(item.mission_id)),
  );
  return {
    chapters: content.chapters,
    missions,
    missionByKey,
    completedKeys: new Set(
      missions
        .filter((mission) => completedIds.has(mission.id))
        .map((mission) => osGameKey(mission)),
    ),
  };
}

export async function completeOsLabMission(
  userId: string,
  mission: QuestMission | undefined,
) {
  if (!mission) return;
  const supabase = createClient();
  const result = await supabase.from("quest_mission_progress").upsert(
    {
      mission_id: mission.id,
      user_id: userId,
      completed_at: new Date().toISOString(),
    },
    { onConflict: "mission_id,user_id", ignoreDuplicates: true },
  );
  if (result.error) throw result.error;
}

export async function syncLegacyOsLabProgress(
  userId: string,
  catalog: OsLabQuestCatalog,
  completedByChapter: Record<number, number[]>,
) {
  const missions = Object.entries(completedByChapter).flatMap(
    ([chapter, completed]) =>
      completed
        .map((mission) =>
          catalog.missionByKey.get(osMissionKey(Number(chapter), mission)),
        )
        .filter((mission): mission is QuestMission => Boolean(mission)),
  );
  await Promise.all(
    missions.map((mission) => completeOsLabMission(userId, mission)),
  );
}

export function completedMissionNumbers(
  catalog: OsLabQuestCatalog,
  chapter: number,
) {
  return [1, 2, 3, 4].filter((mission) =>
    catalog.completedKeys.has(osMissionKey(chapter, mission)),
  );
}
