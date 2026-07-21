"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useI18n, type LocalizedText } from "../lib/i18n";

const PaperReader = dynamic(() => import("./paper-reader"), {
  ssr: false,
  loading: () => (
    <div className="grid h-[62vh] place-items-center rounded-xl bg-[#302920] text-sm font-black text-amber-100/50 lg:h-[calc(100vh-9rem)]">
      PAPER READER LOADING...
    </div>
  ),
});

type LocalizedValue = string | LocalizedText;
type OrderCard = { id: string; name: LocalizedValue; role: LocalizedValue };

function shuffleCards(cards: OrderCard[]) {
  const shuffled = [...cards];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [
      shuffled[randomIndex],
      shuffled[index],
    ];
  }
  if (
    shuffled.length > 1 &&
    shuffled.every((card, index) => card.id === cards[index].id)
  ) {
    [shuffled[0], shuffled[1]] = [shuffled[1], shuffled[0]];
  }
  return shuffled;
}
type ThirdQuestion = {
  heading: LocalizedValue;
  prompt: LocalizedValue;
  type: "single" | "multi";
  options: { id: string; name: string; note: LocalizedValue }[];
  correct: string[];
};
type ChapterTwoMission = {
  id: number;
  title: LocalizedValue;
  paperTitle: string;
  file: string;
  topic: string;
  orderHeading: LocalizedValue;
  orderAccent: LocalizedValue;
  orderInstruction: LocalizedValue;
  cards: OrderCard[];
  keywords: string[];
  missingKeyword: string;
  third: ThirdQuestion;
};

function localized(value: LocalizedValue, locale: "ko" | "vi" | "en") {
  return typeof value === "string" ? value : value[locale];
}

const STRUCTURE_ONE: OrderCard[] = [
  {
    id: "title",
    name: "Title & Authors",
    role: {
      ko: "연구 주제와 저자 정보",
      vi: "Chủ đề nghiên cứu và thông tin tác giả",
      en: "Research topic and author information",
    },
  },
  {
    id: "abstract",
    name: "Abstract & Keywords",
    role: {
      ko: "연구 전체 요약과 핵심어",
      vi: "Tóm tắt toàn bộ nghiên cứu và từ khóa",
      en: "Overall summary and keywords",
    },
  },
  {
    id: "intro",
    name: "Introduction",
    role: {
      ko: "문제, 필요성, 연구 목표",
      vi: "Vấn đề, sự cần thiết và mục tiêu",
      en: "Problem, motivation and objectives",
    },
  },
  {
    id: "related",
    name: "Related Work",
    role: {
      ko: "기존 연구와 이 논문의 차이",
      vi: "Khác biệt với nghiên cứu trước",
      en: "Difference from prior work",
    },
  },
  {
    id: "background",
    name: "Background",
    role: {
      ko: "이해에 필요한 기술적 배경",
      vi: "Nền tảng kỹ thuật cần thiết",
      en: "Required technical background",
    },
  },
  {
    id: "fileops",
    name: "File Operations in Secure Container Runtimes",
    role: {
      ko: "각 런타임의 파일 I/O 동작 구조",
      vi: "Cấu trúc file I/O của từng runtime",
      en: "File I/O behavior of each runtime",
    },
  },
  {
    id: "performance",
    name: "Performance and CPU Usage Analysis",
    role: {
      ko: "실험 설정, 성능과 CPU 사용 결과",
      vi: "Thiết lập thí nghiệm, hiệu năng và CPU",
      en: "Experiment setup, performance and CPU results",
    },
  },
  {
    id: "bottleneck",
    name: "Bottleneck Analysis Using Symbol-Level Profiling",
    role: {
      ko: "성능 차이의 근본 원인 분석",
      vi: "Phân tích nguyên nhân chênh lệch hiệu năng",
      en: "Root-cause analysis of performance differences",
    },
  },
  {
    id: "discussion",
    name: "Discussion",
    role: {
      ko: "결과의 의미, 선택 기준과 향후 과제",
      vi: "Ý nghĩa, tiêu chí lựa chọn và hướng phát triển",
      en: "Meaning, selection criteria and future work",
    },
  },
  {
    id: "conclusion",
    name: "Concluding Remarks",
    role: {
      ko: "핵심 발견과 기여 정리",
      vi: "Tổng kết phát hiện và đóng góp",
      en: "Summary of findings and contributions",
    },
  },
  {
    id: "references",
    name: "References",
    role: {
      ko: "인용한 연구와 자료 목록",
      vi: "Danh sách tài liệu được trích dẫn",
      en: "Cited studies and sources",
    },
  },
];
const STRUCTURE_FOUR: OrderCard[] = [
  {
    id: "title",
    name: "Title & Authors",
    role: {
      ko: "연구 제목과 저자 정보",
      vi: "Tiêu đề và thông tin tác giả",
      en: "Research title and author information",
    },
  },
  {
    id: "abstract",
    name: "Abstract & Keywords",
    role: {
      ko: "연구 전체 요약과 핵심어",
      vi: "Tóm tắt nghiên cứu và từ khóa",
      en: "Overall summary and keywords",
    },
  },
  {
    id: "intro",
    name: "Introduction",
    role: {
      ko: "교육 문제와 CodeDive의 연구 목표",
      vi: "Vấn đề giáo dục và mục tiêu CodeDive",
      en: "Education problem and CodeDive objectives",
    },
  },
  {
    id: "related",
    name: "Related Work",
    role: {
      ko: "기존 web IDE와 activity tracking 연구",
      vi: "Nghiên cứu web IDE và activity tracking",
      en: "Prior web IDE and activity-tracking research",
    },
  },
  {
    id: "design",
    name: "System Design",
    role: {
      ko: "CodeDive의 전체 구조와 주요 구성 요소",
      vi: "Kiến trúc và thành phần chính của CodeDive",
      en: "CodeDive architecture and components",
    },
  },
  {
    id: "workflows",
    name: "Workflows",
    role: {
      ko: "학생과 교수자의 사용 흐름",
      vi: "Luồng sử dụng của sinh viên và giảng viên",
      en: "Student and instructor workflows",
    },
  },
  {
    id: "implementation",
    name: "Implementation Details",
    role: {
      ko: "deployment, monitoring, authentication 구현",
      vi: "Triển khai deployment, monitoring và authentication",
      en: "Deployment, monitoring and authentication implementation",
    },
  },
  {
    id: "results",
    name: "Implementation Results",
    role: {
      ko: "실제 수업 배포 결과와 수집 데이터",
      vi: "Kết quả triển khai lớp học và dữ liệu",
      en: "Classroom deployment results and data",
    },
  },
  {
    id: "discussion",
    name: "Discussion",
    role: {
      ko: "결과의 의미, 한계와 향후 과제",
      vi: "Ý nghĩa, giới hạn và hướng phát triển",
      en: "Meaning, limitations and future work",
    },
  },
  {
    id: "conclusions",
    name: "Conclusions",
    role: {
      ko: "핵심 기여와 연구 결론",
      vi: "Đóng góp chính và kết luận",
      en: "Key contributions and conclusions",
    },
  },
  {
    id: "references",
    name: "References",
    role: {
      ko: "인용한 연구와 자료",
      vi: "Nghiên cứu và tài liệu được trích dẫn",
      en: "Cited studies and sources",
    },
  },
];

