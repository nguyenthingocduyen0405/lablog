"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import AppHeader from "../components/app-header";
import CharacterAvatar from "../components/character-avatar";
import JitsiRoom from "../components/jitsi-room";
import { getCurrentUser, type AuthUser } from "../lib/auth";
import { useI18n, type Locale } from "../lib/i18n";
import {
  completeTeamProject,
  createTeamProject,
  createTeamProjectTask,
  deleteTeamProjectTask,
  endProjectMeeting,
  loadLabMembers,
  loadOnlineMeetings,
  loadProjectMeetingHistory,
  loadTeamProjectInvites,
  loadTeamProjectMembers,
  loadTeamProjects,
  loadTeamProjectTasks,
  respondToTeamProjectInvite,
  renameTeamProject,
  saveProjectMeetingNotes,
  setTeamProjectTaskCompleted,
  startProjectMeeting,
  type LabMember,
  type OnlineMeeting,
  type TeamProject,
  type TeamProjectInvite,
  type TeamProjectMember,
  type TeamProjectTask,
} from "../lib/lab-social";

function localDateKey(date = new Date()) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function defaultDeadline() {
  const date = new Date();
  date.setDate(date.getDate() + 30);
  return localDateKey(date);
}

function formatDate(value: string, locale: Locale, fallback: string) {
  if (!value) return fallback;
  return new Intl.DateTimeFormat(
    locale === "vi" ? "vi-VN" : locale === "en" ? "en-US" : "ko-KR",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
    },
  ).format(new Date(`${value}T00:00:00`));
}

