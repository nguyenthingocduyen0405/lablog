"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AppHeader from "../components/app-header";
import MissionPanel from "../components/mission-panel";
import { getCurrentUser, type AuthUser } from "../lib/auth";
import { useI18n } from "../lib/i18n";
import { useLab } from "../lib/lab-tenancy";
import { labQuestHref } from "../lib/lab-routing";
import {
  loadActiveMissions,
  loadMissionActivity,
  type Mission,
  type MissionActivity,
} from "../lib/lab-social";

export default function MissionPage() {
  const router = useRouter();
  const { l } = useI18n();
  const { activeLab } = useLab();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [posts, setPosts] = useState<MissionActivity[]>([]);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const loadingTimeoutId = window.setTimeout(() => {
      if (cancelled) return;
      setMessage(
        l(
          "요청 시간이 초과되었습니다. Supabase 연결을 확인해 주세요.",
          "Yêu cầu đã hết thời gian. Vui lòng kiểm tra kết nối Supabase.",
          "The request timed out. Please check the Supabase connection.",
        ),
      );
      setIsLoading(false);
    }, 10_000);
    getCurrentUser()
      .then(async (currentUser) => {
        if (!currentUser) {
          router.replace("/login");
          return;
        }
        if (!currentUser.chapterTwoCompletedAt) {
          router.replace(
            labQuestHref(activeLab.slug, {
              chapter: 2,
              locked: "mission",
            }),
          );
          return;
        }
        setUser(currentUser);
        try {
          const [activeMissions, loadedPosts] = await Promise.all([
            loadActiveMissions(currentUser.id),
            loadMissionActivity(currentUser.id),
          ]);
          if (cancelled) return;
          setMissions(activeMissions);
          setPosts(loadedPosts);
        } catch (caughtError) {
          if (cancelled) return;
          setMessage(
            caughtError instanceof Error
              ? caughtError.message
              : l(
                  "Supabase 연결을 확인해 주세요.",
                  "Vui lòng kiểm tra kết nối Supabase.",
                  "Please check the Supabase connection.",
                ),
          );
        } finally {
          window.clearTimeout(loadingTimeoutId);
          if (!cancelled) setIsLoading(false);
        }
      })
      .catch(() => {
        if (cancelled) return;
        window.clearTimeout(loadingTimeoutId);
        setMessage(
          l(
            "Supabase 연결을 확인해 주세요.",
            "Vui lòng kiểm tra kết nối Supabase.",
            "Please check the Supabase connection.",
          ),
        );
        setIsLoading(false);
      });
    return () => {
      cancelled = true;
      window.clearTimeout(loadingTimeoutId);
    };
  }, [activeLab.slug, l, router]);

  if (!user) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f5f3ee] px-5">
        <section className="w-full max-w-md rounded-[2rem] bg-white p-8 text-center shadow-sm">
          <p className="text-xs font-black tracking-[.2em] text-stone-400">
            LABLOG
          </p>
          {isLoading ? (
            <p className="mt-3 text-sm font-black text-stone-500">
              {l("미션 로딩 중...", "Đang tải nhiệm vụ...", "Loading missions...")}
            </p>
          ) : (
            <>
              <h1 className="mt-3 text-2xl font-black text-stone-950">
                {l(
                  "미션을 불러오지 못했습니다",
                  "Không thể tải nhiệm vụ",
                  "Could not load missions",
                )}
              </h1>
              <p role="alert" className="mt-3 text-sm font-medium text-red-600">
                {message}
              </p>
              <div className="mt-6 grid grid-cols-2 gap-3">
                <Link
                  href="/"
                  className="rounded-2xl bg-[#ffd84d] px-4 py-3 text-sm font-black text-stone-950"
                >
                  {l("홈으로", "Trang chủ", "Home")}
                </Link>
                <Link
                  href="/labs"
                  className="rounded-2xl bg-stone-950 px-4 py-3 text-sm font-black text-white"
                >
                  {l("랩 관리", "Quản lý lab", "Manage labs")}
                </Link>
              </div>
            </>
          )}
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f5f3ee] pb-24 text-stone-950 md:pb-0">
      <AppHeader user={user} />
      <div className="mx-auto max-w-5xl px-5 py-10 sm:px-8 sm:py-16">
        <div className="mb-9 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-violet-500">
              02 / Mission
            </p>
            <h1 className="mt-3 text-4xl font-black tracking-[-0.055em] sm:text-6xl">
              {l("오늘부터 어떤", "Hôm nay bạn muốn", "What challenge")}
              <br />
              {l("도전을 할까요?", "thử thách gì?", "will you start today?")}
            </h1>
          </div>
          <p className="max-w-sm text-sm font-semibold leading-6 text-stone-400 sm:text-right">
            {l(
              "여러 미션을 함께 진행할 수 있어요. 시작한 미션은 종료일까지 유지되며, 각 업데이트는 하나의 미션에 기록됩니다.",
              "Bạn có thể thực hiện nhiều nhiệm vụ cùng lúc. Nhiệm vụ đã bắt đầu sẽ được giữ đến ngày kết thúc và mỗi bản cập nhật được ghi vào một nhiệm vụ.",
              "You can run multiple missions at once. A started mission stays active until its end date, and each update is recorded under one mission.",
            )}
          </p>
        </div>

        <MissionPanel
          missions={missions}
          posts={posts}
          onMissionAdded={(mission) =>
            setMissions((current) =>
              current.some((item) => item.id === mission.id)
                ? current
                : [mission, ...current],
            )
          }
        />

        {message && (
          <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
            {message}
          </p>
        )}

        <div className="mt-8 flex items-center justify-between border-t border-black/[0.08] pt-6">
          <Link
            href="/"
            className="text-sm font-black text-stone-400 hover:text-stone-900"
          >
            {l("← 이전", "← Quay lại", "← Back")}
          </Link>
          {missions.length > 0 ? (
            user.chapterTwoCompletedAt ? (
              <Link
                href="/update"
                className="group inline-flex items-center gap-4 rounded-full bg-stone-950 py-2.5 pl-6 pr-2.5 text-sm font-black text-white shadow-[0_7px_0_#c7a600] transition hover:-translate-y-0.5"
              >
                {l("업데이트 시작", "Bắt đầu cập nhật", "Start update")}
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#ffd84d] text-stone-950">
                  {"\u2192"}
                </span>
              </Link>
            ) : (
              <Link
                href={labQuestHref(activeLab.slug, {
                  chapter: 2,
                  locked: "update",
                })}
                className="inline-flex items-center gap-3 rounded-full border border-stone-300 bg-white px-5 py-3 text-sm font-black text-stone-500 shadow-sm"
              >
                <span>🔒</span>
                <span>
                  {l(
                    "CHAPTER 2 완료 후 Update 오픈",
                    "Hoàn thành CHAPTER 2 để mở Update",
                    "Complete CHAPTER 2 to unlock Update",
                  )}
                </span>
              </Link>
            )
          ) : (
            <span className="text-xs font-bold text-stone-300">
              {l(
                "미션을 선택해 주세요",
                "Vui lòng chọn một nhiệm vụ",
                "Please choose a mission",
              )}
            </span>
          )}
        </div>
      </div>
    </main>
  );
}