export const CHAPTER_TWO_MISSIONS: ChapterTwoMission[] = [
  {
    id: 1,
    title: { ko: "논문 구조 순서 맞추기", vi: "Sắp xếp cấu trúc paper", en: "Order the paper structure" },
    paperTitle:
      "Impact of Secure Container Runtimes on File I/O Performance in Edge Computing",
    file: "/papers/mission1.pdf",
    topic: "Paper Structure",
    orderHeading: { ko: "논문의 구조를 완성해 보세요", vi: "Hoàn thành cấu trúc paper", en: "Complete the paper structure" },
    orderAccent: { ko: "Paper Structure", vi: "Cấu trúc paper", en: "Paper structure" },
    orderInstruction: { ko: "paper의 큰 section heading을 확인하고 실제 등장 순서대로 배치하세요.", vi: "Kiểm tra các section heading lớn và sắp xếp theo thứ tự xuất hiện.", en: "Check the major section headings and arrange them in their actual order." },
    cards: STRUCTURE_ONE,
    keywords: [
      "container runtimes",
      "GPU scheduling",
      "I/O performance",
      "security",
      "kernel-level profiling",
    ],
    missingKeyword: "GPU scheduling",
    third: {
      heading: { ko: "이 논문에서 비교하지 않은 대상은?", vi: "Đối tượng nào không được so sánh?", en: "Which item is not compared in this paper?" },
      prompt: { ko: "성능 비교에 포함되지 않은 기술을 선택하세요.", vi: "Chọn công nghệ không nằm trong phần so sánh hiệu năng.", en: "Choose the technology not included in the performance comparison." },
      type: "single",
      correct: ["kubernetes"],
      options: [
        {
          id: "kata",
          name: "Kata Containers",
          note: "secure container runtime",
        },
        { id: "gvisor", name: "gVisor", note: "sandboxed container runtime" },
        { id: "firecracker", name: "Firecracker", note: "microVM runtime" },
        {
          id: "kubernetes",
          name: "Kubernetes",
          note: "container orchestration",
        },
      ],
    },
  },
  {
    id: 2,
    title: { ko: "Abstract 핵심 찾기", vi: "Tìm ý chính trong Abstract", en: "Find the key ideas in the abstract" },
    paperTitle:
      "Kafe: Can OS Kernels Forward Packets Fast Enough for Software Routers?",
    file: "/papers/mission2.pdf",
    topic: "Abstract",
    orderHeading: { ko: "Abstract의 흐름을 완성해 보세요", vi: "Hoàn thành luồng của Abstract", en: "Complete the abstract flow" },
    orderAccent: { ko: "핵심 논리", vi: "Logic chính", en: "Core logic" },
    orderInstruction: { ko: "연구가 전개되는 흐름대로 카드를 배치하세요.", vi: "Sắp xếp thẻ theo cách nghiên cứu được trình bày.", en: "Arrange the cards in the order the research develops." },
    cards: [
      {
        id: "problem",
        name: { ko: "기존 인식과 문제", vi: "Nhận định cũ và vấn đề", en: "Prior belief and problem" },
        role: { ko: "범용 OS 기반 software router는 빠른 packet 처리가 어렵다는 인식", vi: "Quan niệm rằng software router trên OS phổ thông khó xử lý packet nhanh", en: "Belief that general-purpose OS software routers cannot process packets quickly" },
      },
      {
        id: "question",
        name: { ko: "연구 질문", vi: "Câu hỏi nghiên cứu", en: "Research question" },
        role: { ko: "kernel network stack을 다시 설계하면 한계를 극복할 수 있는가?", vi: "Thiết kế lại kernel network stack có vượt qua giới hạn không?", en: "Can redesigning the kernel network stack overcome the limit?" },
      },
      {
        id: "solution",
        name: { ko: "제안 시스템", vi: "Hệ thống đề xuất", en: "Proposed system" },
        role: { ko: "kernel 기반 packet forwarding engine인 Kafe 제안", vi: "Đề xuất Kafe, packet forwarding engine dựa trên kernel", en: "Proposes Kafe, a kernel-based packet-forwarding engine" },
      },
      {
        id: "result",
        name: { ko: "평가 결과", vi: "Kết quả đánh giá", en: "Evaluation results" },
        role: { ko: "Linux보다 7배 빠르고 DPDK와 비슷한 성능을 더 적은 자원으로 달성", vi: "Nhanh hơn Linux 7 lần và đạt hiệu năng gần DPDK với ít tài nguyên hơn", en: "Seven times faster than Linux and near-DPDK performance with fewer resources" },
      },
    ],
    keywords: [
      "Software router",
      "OS network stack",
      "Optimization",
      "Packet forwarding",
    ],
    missingKeyword: "Packet forwarding",
    third: {
      heading: { ko: "Kafe가 제안한 새로운 기술 2개는?", vi: "Hai kỹ thuật mới Kafe đề xuất là gì?", en: "Which two new techniques does Kafe propose?" },
      prompt: { ko: "새로운 mechanism으로 소개된 두 항목을 선택하세요.", vi: "Chọn hai mục được giới thiệu là mechanism mới.", en: "Select the two items introduced as new mechanisms." },
      type: "multi",
      correct: ["skb", "flow"],
      options: [
        {
          id: "skb",
          name: "skb Stack",
          note: { ko: "pre-allocated skb를 cache-friendly 방식으로 재사용", vi: "Tái sử dụng skb được cấp phát trước theo cách cache-friendly", en: "Reuses pre-allocated skbs in a cache-friendly way" },
        },
        {
          id: "flow",
          name: "Flow Repository",
          note: { ko: "같은 flow의 kernel object를 packet 사이에서 cache", vi: "Cache kernel object của cùng flow giữa các packet", en: "Caches kernel objects for the same flow across packets" },
        },
        {
          id: "rss",
          name: "Receive Side Scaling",
          note: { ko: "NIC의 기존 packet 분산 기능", vi: "Chức năng phân phối packet có sẵn của NIC", en: "Existing NIC packet-distribution feature" },
        },
        {
          id: "napi",
          name: "NAPI polling",
          note: { ko: "Linux driver의 기존 polling 방식", vi: "Cơ chế polling có sẵn của Linux driver", en: "Existing Linux-driver polling method" },
        },
      ],
    },
  },
  {
    id: 3,
    title: { ko: "Figure 먼저 읽기", vi: "Đọc Figure trước", en: "Read the figures first" },
    paperTitle:
      "CLIK: Cloud-based Linux kernel practice environment and judgment system",
    file: "/papers/mission3.pdf",
    topic: "Figures",
    orderHeading: { ko: "CLIK 연구 흐름을 완성해 보세요", vi: "Hoàn thành luồng nghiên cứu CLIK", en: "Complete the CLIK research flow" },
    orderAccent: { ko: "문제에서 결과까지", vi: "Từ vấn đề đến kết quả", en: "From problem to results" },
    orderInstruction: { ko: "연구 배경부터 실제 결과까지 순서대로 배치하세요.", vi: "Sắp xếp từ bối cảnh nghiên cứu đến kết quả thực tế.", en: "Arrange the cards from research context to actual results." },
    cards: [
      {
        id: "context",
        name: { ko: "교육적 배경", vi: "Bối cảnh giáo dục", en: "Educational context" },
        role: { ko: "실제 OS 이해를 위해 kernel programming assignment가 필요함", vi: "Cần bài tập kernel programming để hiểu OS thực tế", en: "Kernel programming assignments are needed to understand real OS behavior" },
      },
      {
        id: "difficulty",
        name: { ko: "학습과 평가의 어려움", vi: "Khó khăn học và đánh giá", en: "Learning and evaluation difficulty" },
        role: { ko: "환경 구축과 reboot 평가에 많은 시간이 필요함", vi: "Thiết lập môi trường và đánh giá reboot tốn nhiều thời gian", en: "Environment setup and reboot-based evaluation take substantial time" },
      },
      {
        id: "solution",
        name: { ko: "제안 시스템", vi: "Hệ thống đề xuất", en: "Proposed system" },
        role: { ko: "cloud 기반 Linux kernel 실습 환경과 자동 평가 시스템 CLIK", vi: "CLIK: môi trường thực hành Linux kernel và chấm tự động trên cloud", en: "CLIK, a cloud Linux-kernel practice and automatic-judging system" },
      },
      {
        id: "evidence",
        name: { ko: "수업 적용 결과", vi: "Kết quả áp dụng lớp học", en: "Classroom results" },
        role: { ko: "40명의 환경을 지원하고 parallel judgment로 1분 이내 평가", vi: "Hỗ trợ 40 môi trường và chấm trong một phút bằng parallel judgment", en: "Supports 40 environments and judges within one minute in parallel" },
      },
    ],
    keywords: [
      "Automatic judgment system",
      "Cloud system",
      "Linux kernel assignment",
      "Operating systems",
      "Container orchestration",
    ],
    missingKeyword: "Container orchestration",
    third: {
      heading: { ko: "CLIK는 무엇으로 구축되었을까요?", vi: "CLIK được xây dựng bằng gì?", en: "What was CLIK built with?" },
      prompt: { ko: "실제 private cloud 구축에 사용한 platform을 선택하세요.", vi: "Chọn platform dùng để xây dựng private cloud thực tế.", en: "Choose the platform used to build the private cloud." },
      type: "single",
      correct: ["openstack"],
      options: [
        {
          id: "openstack",
          name: "OpenStack",
          note: "open-source cloud infrastructure platform",
        },
        {
          id: "cloudstack",
          name: "Apache CloudStack",
          note: { ko: "또 다른 cloud software", vi: "Một cloud software khác", en: "Another cloud platform" },
        },
        {
          id: "aws",
          name: "Amazon Web Services",
          note: "commercial public cloud",
        },
        {
          id: "gcp",
          name: "Google Cloud Platform",
          note: "commercial public cloud",
        },
      ],
    },
  },
  {
    id: 4,
    title: { ko: "한 문장으로 요약하기", vi: "Tóm tắt trong một câu", en: "Summarize in one sentence" },
    paperTitle:
      "CodeDive: A Web-Based IDE with Real-Time Code Activity Monitoring for Programming Education",
    file: "/papers/mission4.pdf",
    topic: "Summary",
    orderHeading: { ko: "논문의 구조를 완성해 보세요", vi: "Hoàn thành cấu trúc paper", en: "Complete the paper structure" },
    orderAccent: { ko: "CodeDive Paper Outline", vi: "Outline paper CodeDive", en: "CodeDive paper outline" },
    orderInstruction: { ko: "paper의 큰 section heading을 실제 등장 순서대로 배치하세요.", vi: "Sắp xếp các section heading lớn theo thứ tự xuất hiện.", en: "Arrange the major section headings in their actual order." },
    cards: STRUCTURE_FOUR,
    keywords: [
      "Integrated Development Environment",
      "Programming education",
      "Activity monitoring",
      "Packet routing",
    ],
    missingKeyword: "Packet routing",
    third: {
      heading: { ko: "CodeDive deployment는 어떤 platform 기반일까요?", vi: "Deployment CodeDive dựa trên platform nào?", en: "Which platform underpins CodeDive deployment?" },
      prompt: { ko: "scalable cloud architecture의 기반 platform을 선택하세요.", vi: "Chọn platform nền tảng của scalable cloud architecture.", en: "Choose the platform underlying the scalable cloud architecture." },
      type: "single",
      correct: ["kubernetes"],
      options: [
        {
          id: "kubernetes",
          name: "Kubernetes",
          note: { ko: "container orchestration 기반 cloud architecture", vi: "Cloud architecture dựa trên container orchestration", en: "Cloud architecture based on container orchestration" },
        },
        {
          id: "swarm",
          name: "Docker Swarm",
          note: "Docker clustering platform",
        },
        {
          id: "mesos",
          name: "Apache Mesos",
          note: "distributed resource platform",
        },
        {
          id: "openshift",
          name: "OpenShift",
          note: "enterprise container platform",
        },
      ],
    },
  },
];