function formatDateTime(value: string | null, locale: Locale) {
  if (!value) return "";
  return new Intl.DateTimeFormat(
    locale === "vi" ? "vi-VN" : locale === "en" ? "en-US" : "ko-KR",
    {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
  ).format(new Date(value));
}

export default function MeetingPage() {
  const router = useRouter();
  const { locale, l } = useI18n();
  const unknownDate = l("미정", "Chưa xác định", "TBD");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [members, setMembers] = useState<LabMember[]>([]);
  const [projects, setProjects] = useState<TeamProject[]>([]);
  const [projectMembers, setProjectMembers] = useState<TeamProjectMember[]>([]);
  const [tasks, setTasks] = useState<TeamProjectTask[]>([]);
  const [invites, setInvites] = useState<TeamProjectInvite[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [liveMeeting, setLiveMeeting] = useState<OnlineMeeting | null>(null);
  const [activeMeeting, setActiveMeeting] = useState<OnlineMeeting | null>(
    null,
  );
  const [meetingHistory, setMeetingHistory] = useState<OnlineMeeting[]>([]);
  const [notesDraft, setNotesDraft] = useState("");
  const [notesStatus, setNotesStatus] = useState<"saved" | "saving" | "error">(
    "saved",
  );
  const notesDirtyRef = useRef(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [isRenamingProject, setIsRenamingProject] = useState(false);
  const [projectNameDraft, setProjectNameDraft] = useState("");
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    getCurrentUser()
      .then(async (currentUser) => {
        if (!currentUser) {
          router.replace("/login");
          return;
        }
        if (!currentUser.chapterTwoCompletedAt) {
          router.replace("/labquest?chapter=2&locked=project");
          return;
        }
        if (!currentUser.chapterThreeCompletedAt) {
          router.replace("/labquest?chapter=3");
          return;
        }
        const [loadedProjects, loadedInvites, loadedMembers] =
          await Promise.all([
            loadTeamProjects(currentUser.id),
            loadTeamProjectInvites(currentUser.id),
            loadLabMembers(),
          ]);
        if (cancelled) return;
        setUser(currentUser);
        setProjects(loadedProjects);
        setInvites(loadedInvites);
        setMembers(loadedMembers);
        setSelectedProjectId(loadedProjects[0]?.id ?? "");
        setProjectMembers(
          await loadTeamProjectMembers(
            loadedProjects.map((project) => project.id),
          ),
        );
      })
      .catch(() =>
        setMessage(
          l(
            "Project를 불러오지 못했어요. 최신 Supabase migration을 확인해 주세요.",
            "Không thể tải Project. Hãy kiểm tra migration Supabase mới nhất.",
            "Could not load Projects. Check the latest Supabase migration.",
          ),
        ),
      );
    return () => {
      cancelled = true;
    };
  }, [l, router]);

  useEffect(() => {
    if (!selectedProjectId) return;
    let cancelled = false;
    Promise.all([
      loadTeamProjectTasks(selectedProjectId),
      loadProjectMeetingHistory(selectedProjectId),
    ])
      .then(([loadedTasks, loadedHistory]) => {
        if (!cancelled) {
          setTasks(loadedTasks);
          setMeetingHistory(loadedHistory);
        }
      })
      .catch(() => {
        if (!cancelled)
          setMessage(
            l(
              "업무 또는 회의 기록을 불러오지 못했어요.",
              "Không thể tải công việc hoặc lịch sử cuộc họp.",
              "Could not load tasks or meeting history.",
            ),
          );
      });
    return () => {
      cancelled = true;
    };
  }, [l, selectedProjectId]);

  const selectedProject =
    projects.find((project) => project.id === selectedProjectId) ?? null;
  const selectedMembers = projectMembers.filter(
    (member) => member.projectId === selectedProjectId,
  );
  const acceptedMembers = selectedMembers.filter(
    (member) => member.status === "accepted",
  );
  const isHost = Boolean(user && selectedProject?.ownerId === user.id);
  const completedCount = tasks.filter((task) => task.completed).length;
  const progress = tasks.length
    ? Math.round((completedCount / tasks.length) * 100)
    : 0;
  const allTasksComplete = tasks.length > 0 && completedCount === tasks.length;

  const memberById = new Map(
    selectedMembers.map((item) => [item.userId, item.member]),
  );

  useEffect(() => {
    if (!selectedProjectId || selectedProject?.status === "completed") return;
    let cancelled = false;
    const sync = () =>
      loadOnlineMeetings(selectedProjectId).then((items) => {
        if (!cancelled) setLiveMeeting(items[0] ?? null);
      });
    sync().catch(() => undefined);
    const interval = window.setInterval(
      () => sync().catch(() => undefined),
      15_000,
    );
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [selectedProjectId, selectedProject?.status]);

  const displayedLiveMeeting =
    liveMeeting?.projectId === selectedProjectId &&
    selectedProject?.status === "active"
      ? liveMeeting
      : null;
  const activeMeetingId = activeMeeting?.id;

  useEffect(() => {
    if (!activeMeetingId || !notesDirtyRef.current) return;
    const timer = window.setTimeout(() => {
      saveProjectMeetingNotes(activeMeetingId, notesDraft)
        .then((updated) => {
          notesDirtyRef.current = false;
          setNotesStatus("saved");
          setActiveMeeting((current) =>
            current?.id === updated.id ? updated : current,
          );
          setLiveMeeting((current) =>
            current?.id === updated.id ? updated : current,
          );
        })
        .catch(() => setNotesStatus("error"));
    }, 900);
    return () => window.clearTimeout(timer);
  }, [activeMeetingId, notesDraft]);

  function openMeetingRoom(meeting: OnlineMeeting) {
    notesDirtyRef.current = false;
    setNotesDraft(meeting.notes);
    setNotesStatus("saved");
    setActiveMeeting(meeting);
  }

  function changeMeetingNotes(notes: string) {
    notesDirtyRef.current = true;
    setNotesStatus("saving");
    setNotesDraft(notes);
  }

  async function savePendingMeetingNotes(meeting: OnlineMeeting) {
    if (!notesDirtyRef.current) return meeting;
    const updated = await saveProjectMeetingNotes(meeting.id, notesDraft);
    notesDirtyRef.current = false;
    setNotesStatus("saved");
    return updated;
  }

  async function closeMeetingRoom() {
    if (!activeMeeting) return;
    try {
      await savePendingMeetingNotes(activeMeeting);
      setActiveMeeting(null);
    } catch {
      setNotesStatus("error");
      setMessage(
        l(
          "회의 내용 저장에 실패해 방을 닫지 않았어요.",
          "Không thể lưu ghi chú nên phòng họp vẫn được giữ mở.",
          "Meeting notes could not be saved, so the room remains open.",
        ),
      );
    }
  }

  async function refreshProjects(
    currentUser: AuthUser,
    preferredProjectId?: string,
  ) {
    const [loadedProjects, loadedInvites] = await Promise.all([
      loadTeamProjects(currentUser.id),
      loadTeamProjectInvites(currentUser.id),
    ]);
    setProjects(loadedProjects);
    setInvites(loadedInvites);
    setProjectMembers(
      await loadTeamProjectMembers(loadedProjects.map((project) => project.id)),
    );
    setSelectedProjectId(
      preferredProjectId &&
        loadedProjects.some((project) => project.id === preferredProjectId)
        ? preferredProjectId
        : (loadedProjects[0]?.id ?? ""),
    );
  }

  async function submitProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || isSaving) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    setIsSaving(true);
    setMessage("");
    try {
      const created = await createTeamProject(
        String(data.get("name")).trim(),
        String(data.get("description")).trim(),
        String(data.get("deadline")),
        Number(data.get("rewardPoints")),
        selectedFriendIds,
      );
      await refreshProjects(user, created.id);
      setShowCreate(false);
      setSelectedFriendIds([]);
      form.reset();
      setMessage(
        l(
          "Project를 만들고 멤버에게 초대를 보냈어요.",
          "Đã tạo Project và gửi lời mời cho thành viên.",
          "Project created and invitations sent.",
        ),
      );
    } catch {
      setMessage(
        l(
          "프로젝트를 만들지 못했어요. 입력값과 migration을 확인해 주세요.",
          "Không thể tạo project. Hãy kiểm tra dữ liệu nhập và migration.",
          "Could not create the project. Check the input and migration.",
        ),
      );
    } finally {
      setIsSaving(false);
    }
  }

  function beginProjectRename() {
    if (!selectedProject || !isHost) return;
    setProjectNameDraft(selectedProject.name);
    setIsRenamingProject(true);
  }

  async function submitProjectRename(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedProject || !isHost || isSaving) return;
    const nextName = projectNameDraft.trim();
    if (!nextName || nextName === selectedProject.name) {
      setIsRenamingProject(false);
      return;
    }
    setIsSaving(true);
    setMessage("");
    try {
      const renamed = await renameTeamProject(selectedProject.id, nextName);
      setProjects((current) =>
        current.map((project) =>
          project.id === renamed.id ? renamed : project,
        ),
      );
      setIsRenamingProject(false);
      setMessage(
        l(
          "프로젝트 이름을 변경했어요.",
          "Đã đổi tên project.",
          "Project name changed.",
        ),
      );
    } catch {
      setMessage(
        l(
          "프로젝트 이름을 변경하지 못했어요.",
          "Không thể đổi tên project.",
          "Could not rename the project.",
        ),
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function submitTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedProject || !isHost || isSaving) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    setIsSaving(true);
    setMessage("");
    try {
      const created = await createTeamProjectTask({
        projectId: selectedProject.id,
        title: String(data.get("title")).trim(),
        description: String(data.get("description")).trim(),
        assigneeId: String(data.get("assigneeId")),
        dueOn: String(data.get("dueOn")),
      });
      setTasks((current) =>
        [...current, created].sort((a, b) => a.dueOn.localeCompare(b.dueOn)),
      );
      setShowTaskForm(false);
      form.reset();
      setMessage(
        l(
          "새 업무를 배정했어요.",
          "Đã giao công việc mới.",
          "New task assigned.",
        ),
      );
    } catch {
      setMessage(
        l(
          "업무를 추가하지 못했어요. 담당자와 deadline을 확인해 주세요.",
          "Không thể thêm công việc. Hãy kiểm tra người phụ trách và deadline.",
          "Could not add the task. Check the assignee and deadline.",
        ),
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function toggleTask(task: TeamProjectTask) {
    if (!user || isSaving || (task.assigneeId !== user.id && !isHost)) return;
    setIsSaving(true);
    try {
      const updated = await setTeamProjectTaskCompleted(
        task.id,
        !task.completed,
      );
      setTasks((current) =>
        current.map((item) => (item.id === task.id ? updated : item)),
      );
    } catch {
      setMessage(
        l(
          "업무 상태를 변경하지 못했어요.",
          "Không thể đổi trạng thái công việc.",
          "Could not change the task status.",
        ),
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function removeTask(taskId: string) {
    if (!isHost || isSaving) return;
    setIsSaving(true);
    try {
      await deleteTeamProjectTask(taskId);
      setTasks((current) => current.filter((item) => item.id !== taskId));
    } catch {
      setMessage(
        l(
          "업무를 삭제하지 못했어요.",
          "Không thể xóa công việc.",
          "Could not delete the task.",
        ),
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function finishProject() {
    if (!user || !selectedProject || !isHost || !allTasksComplete || isSaving)
      return;
    setIsSaving(true);
    setMessage("");
    try {
      const completed = await completeTeamProject(selectedProject.id);
      setProjects((current) =>
        current.map((project) =>
          project.id === completed.id ? completed : project,
        ),
      );
      setMessage(
        l(
          `프로젝트 완료! 참여한 모든 팀원에게 ${completed.rewardPoints}P를 지급했어요.`,
          `Project hoàn thành! Mỗi thành viên tham gia nhận ${completed.rewardPoints}P.`,
          `Project complete! Every participating member received ${completed.rewardPoints}P.`,
        ),
      );
    } catch {
      setMessage(
        l(
          "모든 업무가 완료되었는지 확인해 주세요.",
          "Hãy kiểm tra xem mọi công việc đã hoàn thành chưa.",
          "Check that every task is complete.",
        ),
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function respond(
    invite: TeamProjectInvite,
    response: "accepted" | "declined",
  ) {
    if (!user || isSaving) return;
    setIsSaving(true);
    try {
      await respondToTeamProjectInvite(invite.project.id, response, user.id);
      await refreshProjects(
        user,
        response === "accepted" ? invite.project.id : undefined,
      );
    } catch {
      setMessage(
        l(
          "초대에 응답하지 못했어요.",
          "Không thể phản hồi lời mời.",
          "Could not respond to the invitation.",
        ),
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function startMeeting() {
    if (!selectedProject || !isHost || isSaving) return;
    setIsSaving(true);
    try {
      const meeting = await startProjectMeeting(
        selectedProject.id,
        l(
          `${selectedProject.name} 팀 미팅`,
          `Họp nhóm ${selectedProject.name}`,
          `${selectedProject.name} team meeting`,
        ),
      );
      setLiveMeeting(meeting);
      openMeetingRoom(meeting);
    } catch {
      setMessage(
        l(
          "회의를 시작하지 못했어요.",
          "Không thể bắt đầu cuộc họp.",
          "Could not start the meeting.",
        ),
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function endMeeting() {
    if (!activeMeeting || !isHost) {
      setActiveMeeting(null);
      return;
    }
    setIsSaving(true);
    try {
      await savePendingMeetingNotes(activeMeeting);
      await endProjectMeeting(activeMeeting.id, activeMeeting.projectId);
      setActiveMeeting(null);
      setLiveMeeting(null);
      setMeetingHistory(
        await loadProjectMeetingHistory(activeMeeting.projectId),
      );
      setMessage(
        l(
          "회의가 종료되고 내용 정리가 팀 기록에 보관됐어요.",
          "Cuộc họp đã kết thúc và ghi chú được lưu vào hồ sơ nhóm.",
          "The meeting ended and its notes were saved to the team record.",
        ),
      );
    } catch {
      setMessage(
        l(
          "회의를 종료하지 못했어요.",
          "Không thể kết thúc cuộc họp.",
          "Could not end the meeting.",
        ),
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (!user)
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f5f3ee]">
        <p className="text-sm font-black text-stone-400">
          {l(
            "PROJECT 불러오는 중...",
            "ĐANG TẢI PROJECT...",
            "LOADING PROJECT...",
          )}
        </p>
      </main>
    );

  return (
    <main className="min-h-screen bg-[#f5f3ee] pb-24 text-stone-950 md:pb-0">
      <AppHeader user={user} />
      <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-14">
        <header className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[.22em] text-emerald-600">
              {l("팀 협업", "CỘNG TÁC NHÓM", "TEAM COLLABORATION")}
            </p>
            <h1 className="mt-3 text-4xl font-black tracking-[-.055em] sm:text-6xl">
              Project
            </h1>
            <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-stone-500">
              {l(
                "업무를 나누고 deadline을 지키며, 프로젝트를 끝내면 팀 전체가 함께 포인트를 받아요.",
                "Phân chia công việc, tuân thủ deadline và cả nhóm cùng nhận điểm khi hoàn thành project.",
                "Divide the work, meet deadlines, and earn points together when the project is complete.",
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setSelectedFriendIds([]);
              setShowCreate(true);
            }}
            className="w-fit rounded-full bg-stone-950 px-5 py-3.5 text-sm font-black text-white shadow-[0_6px_0_#2d9a73]"
          >
            {l("+ Project 만들기", "+ Tạo Project", "+ Create Project")}
          </button>
        </header>
        {message && (
          <p
            role="status"
            className="mt-5 rounded-2xl bg-[#fff4bd] px-4 py-3 text-sm font-bold text-stone-700"
          >
            {message}
          </p>
        )}

        {invites.length > 0 && (
          <section className="mt-7 rounded-[1.75rem] bg-[#ffd84d] p-5">
            <p className="text-[10px] font-black uppercase tracking-[.18em] text-stone-600">
              {l("PROJECT 초대", "LỜI MỜI PROJECT", "PROJECT INVITES")} ·{" "}
              {invites.length}
            </p>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {invites.map((invite) => (
                <article
                  key={invite.project.id}
                  className="rounded-2xl bg-white/75 p-4 ring-1 ring-black/10"
                >
                  <p className="text-xs font-bold text-stone-500">
                    {l(
                      `${invite.hostName}님이 초대했어요`,
                      `${invite.hostName} đã mời bạn`,
                      `${invite.hostName} invited you`,
                    )}
                  </p>
                  <h2 className="mt-1 text-lg font-black">
                    {invite.project.name}
                  </h2>
                  <p className="mt-2 text-xs font-semibold text-stone-500">
                    {l("마감", "Deadline", "Due")}{" "}
                    {formatDate(invite.project.deadline, locale, unknownDate)} ·{" "}
                    {l("완료 보상", "Thưởng hoàn thành", "Completion reward")}{" "}
                    {invite.project.rewardPoints}P
                  </p>
                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => respond(invite, "accepted")}
                      className="rounded-full bg-stone-950 px-4 py-2 text-xs font-black text-white"
                    >
                      {l("참여하기", "Tham gia", "Join")}
                    </button>
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => respond(invite, "declined")}
                      className="rounded-full bg-white px-4 py-2 text-xs font-black text-stone-500"
                    >
                      {l("거절", "Từ chối", "Decline")}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        <div className="mt-8 grid gap-5 lg:grid-cols-[18rem_1fr]">
          <aside className="h-fit rounded-[1.75rem] bg-white p-4 shadow-sm ring-1 ring-black/[0.05]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[.18em] text-violet-500">
                  {l("내 PROJECT", "PROJECT CỦA TÔI", "MY PROJECTS")}
                </p>
                <h2 className="mt-1 text-xl font-black">
                  {l("프로젝트", "Project", "Projects")}
                </h2>
              </div>
              <span className="rounded-full bg-violet-100 px-3 py-1.5 text-xs font-black text-violet-700">
                {projects.length}
              </span>
            </div>
            <div className="mt-4 space-y-2">
              {projects.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-stone-200 px-4 py-10 text-center text-xs font-bold text-stone-400">
                  {l(
                    "아직 Project가 없어요.",
                    "Chưa có Project nào.",
                    "There are no Projects yet.",
                  )}
                </p>
              ) : (
                projects.map((project) => (
                  <button
                    key={project.id}
                    type="button"
                    onClick={() => {
                      setSelectedProjectId(project.id);
                      setIsRenamingProject(false);
                    }}
                    className={`w-full rounded-2xl p-4 text-left transition ${selectedProjectId === project.id ? "bg-stone-950 text-white" : "bg-[#f8f6f1] hover:bg-stone-100"}`}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-sm font-black">{project.name}</span>
                      <span
                        className={`text-[9px] font-black ${project.status === "completed" ? "text-emerald-400" : "text-[#ffd84d]"}`}
                      >
                        {project.status === "completed"
                          ? "DONE"
                          : `${project.rewardPoints}P`}
                      </span>
                    </span>
                    <span
                      className={`mt-2 block text-[11px] font-semibold ${selectedProjectId === project.id ? "text-white/45" : "text-stone-400"}`}
                    >
                      {l("마감", "Deadline", "Due")}{" "}
                      {formatDate(project.deadline, locale, unknownDate)}
                    </span>
                  </button>
                ))
              )}
            </div>
          </aside>

          <section>
            {selectedProject ? (
              <div className="space-y-5">
                <div className="overflow-hidden rounded-[2rem] bg-[#201d18] text-white shadow-[0_22px_70px_rgba(38,32,22,.16)]">
                  <div className="p-5 sm:p-7">
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-black uppercase tracking-[.18em] text-emerald-300">
                          {selectedProject.status === "completed"
                            ? l(
                                "완료된 PROJECT",
                                "PROJECT ĐÃ HOÀN THÀNH",
                                "COMPLETED PROJECT",
                              )
                            : isHost
                              ? l(
                                  "HOST PROJECT",
                                  "PROJECT CHỦ TRÌ",
                                  "HOST PROJECT",
                                )
                              : l(
                                  "MEMBER PROJECT",
                                  "PROJECT THÀNH VIÊN",
                                  "MEMBER PROJECT",
                                )}
                        </p>
                        {isRenamingProject ? (
                          <form
                            onSubmit={submitProjectRename}
                            className="mt-2 flex max-w-xl items-center gap-2"
                          >
                            <input
                              autoFocus
                              value={projectNameDraft}
                              onChange={(event) =>
                                setProjectNameDraft(event.target.value)
                              }
                              onKeyDown={(event) => {
                                if (event.key === "Escape")
                                  setIsRenamingProject(false);
                              }}
                              required
                              maxLength={100}
                              aria-label={l(
                                "새 프로젝트 이름",
                                "Tên project mới",
                                "New project name",
                              )}
                              className="min-w-0 flex-1 rounded-xl bg-white/10 px-3 py-2 text-2xl font-black text-white outline-none ring-2 ring-[#ffd84d] placeholder:text-white/25"
                            />
                            <button
                              type="submit"
                              disabled={isSaving}
                              className="rounded-full bg-emerald-300 px-3 py-2 text-xs font-black text-emerald-950"
                            >
                              {l("저장", "Lưu", "Save")}
                            </button>
                            <button
                              type="button"
                              onClick={() => setIsRenamingProject(false)}
                              className="rounded-full bg-white/10 px-3 py-2 text-xs font-black text-white/60"
                            >
                              {l("취소", "Hủy", "Cancel")}
                            </button>
                          </form>
                        ) : (
                          <div className="mt-2 flex items-center gap-2">
                            <h2 className="min-w-0 truncate text-3xl font-black tracking-[-.04em]">
                              {selectedProject.name}
                            </h2>
                            {isHost && (
                              <button
                                type="button"
                                onClick={beginProjectRename}
                                aria-label={l(
                                  "프로젝트 이름 변경",
                                  "Đổi tên project",
                                  "Rename project",
                                )}
                                title={l(
                                  "프로젝트 이름 변경",
                                  "Đổi tên project",
                                  "Rename project",
                                )}
                                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-lg text-[#ffd84d] transition hover:bg-white/20"
                              >
                                ✎
                              </button>
                            )}
                          </div>
                        )}
                        <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-white/45">
                          {selectedProject.description ||
                            l(
                              "팀원들과 목표를 공유하고 함께 진행해요.",
                              "Chia sẻ mục tiêu và cùng tiến hành với các thành viên.",
                              "Share goals and work together with your team.",
                            )}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <span className="rounded-full bg-white/10 px-3 py-2 text-xs font-black text-[#ffd84d]">
                          🏆 {selectedProject.rewardPoints}P /{" "}
                          {l("인", "người", "person")}
                        </span>
                        <span
                          className={`rounded-full px-3 py-2 text-xs font-black ${selectedProject.status === "completed" ? "bg-emerald-300 text-emerald-950" : "bg-white/10 text-white/55"}`}
                        >
                          {selectedProject.status === "completed"
                            ? l("✓ 완료", "✓ Hoàn thành", "✓ Completed")
                            : l(
                                `마감 ${formatDate(selectedProject.deadline, locale, unknownDate)}`,
                                `Deadline ${formatDate(selectedProject.deadline, locale, unknownDate)}`,
                                `Due ${formatDate(selectedProject.deadline, locale, unknownDate)}`,
                              )}
                        </span>
                      </div>
                    </div>
                    <div className="mt-7 grid gap-3 sm:grid-cols-3">
                      <div className="rounded-2xl bg-white/[0.07] p-4">
                        <p className="text-[10px] font-black text-white/35">
                          {l("진행률", "TIẾN ĐỘ", "PROGRESS")}
                        </p>
                        <p className="mt-2 text-2xl font-black">{progress}%</p>
                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                          <div
                            className="h-full rounded-full bg-emerald-300 transition-all"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                      <div className="rounded-2xl bg-white/[0.07] p-4">
                        <p className="text-[10px] font-black text-white/35">
                          {l("업무", "CÔNG VIỆC", "TASKS")}
                        </p>
                        <p className="mt-2 text-2xl font-black">
                          {completedCount}
                          <span className="text-sm text-white/30">
                            {" "}
                            / {tasks.length}
                          </span>
                        </p>
                        <p className="mt-3 text-xs font-bold text-white/35">
                          {l(
                            "완료한 업무",
                            "Công việc đã xong",
                            "Completed tasks",
                          )}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-white/[0.07] p-4">
                        <p className="text-[10px] font-black text-white/35">
                          {l("팀", "NHÓM", "TEAM")}
                        </p>
                        <p className="mt-2 text-2xl font-black">
                          {acceptedMembers.length}
                          {l("명", " người", " members")}
                        </p>
                        <div className="mt-3 flex -space-x-2">
                          {acceptedMembers.slice(0, 6).map((item) => (
                            <CharacterAvatar
                              key={item.userId}
                              config={item.member.avatarConfig}
                              background={item.member.avatarBackground}
                              name={item.member.name}
                              size={28}
                              className="ring-2 ring-[#201d18]"
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-[1.75rem] bg-white p-5 shadow-sm ring-1 ring-black/[0.05] sm:p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[.18em] text-violet-500">
                        {l("업무 보드", "BẢNG CÔNG VIỆC", "TASK BOARD")}
                      </p>
                      <h3 className="mt-1 text-2xl font-black">
                        {l(
                          "업무 분담",
                          "Phân công công việc",
                          "Task assignments",
                        )}
                      </h3>
                    </div>
                    {isHost && selectedProject.status === "active" && (
                      <button
                        type="button"
                        onClick={() => setShowTaskForm((value) => !value)}
                        className="w-fit rounded-full bg-violet-100 px-4 py-2.5 text-xs font-black text-violet-700"
                      >
                        {showTaskForm
                          ? l("닫기", "Đóng", "Close")
                          : l("+ 업무 배정", "+ Giao việc", "+ Assign task")}
                      </button>
                    )}
                  </div>
                  {showTaskForm && (
                    <form
                      onSubmit={submitTask}
                      className="mt-5 grid gap-3 rounded-2xl bg-violet-50 p-4 sm:grid-cols-2"
                    >
                      <label className="sm:col-span-2">
                        <span className="text-[11px] font-black text-stone-500">
                          {l("업무 이름", "Tên công việc", "Task name")}
                        </span>
                        <input
                          name="title"
                          required
                          maxLength={120}
                          placeholder={l(
                            "예: 발표 자료 초안 작성",
                            "VD: Soạn bản nháp slide thuyết trình",
                            "Example: Draft presentation slides",
                          )}
                          className="mt-1.5 w-full rounded-xl bg-white px-3.5 py-3 text-sm font-bold outline-none ring-1 ring-black/10 focus:ring-2 focus:ring-violet-400"
                        />
                      </label>
                      <label>
                        <span className="text-[11px] font-black text-stone-500">
                          {l("담당자", "Người phụ trách", "Assignee")}
                        </span>
                        <select
                          name="assigneeId"
                          required
                          className="mt-1.5 w-full rounded-xl bg-white px-3.5 py-3 text-sm font-bold outline-none ring-1 ring-black/10"
                        >
                          {acceptedMembers.map((item) => (
                            <option key={item.userId} value={item.userId}>
                              {item.member.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        <span className="text-[11px] font-black text-stone-500">
                          {l(
                            "업무 deadline",
                            "Deadline công việc",
                            "Task deadline",
                          )}
                        </span>
                        <input
                          type="date"
                          name="dueOn"
                          required
                          min={localDateKey()}
                          max={selectedProject.deadline}
                          defaultValue={selectedProject.deadline}
                          className="mt-1.5 w-full rounded-xl bg-white px-3.5 py-3 text-sm font-bold outline-none ring-1 ring-black/10"
                        />
                      </label>
                      <label className="sm:col-span-2">
                        <span className="text-[11px] font-black text-stone-500">
                          {l(
                            "설명 (선택)",
                            "Mô tả (tùy chọn)",
                            "Description (optional)",
                          )}
                        </span>
                        <textarea
                          name="description"
                          maxLength={500}
                          className="mt-1.5 min-h-20 w-full resize-none rounded-xl bg-white px-3.5 py-3 text-sm font-semibold outline-none ring-1 ring-black/10"
                        />
                      </label>
                      <button
                        disabled={isSaving || acceptedMembers.length === 0}
                        className="rounded-full bg-stone-950 px-4 py-3 text-xs font-black text-white sm:col-span-2 disabled:opacity-40"
                      >
                        {l("업무 배정하기", "Giao công việc", "Assign task")}
                      </button>
                    </form>
                  )}
                  <div className="mt-5 space-y-3">
                    {tasks.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-stone-200 px-5 py-10 text-center">
                        <p className="text-3xl">📋</p>
                        <p className="mt-3 text-sm font-black text-stone-500">
                          {l(
                            "아직 배정된 업무가 없어요.",
                            "Chưa có công việc nào được giao.",
                            "No tasks have been assigned yet.",
                          )}
                        </p>
                        <p className="mt-1 text-xs font-semibold text-stone-400">
                          {l(
                            "Host가 첫 업무를 만들면 진행률이 시작돼요.",
                            "Tiến độ sẽ bắt đầu khi Host tạo công việc đầu tiên.",
                            "Progress starts when the host creates the first task.",
                          )}
                        </p>
                      </div>
                    ) : (
                      tasks.map((task) => {
                        const assignee = memberById.get(task.assigneeId);
                        const canToggle =
                          selectedProject.status === "active" &&
                          (task.assigneeId === user.id || isHost);
                        const overdue =
                          !task.completed && task.dueOn < localDateKey();
                        return (
                          <article
                            key={task.id}
                            className={`flex gap-3 rounded-2xl p-4 ring-1 ${task.completed ? "bg-emerald-50 ring-emerald-100" : "bg-[#faf9f6] ring-black/[0.05]"}`}
                          >
                            <button
                              type="button"
                              onClick={() => toggleTask(task)}
                              disabled={!canToggle || isSaving}
                              aria-label={
                                task.completed
                                  ? l(
                                      "업무 완료 취소",
                                      "Bỏ đánh dấu hoàn thành",
                                      "Mark task incomplete",
                                    )
                                  : l(
                                      "업무 완료 표시",
                                      "Đánh dấu hoàn thành",
                                      "Mark task complete",
                                    )
                              }
                              className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-black ring-2 ${task.completed ? "bg-emerald-500 text-white ring-emerald-500" : "bg-white text-transparent ring-stone-300"} disabled:cursor-not-allowed`}
                            >
                              ✓
                            </button>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-start justify-between gap-2">
                                <div>
                                  <h4
                                    className={`text-sm font-black ${task.completed ? "text-stone-400 line-through" : "text-stone-800"}`}
                                  >
                                    {task.title}
                                  </h4>
                                  {task.description && (
                                    <p className="mt-1 text-xs font-semibold leading-5 text-stone-400">
                                      {task.description}
                                    </p>
                                  )}
                                </div>
                                {isHost &&
                                  selectedProject.status === "active" && (
                                    <button
                                      type="button"
                                      onClick={() => removeTask(task.id)}
                                      className="text-[10px] font-black text-red-400"
                                    >
                                      {l("삭제", "Xóa", "Delete")}
                                    </button>
                                  )}
                              </div>
                              <div className="mt-3 flex flex-wrap items-center gap-2">
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-white py-1 pl-1 pr-2.5 text-[10px] font-black text-stone-600 ring-1 ring-black/[0.06]">
                                  {assignee && (
                                    <CharacterAvatar
                                      config={assignee.avatarConfig}
                                      background={assignee.avatarBackground}
                                      name={assignee.name}
                                      size={22}
                                    />
                                  )}
                                  {assignee?.name ?? "Member"}
                                </span>
                                <span
                                  className={`rounded-full px-2.5 py-1 text-[10px] font-black ${overdue ? "bg-red-100 text-red-600" : "bg-stone-100 text-stone-500"}`}
                                >
                                  {overdue
                                    ? l("⚠ 지연 · ", "⚠ Trễ · ", "⚠ Overdue · ")
                                    : ""}
                                  {formatDate(task.dueOn, locale, unknownDate)}
                                </span>
                              </div>
                            </div>
                          </article>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <div className="rounded-[1.75rem] bg-white p-5 shadow-sm ring-1 ring-black/[0.05]">
                    <p className="text-[10px] font-black uppercase tracking-[.18em] text-emerald-600">
                      {l("팀원", "THÀNH VIÊN NHÓM", "TEAM MEMBERS")}
                    </p>
                    <div className="mt-4 space-y-2">
                      {selectedMembers.map((item) => (
                        <div
                          key={item.userId}
                          className={`flex items-center gap-3 rounded-2xl bg-stone-50 p-3 ${item.status === "invited" ? "opacity-45" : ""}`}
                        >
                          <CharacterAvatar
                            config={item.member.avatarConfig}
                            background={item.member.avatarBackground}
                            name={item.member.name}
                            size={38}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-black">
                              {item.member.name}
                            </p>
                            <p className="text-[10px] font-bold text-stone-400">
                              {item.role === "host"
                                ? "HOST"
                                : item.status === "invited"
                                  ? l(
                                      "초대 대기",
                                      "Đang chờ chấp nhận",
                                      "Invitation pending",
                                    )
                                  : "MEMBER"}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-[1.75rem] bg-stone-950 p-5 text-white shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-[.18em] text-[#ffd84d]">
                      {l("실시간 회의", "CUỘC HỌP TRỰC TIẾP", "LIVE MEETING")}
                    </p>
                    {selectedProject.status === "completed" ? (
                      <div className="mt-5">
                        <p className="text-2xl">🎉</p>
                        <h3 className="mt-3 text-xl font-black">
                          {l(
                            "프로젝트가 완료됐어요.",
                            "Project đã hoàn thành.",
                            "The project is complete.",
                          )}
                        </h3>
                        <p className="mt-2 text-xs font-semibold leading-5 text-white/40">
                          {l(
                            `모든 팀원에게 ${selectedProject.rewardPoints}P가 지급되었습니다.`,
                            `Mỗi thành viên đã nhận ${selectedProject.rewardPoints}P.`,
                            `Every team member received ${selectedProject.rewardPoints}P.`,
                          )}
                        </p>
                      </div>
                    ) : displayedLiveMeeting ? (
                      <div className="mt-5">
                        <h3 className="text-xl font-black">
                          {displayedLiveMeeting.title}
                        </h3>
                        <p className="mt-2 text-xs font-semibold text-emerald-300">
                          {l(
                            "● 지금 회의 중",
                            "● Đang họp",
                            "● Meeting in progress",
                          )}
                        </p>
                        {displayedLiveMeeting.notes && (
                          <p className="mt-3 line-clamp-3 whitespace-pre-line rounded-xl bg-white/[0.06] p-3 text-xs font-semibold leading-5 text-white/45">
                            {displayedLiveMeeting.notes}
                          </p>
                        )}
                        <button
                          type="button"
                          onClick={() => openMeetingRoom(displayedLiveMeeting)}
                          className="mt-5 rounded-full bg-emerald-300 px-5 py-3 text-xs font-black text-emerald-950"
                        >
                          {l(
                            "회의 참여 · 내용 정리",
                            "Tham gia · Ghi chú",
                            "Join · Take notes",
                          )}
                        </button>
                      </div>
                    ) : (
                      <div className="mt-5">
                        <h3 className="text-xl font-black">
                          {l(
                            "진행 중인 회의가 없어요.",
                            "Không có cuộc họp đang diễn ra.",
                            "There is no active meeting.",
                          )}
                        </h3>
                        <p className="mt-2 text-xs font-semibold leading-5 text-white/40">
                          {l(
                            "업무를 맞추기 위해 필요할 때 바로 만나요.",
                            "Bắt đầu họp khi cần phối hợp công việc.",
                            "Meet whenever you need to coordinate the work.",
                          )}
                        </p>
                        {isHost && (
                          <button
                            type="button"
                            onClick={startMeeting}
                            disabled={isSaving}
                            className="mt-5 rounded-full bg-[#ffd84d] px-5 py-3 text-xs font-black text-stone-950"
                          >
                            {l(
                              "🎥 회의 시작",
                              "🎥 Bắt đầu họp",
                              "🎥 Start meeting",
                            )}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-[1.75rem] bg-white p-5 shadow-sm ring-1 ring-black/[0.05] sm:p-6">
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[.18em] text-sky-600">
                        {l(
                          "최종 회의록",
                          "BIÊN BẢN CUỐI",
                          "FINAL MEETING NOTES",
                        )}
                      </p>
                      <h3 className="mt-1 text-2xl font-black">
                        {l(
                          "최종 회의록",
                          "Biên bản cuối",
                          "Final meeting notes",
                        )}
                      </h3>
                      <p className="mt-2 text-xs font-semibold text-stone-400">
                        {l(
                          "가장 최근에 종료된 회의의 최종 저장본 한 개만 보여줘요.",
                          "Chỉ hiển thị bản lưu cuối của cuộc họp gần nhất.",
                          "Only the final saved copy of the most recently ended meeting is shown.",
                        )}
                      </p>
                    </div>
                    <span className="rounded-full bg-sky-50 px-3 py-1.5 text-xs font-black text-sky-700">
                      FINAL
                    </span>
                  </div>
                  <div className="mt-5">
                    {meetingHistory.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-stone-200 px-5 py-9 text-center">
                        <p className="text-3xl">📝</p>
                        <p className="mt-3 text-sm font-black text-stone-500">
                          {l(
                            "아직 저장된 최종 회의록이 없어요.",
                            "Chưa có biên bản cuối nào được lưu.",
                            "No final meeting notes have been saved yet.",
                          )}
                        </p>
                      </div>
                    ) : (
                      meetingHistory.map((meeting) => (
                        <details
                          key={meeting.id}
                          open
                          className="group rounded-2xl bg-[#faf9f6] ring-1 ring-black/[0.05]"
                        >
                          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4">
                            <div>
                              <h4 className="text-sm font-black text-stone-800">
                                {meeting.title}
                              </h4>
                              <p className="mt-1 text-[10px] font-bold text-stone-400">
                                {formatDateTime(meeting.startsAt, locale)} ·{" "}
                                {l("종료", "Kết thúc", "Ended")}{" "}
                                {formatDateTime(meeting.endedAt, locale)}
                              </p>
                            </div>
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-lg font-bold text-stone-400 ring-1 ring-black/[0.06] transition group-open:rotate-45">
                              +
                            </span>
                          </summary>
                          <div className="border-t border-black/[0.05] px-4 py-5">
                            <p className="whitespace-pre-wrap text-sm font-semibold leading-7 text-stone-600">
                              {meeting.notes ||
                                l(
                                  "작성된 회의 내용이 없어요.",
                                  "Không có nội dung cuộc họp.",
                                  "No meeting notes were written.",
                                )}
                            </p>
                            {meeting.notesUpdatedAt && (
                              <p className="mt-4 text-[10px] font-bold text-stone-300">
                                {l("마지막 저장", "Lưu lần cuối", "Last saved")}{" "}
                                {formatDateTime(meeting.notesUpdatedAt, locale)}
                              </p>
                            )}
                          </div>
                        </details>
                      ))
                    )}
                  </div>
                </div>

                {isHost && selectedProject.status === "active" && (
                  <div className="rounded-[1.75rem] border-2 border-dashed border-emerald-300 bg-emerald-50 p-5 sm:flex sm:items-center sm:justify-between">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[.18em] text-emerald-600">
                        {l(
                          "PROJECT 완료",
                          "HOÀN THÀNH PROJECT",
                          "PROJECT COMPLETION",
                        )}
                      </p>
                      <h3 className="mt-2 text-xl font-black">
                        {l(
                          "모든 업무가 끝났나요?",
                          "Mọi công việc đã hoàn thành?",
                          "Are all tasks finished?",
                        )}
                      </h3>
                      <p className="mt-1 text-xs font-semibold text-stone-500">
                        {l(
                          `완료를 확정하면 참여한 팀원 모두에게 ${selectedProject.rewardPoints}P가 한 번만 지급돼요.`,
                          `Khi xác nhận hoàn thành, mỗi thành viên tham gia sẽ nhận ${selectedProject.rewardPoints}P một lần.`,
                          `When completion is confirmed, every participating member receives ${selectedProject.rewardPoints}P once.`,
                        )}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={finishProject}
                      disabled={!allTasksComplete || isSaving}
                      className="mt-4 w-full rounded-full bg-emerald-500 px-5 py-3.5 text-sm font-black text-white shadow-[0_5px_0_#177c58] disabled:bg-stone-300 disabled:shadow-none sm:mt-0 sm:w-auto"
                    >
                      {allTasksComplete
                        ? l(
                            "프로젝트 완료 + 포인트 지급",
                            "Hoàn thành project + Trao điểm",
                            "Complete project + Award points",
                          )
                        : l(
                            `남은 업무 ${tasks.length - completedCount}개`,
                            `Còn ${tasks.length - completedCount} công việc`,
                            `${tasks.length - completedCount} task(s) remaining`,
                          )}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex min-h-96 flex-col items-center justify-center rounded-[2rem] bg-[#201d18] text-center text-white">
                <p className="text-5xl">🤝</p>
                <h2 className="mt-5 text-2xl font-black">
                  {l(
                    "Project를 만들어 보세요.",
                    "Hãy tạo một Project.",
                    "Create a Project.",
                  )}
                </h2>
                <p className="mt-2 text-sm font-semibold text-white/35">
                  {l(
                    "업무와 deadline을 공유하고 함께 보상을 받아요.",
                    "Chia sẻ công việc và deadline để cùng nhận thưởng.",
                    "Share tasks and deadlines, then earn rewards together.",
                  )}
                </p>
              </div>
            )}
          </section>
        </div>
      </div>

      {showCreate && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="new-project-title"
          onClick={() => setShowCreate(false)}
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-5 backdrop-blur-sm"
        >
          <section
            onClick={(event) => event.stopPropagation()}
            className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-[2rem] bg-[#f5f3ee] p-6 shadow-2xl sm:p-8"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[.2em] text-emerald-600">
                  {l("새 PROJECT", "PROJECT MỚI", "NEW PROJECT")}
                </p>
                <h2 id="new-project-title" className="mt-2 text-3xl font-black">
                  {l("Project 만들기", "Tạo Project", "Create Project")}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                aria-label={l("닫기", "Đóng", "Close")}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-200 text-2xl"
              >
                ×
              </button>
            </div>
            <form onSubmit={submitProject} className="mt-7 space-y-5">
              <label className="block">
                <span className="text-xs font-black text-stone-500">
                  {l("프로젝트 이름", "Tên project", "Project name")}
                </span>
                <input
                  name="name"
                  required
                  maxLength={100}
                  placeholder={l(
                    "예: OS 논문 공동 프로젝트",
                    "VD: Project chung về paper OS",
                    "Example: Collaborative OS paper project",
                  )}
                  className="mt-2 w-full rounded-2xl bg-white px-4 py-3.5 text-sm font-bold outline-none ring-1 ring-black/10 focus:ring-2 focus:ring-emerald-400"
                />
              </label>
              <label className="block">
                <span className="text-xs font-black text-stone-500">
                  {l("공동 목표", "Mục tiêu chung", "Shared goal")}
                </span>
                <textarea
                  name="description"
                  maxLength={500}
                  placeholder={l(
                    "팀이 함께 달성할 목표를 적어 주세요.",
                    "Viết mục tiêu mà cả nhóm sẽ cùng đạt được.",
                    "Write the goal the team will achieve together.",
                  )}
                  className="mt-2 min-h-24 w-full resize-none rounded-2xl bg-white px-4 py-3.5 text-sm font-bold outline-none ring-1 ring-black/10"
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label>
                  <span className="text-xs font-black text-stone-500">
                    {l(
                      "프로젝트 deadline",
                      "Deadline project",
                      "Project deadline",
                    )}
                  </span>
                  <input
                    type="date"
                    name="deadline"
                    required
                    min={localDateKey()}
                    defaultValue={defaultDeadline()}
                    className="mt-2 w-full rounded-2xl bg-white px-4 py-3.5 text-sm font-bold ring-1 ring-black/10"
                  />
                </label>
                <label>
                  <span className="text-xs font-black text-stone-500">
                    {l(
                      "완료 보상 / 팀원",
                      "Thưởng hoàn thành / thành viên",
                      "Completion reward / member",
                    )}
                  </span>
                  <div className="relative">
                    <input
                      type="number"
                      name="rewardPoints"
                      required
                      min={1}
                      max={500}
                      defaultValue={30}
                      className="mt-2 w-full rounded-2xl bg-white px-4 py-3.5 pr-10 text-sm font-bold ring-1 ring-black/10"
                    />
                    <span className="absolute right-4 top-1/2 mt-1 text-xs font-black text-stone-400">
                      P
                    </span>
                  </div>
                </label>
              </div>
              <fieldset>
                <legend className="text-xs font-black text-stone-500">
                  {l("팀원 초대", "Mời thành viên", "Invite team members")}
                </legend>
                <div className="mt-2 max-h-52 space-y-2 overflow-y-auto">
                  {members
                    .filter((member) => member.id !== user.id)
                    .map((member) => (
                      <label
                        key={member.id}
                        className="flex cursor-pointer items-center gap-3 rounded-2xl bg-white p-3 ring-1 ring-black/[0.06]"
                      >
                        <input
                          type="checkbox"
                          checked={selectedFriendIds.includes(member.id)}
                          onChange={() =>
                            setSelectedFriendIds((current) =>
                              current.includes(member.id)
                                ? current.filter((id) => id !== member.id)
                                : [...current, member.id],
                            )
                          }
                          className="h-5 w-5 accent-emerald-500"
                        />
                        <CharacterAvatar
                          config={member.avatarConfig}
                          background={member.avatarBackground}
                          name={member.name}
                          size={38}
                        />
                        <span>
                          <span className="block text-sm font-black">
                            {member.name}
                          </span>
                          <span className="text-[10px] font-semibold text-stone-400">
                            {member.role}
                          </span>
                        </span>
                      </label>
                    ))}
                </div>
              </fieldset>
              <button
                type="submit"
                disabled={isSaving}
                className="w-full rounded-full bg-stone-950 px-5 py-3.5 text-sm font-black text-white shadow-[0_5px_0_#2d9a73] disabled:opacity-50"
              >
                {isSaving
                  ? l("만드는 중...", "Đang tạo...", "Creating...")
                  : l("Project 시작", "Bắt đầu Project", "Start Project")}
              </button>
            </form>
          </section>
        </div>
      )}
      {activeMeeting && (
        <JitsiRoom
          roomName={activeMeeting.roomName}
          title={activeMeeting.title}
          userName={user.name}
          userEmail={user.email}
          isHost={isHost}
          notes={notesDraft}
          notesStatus={notesStatus}
          onNotesChange={changeMeetingNotes}
          onClose={closeMeetingRoom}
          onEnd={endMeeting}
        />
      )}
    </main>
  );
}