type ChapterTwoProps = {
  userId: string;
  chapterCompleted: boolean;
  onBackToLabLog: () => void;
  onUnlocked: () => Promise<void>;
};
export default function ChapterTwo({
  userId,
  chapterCompleted,
  onBackToLabLog,
  onUnlocked,
}: ChapterTwoProps) {
  const { l } = useI18n();
  const [view, setView] = useState<
    "loading" | "intro" | "map" | "mission" | "complete"
  >("loading");
  const [completed, setCompleted] = useState<number[]>([]);
  const [selectedMission, setSelectedMission] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const raw = window.localStorage.getItem(`labquest-chapter2-${userId}`);
      const progress = raw ? (JSON.parse(raw) as number[]) : [];
      setCompleted(progress.filter((value) => [1, 2, 3, 4].includes(value)));
      setView(
        chapterCompleted ? "complete" : progress.length ? "map" : "intro",
      );
    }, 0);
    return () => window.clearTimeout(timer);
  }, [chapterCompleted, userId]);

  async function finishMission(number: number) {
    const next = Array.from(new Set([...completed, number])).sort();
    setCompleted(next);
    window.localStorage.setItem(
      `labquest-chapter2-${userId}`,
      JSON.stringify(next),
    );
    if (number !== 4) {
      setView("map");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onUnlocked();
      setView("complete");
    } catch {
      setError(
        l(
          "Chapter 2 완료 상태를 저장하지 못했습니다. 다시 시도해 주세요.",
          "Không thể lưu trạng thái hoàn thành Chapter 2. Hãy thử lại.",
          "Could not save Chapter 2 completion. Try again.",
        ),
      );
      setView("map");
    } finally {
      setSaving(false);
    }
  }

  if (view === "loading")
    return (
      <C2Shell>
        <p className="m-auto text-sm font-black tracking-widest text-amber-200">
          CHAPTER 02 LOADING...
        </p>
      </C2Shell>
    );
  if (view === "intro")
    return <C2Intro onBack={onBackToLabLog} onStart={() => setView("map")} />;
  if (view === "complete")
    return (
      <C2Complete onMap={() => setView("map")} onProfile={onBackToLabLog} />
    );
  if (view === "mission")
    return (
      <PaperMission
        mission={CHAPTER_TWO_MISSIONS[selectedMission - 1]}
        onBack={() => setView("map")}
        onComplete={() => finishMission(selectedMission)}
        saving={saving}
      />
    );
  return (
    <C2Map
      completed={completed}
      error={error}
      onBack={onBackToLabLog}
      onPlay={(number) => {
        setSelectedMission(number);
        setView("mission");
      }}
    />
  );
}

function C2Intro({
  onBack,
  onStart,
}: {
  onBack: () => void;
  onStart: () => void;
}) {
  const { l } = useI18n();
  return (
    <C2Shell>
      <button
        onClick={onBack}
        className="absolute left-5 top-5 rounded-full border border-white/15 bg-white/[.05] px-4 py-2 text-sm font-bold text-white/60"
      >
        ← LABLOG
      </button>
      <section className="mx-auto grid max-w-5xl items-center gap-10 pt-16 lg:grid-cols-[.75fr_1.25fr]">
        <div className="relative mx-auto h-64 w-52 rotate-[-4deg] rounded-lg bg-[#f6ecd0] p-7 text-[#332819] shadow-[18px_22px_0_rgba(50,34,18,.25)]">
          <small className="text-xs font-black tracking-[.2em]">RESEARCH</small>
          <strong className="mt-5 block font-serif text-5xl">PAPER</strong>
          <span className="absolute bottom-7 left-7 text-sm font-black">
            CHAPTER 02
          </span>
        </div>
        <div>
          <p className="text-xs font-black tracking-[.2em] text-amber-300">
            OS LAB · NEW JOURNEY
          </p>
          <h1 className="mt-4 text-6xl font-black tracking-[-.06em] sm:text-8xl">
            {l("논문", "Làm quen", "Getting familiar")}
            <br />
            <em className="not-italic text-[#f2c66d]">{l("익숙하기", "với paper", "with papers")}</em>
          </h1>
          <p className="mt-6 text-base font-semibold leading-8 text-white/60">
            {l("논문을 전부 읽으려고 애쓰지 않아도 괜찮아요.", "Bạn không cần cố đọc toàn bộ paper.", "You do not need to struggle through the entire paper.")}
            <br />
            {l("먼저 구조를 보고, 중요한 부분을 찾는 법부터 시작해요.", "Hãy bắt đầu bằng cấu trúc và cách tìm phần quan trọng.", "Start with its structure and learn how to find the important parts.")}
          </p>
          <div className="mt-7 rounded-2xl border border-amber-200/20 bg-amber-200/[.06] p-5">
            <small className="text-[10px] font-black tracking-widest text-amber-200">
              CHAPTER OBJECTIVE
            </small>
            <strong className="mt-2 block text-lg">
              {l("논문의 구조를 이해하고 핵심 내용을 내 언어로 설명하기", "Hiểu cấu trúc paper và giải thích nội dung chính bằng lời của mình", "Understand paper structure and explain the key ideas in your own words")}
            </strong>
          </div>
          <button
            onClick={onStart}
            className="mt-7 rounded-full bg-[#f2c66d] px-8 py-4 text-base font-black text-[#302416] shadow-[0_7px_0_#806126]"
          >
            {l("CHAPTER 2 시작 →", "Bắt đầu CHAPTER 2 →", "Start CHAPTER 2 →")}
          </button>
        </div>
      </section>
    </C2Shell>
  );
}

function C2Map({
  completed,
  error,
  onBack,
  onPlay,
}: {
  completed: number[];
  error: string;
  onBack: () => void;
  onPlay: (number: number) => void;
}) {
  const { locale, l } = useI18n();
  return (
    <C2Shell>
      <div className="mx-auto max-w-5xl">
        <header className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="rounded-full bg-white/[.06] px-4 py-2 text-sm font-bold text-white/60"
          >
            ← LABLOG
          </button>
          <span className="rounded-full border border-amber-200/20 bg-amber-200/[.05] px-4 py-2 text-sm font-black text-amber-200">
            {completed.length} / 4 COMPLETE
          </span>
        </header>
        <div className="mt-10">
          <p className="text-xs font-black tracking-[.2em] text-amber-300">
            CHAPTER 02 · PAPER FAMILIARITY
          </p>
          <h1 className="mt-3 text-5xl font-black sm:text-7xl">
            {l("논문 탐험 지도", "Bản đồ khám phá paper", "Paper exploration map")}
          </h1>
          <p className="mt-4 text-base text-white/50">
            {l("각 Mission에는 서로 다른 OS paper가 연결되어 있어요.", "Mỗi mission được liên kết với một OS paper khác nhau.", "Each mission uses a different OS paper.")}
          </p>
        </div>
        {error && (
          <p className="mt-5 rounded-xl bg-red-300/10 p-4 text-sm font-bold text-red-200">
            {error}
          </p>
        )}
        <div className="mt-9 grid gap-4 md:grid-cols-2">
          {CHAPTER_TWO_MISSIONS.map((mission) => {
            const unlocked =
              mission.id === 1 || completed.includes(mission.id - 1);
            const done = completed.includes(mission.id);
            return (
              <button
                key={mission.id}
                disabled={!unlocked}
                onClick={() => onPlay(mission.id)}
                className={`group relative overflow-hidden rounded-[1.5rem] border p-6 text-left transition ${done ? "border-emerald-300/30 bg-emerald-300/[.07]" : unlocked ? "border-amber-200/20 bg-[#2a241c] hover:-translate-y-1 hover:border-amber-200/50" : "border-white/5 bg-white/[.02] opacity-40"}`}
              >
                <div className="flex items-start justify-between">
                  <span
                    className={`grid h-12 w-12 place-items-center rounded-xl font-black ${done ? "bg-emerald-300 text-emerald-950" : "bg-amber-200/10 text-amber-200"}`}
                  >
                    {done ? "✓" : unlocked ? mission.id : "🔒"}
                  </span>
                  <b className="text-xs text-white/35">
                    {unlocked ? (done ? "REPLAY →" : "PLAY →") : "LOCKED"}
                  </b>
                </div>
                <small className="mt-6 block text-[10px] font-black tracking-[.16em] text-amber-300">
                  MISSION {String(mission.id).padStart(2, "0")} ·{" "}
                  {mission.topic}
                </small>
                <h2 className="mt-2 text-2xl font-black">{localized(mission.title, locale)}</h2>
                <p className="mt-3 line-clamp-2 text-sm leading-6 text-white/45">
                  {mission.paperTitle}
                </p>
              </button>
            );
          })}
        </div>
      </div>
    </C2Shell>
  );
}

function PaperMission({
  mission,
  onBack,
  onComplete,
  saving,
}: {
  mission: ChapterTwoMission;
  onBack: () => void;
  onComplete: () => Promise<void>;
  saving: boolean;
}) {
  const { locale, l } = useI18n();
  const [step, setStep] = useState(1);
  const [outline, setOutline] = useState<string[]>([]);
  const [orderState, setOrderState] = useState<"idle" | "wrong" | "correct">(
    "idle",
  );
  const [keyword, setKeyword] = useState<string | null>(null);
  const [thirdSelected, setThirdSelected] = useState<string[]>([]);
  const [thirdChecked, setThirdChecked] = useState(false);
  const [scrambled, setScrambled] = useState<OrderCard[]>(() =>
    [...mission.cards].reverse(),
  );
  useEffect(() => {
    const timer = window.setTimeout(
      () => setScrambled(shuffleCards(mission.cards)),
      0,
    );
    return () => window.clearTimeout(timer);
  }, [mission.cards]);
  const bank = scrambled.filter((card) => !outline.includes(card.id));
  const keywordCorrect = keyword === mission.missingKeyword;
  const thirdCorrect =
    thirdChecked &&
    mission.third.correct.length === thirdSelected.length &&
    mission.third.correct.every((id) => thirdSelected.includes(id));
  function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= outline.length) return;
    setOutline((current) => {
      const next = [...current];
      const [item] = next.splice(index, 1);
      next.splice(target, 0, item);
      return next;
    });
    setOrderState("idle");
  }
  function checkOrder() {
    setOrderState(
      outline.length === mission.cards.length &&
        outline.every((id, index) => id === mission.cards[index].id)
        ? "correct"
        : "wrong",
    );
  }
  function resetOrder() {
    setOutline([]);
    setOrderState("idle");
    setScrambled(shuffleCards(mission.cards));
  }
  function toggleThird(id: string) {
    setThirdChecked(false);
    if (mission.third.type === "single") setThirdSelected([id]);
    else
      setThirdSelected((current) =>
        current.includes(id)
          ? current.filter((item) => item !== id)
          : current.length < mission.third.correct.length
            ? [...current, id]
            : current,
      );
  }
  return (
    <main className="min-h-screen bg-[#17130f] text-white">
      <header className="grid min-h-20 grid-cols-[auto_1fr_auto] items-center gap-4 border-b border-amber-100/15 bg-[#100d0a] px-4 sm:px-8">
        <button
          onClick={onBack}
          className="rounded-full bg-white/[.06] px-4 py-2 text-sm font-bold text-white/60"
        >
          {l("← 논문 지도", "← Bản đồ paper", "← Paper map")}
        </button>
        <div>
          <small className="text-[10px] font-black tracking-[.16em] text-amber-300">
            CHAPTER 02 · MISSION {String(mission.id).padStart(2, "0")}
          </small>
          <strong className="mt-1 block text-base">{localized(mission.title, locale)}</strong>
        </div>
        <span className="text-sm font-black text-amber-200">0{step} / 03</span>
      </header>
      <section className="grid min-h-[calc(100vh-5rem)] lg:grid-cols-[1.05fr_.95fr]">
        <div className="border-b border-amber-100/15 bg-[#211c16] p-4 lg:border-b-0 lg:border-r">
          <div className="mb-3">
            <small className="text-[10px] font-black tracking-widest text-amber-300">
              RESEARCH PAPER · MISSION {mission.id}
            </small>
            <strong className="mt-1 block truncate text-sm text-white/70">
              {mission.paperTitle}
            </strong>
          </div>
          <PaperReader file={mission.file} title={mission.paperTitle} />
        </div>
        <aside className="max-h-[calc(100vh-5rem)] overflow-y-auto p-5 sm:p-8">
          {step === 1 ? (
            <>
              <QuestionHeading
                eyebrow="QUESTION 01 · RESEARCH FLOW"
                title={localized(mission.orderHeading, locale)}
                accent={localized(mission.orderAccent, locale)}
                description={localized(mission.orderInstruction, locale)}
              />
              <div
                className={`mt-6 rounded-2xl border p-4 ${orderState === "correct" ? "border-emerald-300/40 bg-emerald-300/[.06]" : orderState === "wrong" ? "border-red-300/40 bg-red-300/[.06]" : "border-amber-100/15 bg-white/[.03]"}`}
              >
                <div className="flex justify-between text-xs font-black text-white/40">
                  <span>YOUR PAPER OUTLINE</span>
                  <b>
                    {outline.length} / {mission.cards.length}
                  </b>
                </div>
                <div className="mt-3 max-h-72 space-y-2 overflow-y-auto">
                  {outline.length === 0 && (
                    <p className="p-5 text-center text-sm text-white/30">
                      {l("아래 카드를 순서대로 선택하세요.", "Chọn các thẻ bên dưới theo đúng thứ tự.", "Select the cards below in order.")}
                    </p>
                  )}
                  {outline.map((id, index) => {
                    const card = mission.cards.find((item) => item.id === id)!;
                    return (
                      <div
                        key={id}
                        className="grid grid-cols-[2rem_1fr_auto] items-center gap-2 rounded-xl bg-[#f4ead1] p-3 text-[#352a1e]"
                      >
                        <b className="text-sm">{index + 1}</b>
                        <span>
                          <strong className="block text-sm">{localized(card.name, locale)}</strong>
                          <small className="text-xs opacity-60">
                            {localized(card.role, locale)}
                          </small>
                        </span>
                        <span className="flex gap-1">
                          <button
                            onClick={() => move(index, -1)}
                            className="rounded bg-black/10 px-2 py-1"
                          >
                            ↑
                          </button>
                          <button
                            onClick={() => move(index, 1)}
                            className="rounded bg-black/10 px-2 py-1"
                          >
                            ↓
                          </button>
                          <button
                            onClick={() => {
                              setOutline((current) =>
                                current.filter((item) => item !== id),
                              );
                              setOrderState("idle");
                            }}
                            className="rounded bg-red-500/10 px-2 py-1"
                          >
                            ×
                          </button>
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="mt-4">
                <small className="text-[10px] font-black tracking-widest text-amber-300">
                  PAPER SECTIONS
                </small>
                <div className="mt-2 grid gap-2">
                  {bank.map((card) => (
                    <button
                      key={card.id}
                      onClick={() => {
                        setOutline((current) => [...current, card.id]);
                        setOrderState("idle");
                      }}
                      className="flex items-center justify-between rounded-xl border border-amber-100/15 bg-white/[.035] p-3 text-left hover:border-amber-200/40"
                    >
                      <span>
                        <strong className="block text-sm">{localized(card.name, locale)}</strong>
                        <small className="text-xs text-white/40">
                          {localized(card.role, locale)}
                        </small>
                      </span>
                      <b className="text-amber-200">＋</b>
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-4 rounded-xl bg-white/[.04] p-4 text-sm font-semibold text-white/60">
                {orderState === "correct"
                  ? l("✓ 핵심 흐름을 완성했습니다!", "✓ Bạn đã hoàn thành luồng chính!", "✓ You completed the main flow!")
                  : orderState === "wrong"
                    ? l("순서가 아직 맞지 않아요. paper의 heading을 다시 확인하세요.", "Thứ tự chưa đúng. Hãy kiểm tra lại heading của paper.", "The order is not correct yet. Check the paper headings again.")
                    : l("요약 → 문제 → 방법 → 결과 → 결론의 흐름을 찾아보세요.", "Hãy tìm luồng: tóm tắt → vấn đề → phương pháp → kết quả → kết luận.", "Look for the flow: summary → problem → method → results → conclusion.")}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  onClick={resetOrder}
                  className="rounded-full border border-white/15 p-3 text-sm font-bold"
                >
                  {l("다시 시작", "Làm lại", "Restart")}
                </button>
                {orderState === "correct" ? (
                  <button
                    onClick={() => setStep(2)}
                    className="rounded-full bg-amber-300 p-3 text-sm font-black text-[#342612]"
                  >
                    {l("다음 문제 →", "Câu tiếp theo →", "Next question →")}
                  </button>
                ) : (
                  <button
                    disabled={outline.length !== mission.cards.length}
                    onClick={checkOrder}
                    className="rounded-full bg-amber-300 p-3 text-sm font-black text-[#342612] disabled:opacity-30"
                  >
                    {l("제출", "Nộp", "Submit")}
                  </button>
                )}
              </div>
            </>
          ) : step === 2 ? (
            <>
              <QuestionHeading
                eyebrow="QUESTION 02 · KEYWORD"
                title={l("이 논문에 없는 keyword는?", "Keyword nào không có trong paper?", "Which keyword is not in this paper?")}
                accent={l("Keyword 찾기", "Tìm keyword", "Find the keyword")}
                description={l("첫 페이지의 Keywords 또는 Index Terms를 확인하고 하나를 선택하세요.", "Kiểm tra Keywords hoặc Index Terms ở trang đầu rồi chọn một mục.", "Check the Keywords or Index Terms on the first page and choose one.")}
              />
              <div className="mt-7 grid gap-3">
                {mission.keywords.map((option) => {
                  const selected = keyword === option;
                  return (
                    <button
                      key={option}
                      onClick={() => setKeyword(option)}
                      className={`flex items-center gap-3 rounded-2xl border p-4 text-left text-base font-bold ${selected ? (keywordCorrect ? "border-emerald-300 bg-emerald-300/10 text-emerald-200" : "border-red-300 bg-red-300/10 text-red-200") : "border-white/15 bg-white/[.035]"}`}
                    >
                      <i className="grid h-8 w-8 place-items-center rounded-full bg-white/10 not-italic">
                        {selected ? (keywordCorrect ? "✓" : "×") : ""}
                      </i>
                      {option}
                    </button>
                  );
                })}
              </div>
              {keyword && (
                <div
                  className={`mt-5 rounded-xl p-4 text-sm font-bold ${keywordCorrect ? "bg-emerald-300/10 text-emerald-200" : "bg-red-300/10 text-red-200"}`}
                >
                  {keywordCorrect
                    ? l("정답입니다! 이 항목은 paper의 keyword가 아닙니다.", "Chính xác! Mục này không phải keyword của paper.", "Correct! This item is not a keyword in the paper.")
                    : l("이 keyword는 paper에 있어요. 다시 확인해 보세요.", "Keyword này có trong paper. Hãy kiểm tra lại.", "This keyword appears in the paper. Check again.")}
                </div>
              )}
              <div className="mt-5 grid grid-cols-2 gap-2">
                <button
                  onClick={() => setStep(1)}
                  className="rounded-full border border-white/15 p-3 text-sm font-bold"
                >
                  {l("← 이전 문제", "← Câu trước", "← Previous question")}
                </button>
                <button
                  disabled={!keywordCorrect}
                  onClick={() => setStep(3)}
                  className="rounded-full bg-amber-300 p-3 text-sm font-black text-[#342612] disabled:opacity-30"
                >
                  {l("다음 문제 →", "Câu tiếp theo →", "Next question →")}
                </button>
              </div>
            </>
          ) : (
            <>
              <QuestionHeading
                eyebrow="QUESTION 03 · PAPER EVIDENCE"
                title={localized(mission.third.heading, locale)}
                accent={l("마지막 확인", "Kiểm tra cuối", "Final check")}
                description={localized(mission.third.prompt, locale)}
              />
              <div className="mt-7 grid gap-3">
                {mission.third.options.map((option) => {
                  const selected = thirdSelected.includes(option.id);
                  const correct =
                    thirdChecked && mission.third.correct.includes(option.id);
                  const wrong = thirdChecked && selected && !correct;
                  return (
                    <button
                      key={option.id}
                      onClick={() => toggleThird(option.id)}
                      className={`flex items-center gap-3 rounded-2xl border p-4 text-left ${correct ? "border-emerald-300 bg-emerald-300/10" : wrong ? "border-red-300 bg-red-300/10" : selected ? "border-amber-300 bg-amber-300/10" : "border-white/15 bg-white/[.035]"}`}
                    >
                      <i className="grid h-9 w-9 place-items-center rounded-full bg-white/10 not-italic">
                        {correct ? "✓" : wrong ? "×" : selected ? "✓" : ""}
                      </i>
                      <span>
                        <strong className="block text-base">
                          {option.name}
                        </strong>
                        <small className="mt-1 block text-sm text-white/40">
                          {localized(option.note, locale)}
                        </small>
                      </span>
                    </button>
                  );
                })}
              </div>
              {thirdChecked && (
                <div
                  className={`mt-5 rounded-xl p-4 text-sm font-bold ${thirdCorrect ? "bg-emerald-300/10 text-emerald-200" : "bg-red-300/10 text-red-200"}`}
                >
                  {thirdCorrect
                    ? l("정답입니다! Paper evidence를 정확히 찾았습니다.", "Chính xác! Bạn đã tìm đúng evidence trong paper.", "Correct! You found the paper evidence.")
                    : l("선택한 항목을 paper에서 다시 확인해 보세요.", "Hãy kiểm tra lại các mục đã chọn trong paper.", "Check the selected items in the paper again.")}
                </div>
              )}
              <div className="mt-5 grid grid-cols-2 gap-2">
                <button
                  onClick={() => setStep(2)}
                  className="rounded-full border border-white/15 p-3 text-sm font-bold"
                >
                  {l("← 이전 문제", "← Câu trước", "← Previous question")}
                </button>
                {thirdCorrect ? (
                  <button
                    disabled={saving}
                    onClick={() => void onComplete()}
                    className="rounded-full bg-emerald-300 p-3 text-sm font-black text-emerald-950 disabled:opacity-40"
                  >
                    {saving ? l("저장 중...", "Đang lưu...", "Saving...") : l(`MISSION ${mission.id} 완료 →`, `Hoàn thành MISSION ${mission.id} →`, `Complete MISSION ${mission.id} →`)}
                  </button>
                ) : (
                  <button
                    disabled={
                      thirdSelected.length !== mission.third.correct.length
                    }
                    onClick={() => setThirdChecked(true)}
                    className="rounded-full bg-amber-300 p-3 text-sm font-black text-[#342612] disabled:opacity-30"
                  >
                    {l("정답 확인", "Kiểm tra đáp án", "Check answer")}
                  </button>
                )}
              </div>
            </>
          )}
        </aside>
      </section>
    </main>
  );
}

function QuestionHeading({
  eyebrow,
  title,
  accent,
  description,
}: {
  eyebrow: string;
  title: string;
  accent: string;
  description: string;
}) {
  return (
    <div>
      <p className="text-[10px] font-black tracking-[.17em] text-amber-300">
        {eyebrow}
      </p>
      <h1 className="mt-3 text-3xl font-black tracking-[-.04em] sm:text-4xl">
        {title}
        <br />
        <em className="not-italic text-[#f2c66d]">{accent}</em>
      </h1>
      <p className="mt-4 text-sm font-semibold leading-7 text-white/50">
        {description}
      </p>
    </div>
  );
}
function C2Complete({
  onMap,
  onProfile,
}: {
  onMap: () => void;
  onProfile: () => void;
}) {
  const { l } = useI18n();
  return (
    <C2Shell>
      <section className="mx-auto max-w-4xl rounded-[2rem] border border-emerald-300/25 bg-[#211c16] p-7 text-center sm:p-12">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-emerald-300 text-4xl font-black text-emerald-950">
          ✓
        </div>
        <p className="mt-6 text-xs font-black tracking-[.2em] text-emerald-300">
          CHAPTER 02 CLEAR · FEATURES UNLOCKED
        </p>
        <h1 className="mt-3 text-5xl font-black sm:text-7xl">
          LABLOG
          <br />
          <span className="text-[#f2c66d]">OPEN</span>
        </h1>
        <div className="mx-auto mt-7 flex max-w-2xl items-center gap-5 rounded-2xl border border-amber-200/20 bg-amber-200/[.06] p-5 text-left">
          <Image
            src="/os-penguin.png"
            alt={l("OS Lab 안내 펭귄", "Chim cánh cụt hướng dẫn OS Lab", "OS Lab guide penguin")}
            width={100}
            height={100}
            className="h-24 w-24 object-contain"
          />
          <p className="text-base font-semibold leading-7 text-white/65">
            {l("축하해요! 이제", "Chúc mừng! Bây giờ bạn có thể sử dụng", "Congratulations! You can now use")} {" "}
            <strong className="text-amber-200">
              Mission, Update, Feed, Team
            </strong>{" "}
            {l("기능을 사용하고 활동 포인트를 모을 수 있어요.", "và tích điểm hoạt động.", "and earn activity points.")}
          </p>
        </div>
        <button
          onClick={onProfile}
          className="mt-7 w-full rounded-full bg-emerald-300 px-7 py-4 text-base font-black text-emerald-950 shadow-[0_6px_0_#26705a]"
        >
          {l("프로필로 돌아가기 →", "Về profile →", "Back to profile →")}
        </button>
        <button
          onClick={onMap}
          className="mt-4 text-sm font-bold text-white/40 hover:text-white/70"
        >
          {l("Chapter 2 다시 보기", "Xem lại Chapter 2", "Review Chapter 2")}
        </button>
      </section>
    </C2Shell>
  );
}
function C2Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative flex min-h-screen overflow-hidden bg-[radial-gradient(circle_at_15%_10%,#4a3723,transparent_28%),linear-gradient(#17130f,#211a13)] p-5 text-white sm:p-8">
      <div
        className="pointer-events-none absolute inset-0 opacity-15"
        style={{
          backgroundImage:
            "linear-gradient(rgba(242,198,109,.18) 1px,transparent 1px),linear-gradient(90deg,rgba(242,198,109,.18) 1px,transparent 1px)",
          backgroundSize: "42px 42px",
        }}
      />
      <div className="relative z-10 flex w-full">{children}</div>
    </main>
  );
}
