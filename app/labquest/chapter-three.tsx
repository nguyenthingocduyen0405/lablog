"use client";

import Image from "next/image";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";

type ChapterThreeProps = {
  userId: string;
  chapterCompleted: boolean;
  onBackToLabLog: () => void;
  onUnlocked: () => Promise<void>;
  onOpenProject: () => void;
};
type View = "loading" | "intro" | "map" | "mission" | "reward" | "complete";
type MissionProps = { onBack: () => void; onComplete: () => void };

const MISSIONS = [
  { id: 1, eyebrow: "C · MEMORY", title: "Linked List Output", description: "malloc으로 생성된 linked list를 추적하고 stdout을 직접 작성하세요.", reward: "Source Module", icon: "</>" },
  { id: 2, eyebrow: "OS · SYNCHRONIZATION", title: "Dining Philosophers", description: "state, mutex, self semaphore를 사용해 세 함수와 philosopher loop를 완성하세요.", reward: "Sync Core", icon: "◎" },
  { id: 3, eyebrow: "ALGORITHM · DFS", title: "Directed Graph Search", description: "방향 그래프에서 DFS call stack과 backtracking으로 S에서 G를 탐색하세요.", reward: "Route Map", icon: "⌁" },
  { id: 4, eyebrow: "DATABASE · INNER JOIN", title: "JOIN Debugger", description: "ambiguous column 오류가 발생한 SQL을 직접 수정하세요.", reward: "Data Key", icon: "▤" },
] as const;

export default function ChapterThree({ userId, chapterCompleted, onBackToLabLog, onUnlocked, onOpenProject }: ChapterThreeProps) {
  const [view, setView] = useState<View>("loading");
  const [completed, setCompleted] = useState<number[]>([]);
  const [selectedMission, setSelectedMission] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const raw = window.localStorage.getItem(`labquest-chapter3-${userId}`);
      const progress = raw ? (JSON.parse(raw) as number[]) : [];
      const valid = progress.filter((value) => [1, 2, 3, 4].includes(value));
      setCompleted(valid);
      const started = window.localStorage.getItem(`labquest-chapter3-started-${userId}`) === "true";
      setView(chapterCompleted ? "complete" : valid.length || started ? "map" : "intro");
    }, 0);
    return () => window.clearTimeout(timer);
  }, [chapterCompleted, userId]);

  function solveMission() {
    setView("reward");
  }

  async function claimReward() {
    if (saving) return;
    const next = Array.from(new Set([...completed, selectedMission])).sort();
    setCompleted(next);
    window.localStorage.setItem(`labquest-chapter3-${userId}`, JSON.stringify(next));
    if (selectedMission !== 4) { setView("map"); return; }
    setSaving(true); setError("");
    try {
      await onUnlocked();
      window.localStorage.removeItem(`labquest-chapter3-started-${userId}`);
      setView("complete");
    } catch {
      setError("Chapter 3 완료 상태를 저장하지 못했습니다. 다시 시도해 주세요.");
    } finally { setSaving(false); }
  }

  if (view === "loading") return <C3Shell><p className="m-auto text-sm font-black tracking-[.2em] text-emerald-300">CHAPTER 03 LOADING...</p></C3Shell>;
  if (view === "intro") return <Intro onBack={onBackToLabLog} onStart={() => { window.localStorage.setItem(`labquest-chapter3-started-${userId}`, "true"); setView("map"); }} />;
  if (view === "complete") return <Complete onMap={() => setView("map")} onProject={onOpenProject} />;
  if (view === "reward") return <Reward mission={MISSIONS[selectedMission - 1]} saving={saving} error={error} onClaim={claimReward} />;
  if (view === "mission") {
    const props = { onBack: () => setView("map"), onComplete: solveMission };
    if (selectedMission === 1) return <MissionOne {...props} />;
    if (selectedMission === 2) return <MissionTwo {...props} />;
    if (selectedMission === 3) return <MissionThree {...props} />;
    return <MissionFour {...props} />;
  }
  return <Map completed={completed} error={error} onBack={onBackToLabLog} onPlay={(number) => { setSelectedMission(number); setError(""); setView("mission"); }} />;
}

function Intro({ onBack, onStart }: { onBack: () => void; onStart: () => void }) {
  return <C3Shell>
    <button onClick={onBack} className="absolute left-5 top-5 rounded-full border border-white/10 bg-white/[.05] px-4 py-2 text-sm font-bold text-white/60">← LABLOG</button>
    <section className="mx-auto grid w-full max-w-6xl items-center gap-12 pt-16 lg:grid-cols-[1.1fr_.9fr]">
      <div><Eyebrow>CHAPTER 03 · PROJECT READINESS</Eyebrow><h1 className="mt-5 text-6xl font-black leading-[.92] tracking-[-.07em] sm:text-8xl">PROJECT<br /><span className="text-emerald-300">START KEY</span></h1><p className="mt-7 max-w-2xl text-base font-semibold leading-8 text-white/55">C, 운영체제, 알고리즘, 데이터베이스. 네 개의 실전 문제를 해결하고 Project를 시작할 준비가 되었음을 증명하세요.</p><button onClick={onStart} className="mt-8 rounded-full bg-emerald-300 px-8 py-4 text-base font-black text-[#071c19] shadow-[0_7px_0_#16735e]">CHAPTER 3 시작 →</button></div>
      <div className="relative mx-auto grid h-80 w-full max-w-md place-items-center rounded-[2.5rem] border border-emerald-200/20 bg-[#102a27] shadow-[0_30px_80px_rgba(0,0,0,.3)]"><div className="absolute inset-5 rounded-[2rem] border border-dashed border-emerald-200/15" /><div className="text-center"><span className="text-8xl">🔐</span><p className="mt-6 text-xs font-black tracking-[.22em] text-emerald-300">4 SKILLS · 1 PROJECT KEY</p></div></div>
    </section>
  </C3Shell>;
}

function Map({ completed, error, onBack, onPlay }: { completed: number[]; error: string; onBack: () => void; onPlay: (number: number) => void }) {
  return <C3Shell><div className="mx-auto w-full max-w-6xl"><header className="flex items-center justify-between gap-4"><button onClick={onBack} className="rounded-full bg-white/[.06] px-4 py-2 text-sm font-bold text-white/60">← LABLOG</button><span className="rounded-full border border-emerald-200/20 bg-emerald-200/[.05] px-4 py-2 text-sm font-black text-emerald-200">{completed.length} / 4 COMPLETE</span></header><div className="mt-11"><Eyebrow>CHAPTER 03 · PROJECT READINESS</Eyebrow><h1 className="mt-3 text-5xl font-black tracking-[-.06em] sm:text-7xl">Project 준비 지도</h1><p className="mt-4 text-base font-semibold text-white/45">앞 Mission을 해결하면 다음 역량 테스트가 열립니다.</p></div>{error && <p className="mt-5 rounded-xl bg-red-300/10 p-4 text-sm font-bold text-red-200">{error}</p>}<div className="mt-9 grid gap-4 md:grid-cols-2">{MISSIONS.map((mission) => { const done = completed.includes(mission.id); const unlocked = mission.id === 1 || completed.includes(mission.id - 1); return <button key={mission.id} disabled={!unlocked} onClick={() => onPlay(mission.id)} className={`group rounded-[1.6rem] border p-6 text-left transition ${done ? "border-emerald-300/30 bg-emerald-300/[.08]" : unlocked ? "border-white/10 bg-[#102421] hover:-translate-y-1 hover:border-emerald-200/45" : "border-white/5 bg-white/[.02] opacity-35"}`}><div className="flex items-start justify-between"><span className={`grid h-14 w-14 place-items-center rounded-2xl text-lg font-black ${done ? "bg-emerald-300 text-emerald-950" : "bg-emerald-200/10 text-emerald-200"}`}>{done ? "✓" : unlocked ? mission.icon : "🔒"}</span><span className="text-xs font-black text-white/35">{unlocked ? done ? "REPLAY →" : "START →" : "LOCKED"}</span></div><small className="mt-6 block text-[10px] font-black tracking-[.16em] text-emerald-300">MISSION 0{mission.id} · {mission.eyebrow}</small><h2 className="mt-2 text-2xl font-black">{mission.title}</h2><p className="mt-3 text-sm font-semibold leading-6 text-white/45">{mission.description}</p><p className="mt-5 text-xs font-black text-amber-200">REWARD · {mission.reward}</p></button>; })}</div></div></C3Shell>;
}

const LINKED_LIST_CODE = `#include <stdio.h>
#include <stdlib.h>

typedef struct Node {
    int value;
    struct Node *next;
} Node;

Node *push_front(Node *head, int value) {
    Node *new_node = malloc(sizeof(Node));
    if (new_node == NULL) return head;

    new_node->value = value;
    new_node->next = head;
    return new_node;
}

void print_list(Node *head) {
    Node *current = head;
    while (current != NULL) {
        printf("%d ", current->value);
        current = current->next;
    }
}

void free_list(Node *head) {
    while (head != NULL) {
        Node *temp = head;
        head = head->next;
        free(temp);
    }
}

int main(void) {
    Node *head = NULL;
    head = push_front(head, 10);
    head = push_front(head, 20);
    head = push_front(head, 30);

    head->next->value += head->value;
    print_list(head);
    free_list(head);
    return 0;
}`;

function MissionOne({ onBack, onComplete }: MissionProps) {
  const [answer, setAnswer] = useState(""); const [attempts, setAttempts] = useState(0); const [feedback, setFeedback] = useState("코드를 실행하지 않고 stdout을 추적하세요."); const [trace, setTrace] = useState(0);
  const nodes = trace === 0 ? [] : trace === 1 ? [10] : trace === 2 ? [20, 10] : trace === 3 ? [30, 20, 10] : trace === 4 ? [30, 50, 10] : [];
  function submit(event: FormEvent) { event.preventDefault(); const normalized = answer.trim().split(/\s+/).join(" "); if (normalized !== "30 50 10") { const next = attempts + 1; setAttempts(next); setFeedback(next === 1 ? "push_front는 새 node를 list의 앞에 연결합니다." : "head->next가 가리키는 두 번째 node의 value 변화를 확인하세요."); return; } setFeedback("정답입니다. Heap 변화를 한 단계씩 확인하세요."); [1, 2, 3, 4, 5].forEach((step, index) => window.setTimeout(() => setTrace(step), index * 550)); window.setTimeout(onComplete, 3100); }
  return <MissionFrame number={1} title="Linked List Output" subtitle="malloc으로 생성된 node와 pointer의 이동을 추적해 출력 결과를 직접 작성하세요." onBack={onBack}><div className="grid gap-5 lg:grid-cols-[1.1fr_.9fr]"><CodePanel code={LINKED_LIST_CODE} /><section className="flex flex-col rounded-[1.6rem] border border-emerald-200/15 bg-[#0c1e1c] p-5 sm:p-6"><Eyebrow>HEAP VISUALIZER</Eyebrow><div className="mt-5 flex min-h-44 flex-wrap items-center justify-center gap-2 rounded-2xl bg-black/20 p-4">{nodes.length ? nodes.map((value, index) => <div key={`${trace}-${index}`} className="flex items-center gap-2"><div className={`grid h-20 w-24 grid-cols-2 overflow-hidden rounded-xl border font-mono ${trace === 4 && index === 1 ? "border-amber-300 bg-amber-300/15" : "border-emerald-200/25 bg-emerald-200/[.06]"}`}><b className="grid place-items-center text-xl">{value}</b><span className="grid place-items-center border-l border-white/10 text-xs text-white/40">next</span></div>{index < nodes.length - 1 && <span className="text-emerald-300">→</span>}</div>) : <p className="text-sm font-bold text-white/25">{trace === 5 ? "free_list() · HEAP RELEASED" : "정답을 제출하면 malloc trace가 시작됩니다."}</p>}</div><form onSubmit={submit} className="mt-5"><label className="text-xs font-black tracking-widest text-white/45">EXPECTED STDOUT</label><div className="mt-2 flex gap-2"><input value={answer} onChange={(event) => setAnswer(event.target.value)} disabled={trace > 0} autoComplete="off" spellCheck={false} placeholder="출력 결과를 입력하세요" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/25 px-4 py-3 font-mono text-base font-bold text-emerald-200 outline-none focus:border-emerald-300" /><button disabled={!answer.trim() || trace > 0} className="rounded-xl bg-emerald-300 px-5 text-sm font-black text-emerald-950 disabled:opacity-35">RUN</button></div></form><Status>{feedback}</Status></section></div></MissionFrame>;
}

const SYNC_CONTEXT_CODE = `#define N 5
#define LEFT  ((i + N - 1) % N)
#define RIGHT ((i + 1) % N)

typedef enum {
    THINKING,
    HUNGRY,
    EATING
} State;

State state[N];
semaphore mutex = 1;
semaphore self[N] = {0, 0, 0, 0, 0};

/* mutex: state[]를 보호하는 critical section
   self[i]: philosopher i가 두 젓가락을
            기다리는 private semaphore */`;

type FunctionPuzzle = {
  id: string;
  title: string;
  signature: string;
  prefix?: string[];
  suffix?: string[];
  explanation: string;
  blocks: { id: string; code: string }[];
};

const FUNCTION_PUZZLES: FunctionPuzzle[] = [
  {
    id: "test",
    title: "test(int i)",
    signature: "void test(int i) {",
    suffix: ["}"],
    explanation: "i가 HUNGRY이고 양쪽 이웃이 EATING이 아닐 때만 식사를 허용합니다.",
    blocks: [
      { id: "condition", code: "if (state[i] == HUNGRY &&\n    state[LEFT] != EATING &&\n    state[RIGHT] != EATING) {" },
      { id: "eating", code: "    state[i] = EATING;" },
      { id: "wake", code: "    signal(self[i]);" },
      { id: "close-if", code: "}" },
    ],
  },
  {
    id: "take",
    title: "take_chopsticks(int i)",
    signature: "void take_chopsticks(int i) {",
    suffix: ["}"],
    explanation: "상태를 HUNGRY로 바꾸고 test한 뒤, 허용될 때까지 자신의 semaphore에서 기다립니다.",
    blocks: [
      { id: "take-lock", code: "wait(mutex);" },
      { id: "hungry", code: "state[i] = HUNGRY;" },
      { id: "test-self", code: "test(i);" },
      { id: "take-unlock", code: "signal(mutex);" },
      { id: "sleep", code: "wait(self[i]);" },
    ],
  },
  {
    id: "put",
    title: "put_chopsticks(int i)",
    signature: "void put_chopsticks(int i) {",
    suffix: ["}"],
    explanation: "식사가 끝나면 THINKING으로 돌아가고, 기다리던 왼쪽과 오른쪽 이웃을 다시 검사합니다.",
    blocks: [
      { id: "put-lock", code: "wait(mutex);" },
      { id: "thinking", code: "state[i] = THINKING;" },
      { id: "test-left", code: "test(LEFT);" },
      { id: "test-right", code: "test(RIGHT);" },
      { id: "put-unlock", code: "signal(mutex);" },
    ],
  },
  {
    id: "process",
    title: "Philosopher process",
    signature: "void philosopher(int i) {",
    prefix: ["do {"],
    suffix: ["} while (1);", "}"],
    explanation: "철학자는 생각하고, 젓가락 사용 권한을 얻고, 식사한 뒤 이웃에게 기회를 넘깁니다.",
    blocks: [
      { id: "think", code: "think(i);" },
      { id: "take-call", code: "take_chopsticks(i);" },
      { id: "eat", code: "eat(i);" },
      { id: "put-call", code: "put_chopsticks(i);" },
    ],
  },
];

function MissionTwo({ onBack, onComplete }: MissionProps) {
  const [puzzleIndex, setPuzzleIndex] = useState(0);
  const [order, setOrder] = useState<string[]>([]);
  const [state, setState] = useState<"idle" | "wrong" | "correct">("idle");
  const puzzle = FUNCTION_PUZZLES[puzzleIndex];
  const available = [...puzzle.blocks].reverse().filter((block) => !order.includes(block.id));

  function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= order.length) return;
    setOrder((current) => {
      const next = [...current];
      const [item] = next.splice(index, 1);
      next.splice(target, 0, item);
      return next;
    });
    setState("idle");
  }

  function check() {
    const correct = order.length === puzzle.blocks.length && puzzle.blocks.every((block, index) => block.id === order[index]);
    setState(correct ? "correct" : "wrong");
  }

  function nextPuzzle() {
    if (puzzleIndex === FUNCTION_PUZZLES.length - 1) { onComplete(); return; }
    setPuzzleIndex((current) => current + 1);
    setOrder([]);
    setState("idle");
  }

  return <MissionFrame number={2} title="Dining Philosophers · Solution 2" subtitle="강의 자료의 state[5], mutex, self[5] 전략으로 세 semaphore 함수와 philosopher process를 완성하세요." onBack={onBack}>
    <div className="grid gap-5 xl:grid-cols-[.8fr_1.2fr]">
      <div className="space-y-4">
        <CodePanel code={SYNC_CONTEXT_CODE} label="PROVIDED STATE & SEMAPHORES" />
        <section className="rounded-2xl border border-emerald-200/15 bg-emerald-200/[.05] p-5">
          <Eyebrow>SOLUTION 2 RULE</Eyebrow>
          <p className="mt-3 text-sm font-semibold leading-7 text-white/60">양쪽 철학자가 모두 <strong className="text-emerald-200">EATING이 아닐 때</strong>만 식사를 시작합니다. mutex의 초기값은 1, 각 self[i]의 초기값은 0입니다.</p>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center text-[10px] font-black"><span className="rounded-xl bg-white/[.06] p-3 text-sky-200">THINKING</span><span className="rounded-xl bg-white/[.06] p-3 text-amber-200">HUNGRY</span><span className="rounded-xl bg-white/[.06] p-3 text-emerald-200">EATING</span></div>
        </section>
      </div>

      <section className="rounded-[1.6rem] border border-emerald-200/15 bg-[#0c1e1c] p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4"><div><Eyebrow>FUNCTION BUILDER · {String(puzzleIndex + 1).padStart(2, "0")} / 04</Eyebrow><h2 className="mt-2 text-2xl font-black">{puzzle.title}</h2></div><span className="rounded-full bg-emerald-200/10 px-3 py-2 text-xs font-black text-emerald-200">{order.length} / {puzzle.blocks.length}</span></div>
        <p className="mt-3 text-sm font-semibold leading-6 text-white/45">{puzzle.explanation}</p>

        <div className="mt-5 rounded-2xl bg-[#061411] p-4 font-mono text-sm leading-6">
          <p className="text-violet-300">{puzzle.signature}</p>
          {puzzle.prefix?.map((line) => <p key={line} className="pl-4 text-white/65">{line}</p>)}
          <div className="my-3 space-y-2 pl-4">
            {order.length === 0 && <p className="rounded-xl border border-dashed border-white/10 p-6 text-center font-sans text-sm font-bold text-white/25">아래 code block을 실행 순서대로 선택하세요.</p>}
            {order.map((id, index) => {
              const block = puzzle.blocks.find((item) => item.id === id)!;
              return <div key={id} className="grid grid-cols-[1.5rem_1fr_auto] items-start gap-2 rounded-xl bg-white/[.06] p-3"><b className="text-emerald-300">{index + 1}</b><pre className="whitespace-pre-wrap text-xs leading-5 text-white/75">{block.code}</pre><span className="flex gap-1"><button onClick={() => move(index, -1)} className="rounded bg-white/10 px-2 py-1">↑</button><button onClick={() => move(index, 1)} className="rounded bg-white/10 px-2 py-1">↓</button><button onClick={() => { setOrder((current) => current.filter((item) => item !== id)); setState("idle"); }} className="rounded bg-red-300/10 px-2 py-1 text-red-200">×</button></span></div>;
            })}
          </div>
          {puzzle.suffix?.map((line, index) => <p key={`${line}-${index}`} className={index === (puzzle.suffix?.length ?? 0) - 1 ? "text-violet-300" : "pl-4 text-white/65"}>{line}</p>)}
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">{available.map((block) => <button key={block.id} onClick={() => { setOrder((current) => [...current, block.id]); setState("idle"); }} className="rounded-xl border border-white/10 bg-white/[.035] p-3 text-left font-mono text-xs leading-5 text-white/60 transition hover:border-emerald-200/35"><pre className="whitespace-pre-wrap">{block.code}</pre></button>)}</div>

        <div className={`mt-4 rounded-xl border p-4 ${state === "correct" ? "border-emerald-300/35 bg-emerald-300/[.07]" : state === "wrong" ? "border-red-300/30 bg-red-300/[.06]" : "border-white/10 bg-white/[.03]"}`}>
          <p className="text-sm font-bold">{state === "correct" ? `✓ ${puzzle.title} 완성!` : state === "wrong" ? "semaphore 진입, 상태 변경, 검사와 signal 순서를 다시 확인하세요." : "모든 block을 배치한 뒤 함수를 검사하세요."}</p>
          <div className="mt-3 flex gap-2"><button onClick={check} disabled={order.length !== puzzle.blocks.length} className="flex-1 rounded-full bg-emerald-300 px-4 py-3 text-sm font-black text-emerald-950 disabled:opacity-35">CHECK FUNCTION</button>{state === "correct" && <button onClick={nextPuzzle} className="rounded-full bg-amber-300 px-5 py-3 text-sm font-black text-amber-950">{puzzleIndex === FUNCTION_PUZZLES.length - 1 ? "Mission 완료 →" : "다음 함수 →"}</button>}</div>
        </div>
      </section>
    </div>
  </MissionFrame>;
}
const GRAPH_NODES = [
  { id: "S", x: 9, y: 50 }, { id: "b", x: 23, y: 19 }, { id: "a", x: 40, y: 9 }, { id: "c", x: 59, y: 19 },
  { id: "d", x: 42, y: 40 }, { id: "e", x: 72, y: 36 }, { id: "h", x: 65, y: 61 }, { id: "p", x: 32, y: 78 },
  { id: "q", x: 52, y: 88 }, { id: "r", x: 85, y: 80 }, { id: "f", x: 88, y: 48 }, { id: "G", x: 92, y: 10 },
] as const;
const DIRECTED_EDGES = [
  ["S", "d"], ["S", "e"], ["S", "p"], ["d", "b"], ["d", "c"], ["d", "e"], ["b", "a"], ["c", "a"],
  ["e", "h"], ["e", "r"], ["h", "p"], ["h", "q"], ["p", "q"], ["r", "f"], ["f", "c"], ["f", "G"],
] as const;
const DFS_ADJACENCY: Record<string, string[]> = {
  S: ["d", "e", "p"], d: ["b", "c", "e"], b: ["a"], a: [], c: ["a"], e: ["h", "r"],
  h: ["p", "q"], p: ["q"], q: [], r: ["f"], f: ["c", "G"], G: [],
};

function MissionThree({ onBack, onComplete }: MissionProps) {
  const [visited, setVisited] = useState<string[]>(["S"]);
  const [stack, setStack] = useState<string[]>(["S"]);
  const [treeEdges, setTreeEdges] = useState<string[]>([]);
  const [feedback, setFeedback] = useState("S에서 시작합니다. adjacency priority의 첫 unvisited node를 따라가세요.");
  const [errors, setErrors] = useState(0);
  const [solved, setSolved] = useState(false);
  const current = stack[stack.length - 1];
  const nextNode = (DFS_ADJACENCY[current] ?? []).find((id) => !visited.includes(id));

  function visit(id: string) {
    if (solved || visited.includes(id)) return;
    if (!nextNode) { setFeedback(`${current}의 unvisited 이웃이 없습니다. BACKTRACK을 눌러 이전 node로 돌아가세요.`); return; }
    if (id !== nextNode) {
      setErrors((value) => value + 1);
      setFeedback(`DFS priority를 확인하세요. ${current}에서 먼저 탐색할 node가 따로 있습니다.`);
      return;
    }
    const nextVisited = [...visited, id];
    setVisited(nextVisited);
    setStack((value) => [...value, id]);
    setTreeEdges((value) => [...value, `${current}-${id}`]);
    if (id === "G") {
      setSolved(true);
      setFeedback("S에서 시작해 모든 node를 방문한 뒤 G에 도착했습니다!");
      return;
    }
    const hasChild = (DFS_ADJACENCY[id] ?? []).some((child) => !nextVisited.includes(child));
    setFeedback(hasChild ? `${id}를 방문했습니다. 같은 branch를 더 깊이 탐색하세요.` : `${id}는 leaf node입니다. 이제 BACKTRACK이 필요합니다.`);
  }

  function backtrack() {
    if (solved || stack.length === 1) return;
    if (nextNode) { setFeedback(`${current}에 아직 방문하지 않은 이웃 ${nextNode}가 있습니다.`); return; }
    const parent = stack[stack.length - 2];
    setStack((value) => value.slice(0, -1));
    setFeedback(`${current}를 call stack에서 pop하고 ${parent}로 돌아왔습니다.`);
  }

  function reset() {
    setVisited(["S"]); setStack(["S"]); setTreeEdges([]); setErrors(0); setSolved(false);
    setFeedback("S에서 다시 시작합니다. 방향과 adjacency priority를 확인하세요.");
  }

  return <MissionFrame number={3} title="Directed DFS · S to G" subtitle="화살표 방향과 adjacency priority를 따라 깊이 탐색하고, leaf node에서는 call stack을 backtrack하세요." onBack={onBack}>
    <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
      <section className="relative min-h-[40rem] overflow-hidden rounded-[1.8rem] border border-slate-300 bg-[#fbfaf6] shadow-[inset_0_0_70px_rgba(15,23,42,.06)]">
        <div className="absolute left-5 top-5 z-20 rounded-xl bg-slate-950 px-4 py-3 text-white shadow-lg"><small className="text-[9px] font-black tracking-[.16em] text-sky-300">DIRECTED GRAPH</small><strong className="mt-1 block text-sm">START S · GOAL G</strong></div>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-label="Directed DFS graph">
          <defs><marker id="c3-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="context-stroke" /></marker></defs>
          {DIRECTED_EDGES.map(([fromId, toId]) => {
            const from = GRAPH_NODES.find((node) => node.id === fromId)!;
            const to = GRAPH_NODES.find((node) => node.id === toId)!;
            const dx = to.x - from.x; const dy = to.y - from.y; const length = Math.hypot(dx, dy);
            const active = treeEdges.includes(`${fromId}-${toId}`);
            if (fromId === "S" && toId === "e") return <path key={`${fromId}-${toId}`} d={`M ${from.x + 4} ${from.y + 1} Q 42 60 ${to.x - 5} ${to.y + 2}`} fill="none" stroke={active ? "#059669" : "#475569"} strokeWidth={active ? 1.35 : .85} markerEnd="url(#c3-arrow)" opacity={active ? 1 : .78} />;
            if (fromId === "f" && toId === "c") return <path key={`${fromId}-${toId}`} d={`M ${from.x - 3} ${from.y - 4} Q 84 17 ${to.x + 5} ${to.y + 1}`} fill="none" stroke={active ? "#059669" : "#475569"} strokeWidth={active ? 1.35 : .85} markerEnd="url(#c3-arrow)" opacity={active ? 1 : .78} />;
            return <line key={`${fromId}-${toId}`} x1={from.x + dx / length * 4} y1={from.y + dy / length * 4} x2={to.x - dx / length * 5} y2={to.y - dy / length * 5} stroke={active ? "#059669" : "#475569"} strokeWidth={active ? 1.35 : .85} markerEnd="url(#c3-arrow)" opacity={active ? 1 : .78} />;
          })}
        </svg>
        {GRAPH_NODES.map((node) => {
          const wasVisited = visited.includes(node.id); const isCurrent = current === node.id;
          return <button key={node.id} onClick={() => visit(node.id)} disabled={wasVisited || solved} style={{ left: `${node.x}%`, top: `${node.y}%` }} className={`absolute z-10 grid h-12 w-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 font-serif text-lg font-black shadow-md transition sm:h-14 sm:w-14 sm:text-xl ${isCurrent ? "scale-110 border-amber-500 bg-amber-300 text-amber-950 ring-4 ring-amber-300/25" : wasVisited ? "border-emerald-600 bg-emerald-200 text-emerald-950" : node.id === "G" ? "border-violet-600 bg-violet-100 text-violet-900 hover:scale-110" : "border-slate-500 bg-white text-slate-900 hover:scale-110 hover:border-sky-500"}`}>{node.id}</button>;
        })}
      </section>

      <aside className="flex flex-col rounded-[1.6rem] border border-emerald-200/15 bg-[#0c1e1c] p-5">
        <div className="flex items-start justify-between"><div><Eyebrow>DFS CALL STACK</Eyebrow><p className="mt-2 text-xs font-bold text-white/35">VISITED {visited.length} / {GRAPH_NODES.length}</p></div><span className="rounded-full bg-red-300/10 px-3 py-2 text-xs font-black text-red-200">ERROR {errors}</span></div>
        <div className="mt-4 flex min-h-48 flex-col-reverse justify-start gap-2 rounded-2xl bg-black/20 p-3">{stack.map((id, index) => <div key={`${id}-${index}`} className={`flex items-center justify-between rounded-xl p-3 text-sm font-black ${index === stack.length - 1 ? "bg-amber-300 text-amber-950" : "bg-emerald-200/10 text-emerald-100"}`}><span>{id}</span><span>{index === stack.length - 1 ? "TOP" : "↳"}</span></div>)}</div>
        <div className="mt-4 rounded-xl border border-white/10 bg-white/[.035] p-4"><small className="text-[9px] font-black tracking-widest text-emerald-300">ADJACENCY PRIORITY</small><p className="mt-2 font-mono text-xs leading-6 text-white/55">S: d → e → p<br />d: b → c → e<br />e: h → r<br />h: p → q<br />f: c → G</p></div>
        <Status>{feedback}</Status>
        <div className="mt-3 grid grid-cols-2 gap-2"><button onClick={backtrack} disabled={Boolean(nextNode) || stack.length === 1 || solved} className="rounded-full border border-white/15 px-4 py-3 text-xs font-black text-white/60 disabled:opacity-25">↶ BACKTRACK</button><button onClick={reset} className="rounded-full border border-white/15 px-4 py-3 text-xs font-black text-white/60">RESET</button></div>
        {solved && <button onClick={onComplete} className="mt-3 rounded-full bg-emerald-300 px-5 py-3 text-sm font-black text-emerald-950">DFS 결과 제출 →</button>}
      </aside>
    </div>
  </MissionFrame>;
}
const BROKEN_SQL = `SELECT user_id, view_date, watch_time
FROM Users
INNER JOIN Viewing_History
ON Users.user_id = Viewing_History.user_id;`;
const RESULT_ROWS = [["kim123", "2026-03-15", "60"], ["kim123", "2026-03-16", "45"], ["choi111", "2026-03-20", "60"], ["lee456", "2026-03-17", "150"], ["lee456", "2026-03-18", "180"], ["kim123", "2026-04-01", "120"], ["lee456", "2026-02-15", "30"]];

function MissionFour({ onBack, onComplete }: MissionProps) {
  const [sql, setSql] = useState(BROKEN_SQL); const [state, setState] = useState<"idle" | "error" | "correct">("idle");
  function run() { const compact = sql.replace(/--.*$/gm, " ").replace(/\s+/g, " ").trim(); const qualified = /select\s+users\s*\.\s*user_id\s*,\s*view_date\s*,\s*watch_time\s+from\s+users/i.test(compact); const joined = /inner\s+join\s+viewing_history\s+on\s+users\s*\.\s*user_id\s*=\s*viewing_history\s*\.\s*user_id/i.test(compact); setState(qualified && joined ? "correct" : "error"); }
  return <MissionFrame number={4} title="INNER JOIN Debugger" subtitle="두 table에 모두 존재하는 user_id 때문에 발생한 ERROR 1052를 수정하세요." onBack={onBack}><div className="grid gap-5 xl:grid-cols-[.75fr_1.25fr]"><section className="space-y-4"><SchemaTable title="Users" columns={["user_id · PK", "name", "team"]} /><SchemaTable title="Viewing_History" columns={["history_id · PK", "user_id · FK", "view_date", "watch_time"]} /><div className="rounded-2xl border border-red-300/25 bg-red-300/[.07] p-5"><p className="text-xs font-black tracking-widest text-red-200">MYSQL ERROR 1052 (23000)</p><p className="mt-2 font-mono text-sm text-red-100">Column &apos;user_id&apos; in field list is ambiguous</p><p className="mt-4 text-sm font-semibold leading-6 text-white/50">목표: 시청 기록이 있는 사용자의 user_id, view_date, watch_time을 출력하세요.</p></div></section><section className="rounded-[1.6rem] border border-emerald-200/15 bg-[#0c1e1c] p-5"><div className="flex items-center justify-between"><Eyebrow>SQL EDITOR</Eyebrow><span className="text-xs font-black text-white/30">MySQL</span></div><textarea value={sql} onChange={(event) => { setSql(event.target.value); setState("idle"); }} spellCheck={false} className="mt-4 min-h-52 w-full resize-y rounded-2xl border border-white/10 bg-[#06110f] p-5 font-mono text-sm font-bold leading-7 text-emerald-100 outline-none focus:border-emerald-300" /><button onClick={run} className="mt-3 w-full rounded-full bg-emerald-300 px-5 py-3 text-sm font-black text-emerald-950">▶ RUN QUERY</button>{state === "error" && <Status>SELECT 목록에서 어느 table의 user_id인지 명시해야 합니다.</Status>}{state === "correct" && <><div className="mt-5 overflow-x-auto rounded-xl border border-emerald-200/20"><table className="w-full min-w-[28rem] text-left font-mono text-xs"><thead className="bg-emerald-300 text-emerald-950"><tr>{["user_id", "view_date", "watch_time"].map((head) => <th key={head} className="px-3 py-2">{head}</th>)}</tr></thead><tbody>{RESULT_ROWS.map((row, index) => <tr key={index} className="border-t border-white/10">{row.map((cell) => <td key={cell} className="px-3 py-2 text-white/65">{cell}</td>)}</tr>)}</tbody></table></div><p className="mt-2 text-xs font-black text-emerald-300">7 rows in set · QUERY SUCCESS</p><button onClick={onComplete} className="mt-4 w-full rounded-full bg-amber-300 px-5 py-3 text-sm font-black text-amber-950">Mission 완료 →</button></>}</section></div></MissionFrame>;
}

function SchemaTable({ title, columns }: { title: string; columns: string[] }) { return <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0c1e1c]"><div className="bg-white/[.07] px-4 py-3 text-sm font-black text-emerald-200">▤ {title}</div>{columns.map((column) => <div key={column} className="border-t border-white/[.06] px-4 py-2.5 font-mono text-xs text-white/55">{column}</div>)}</div>; }

function Reward({ mission, saving, error, onClaim }: { mission: (typeof MISSIONS)[number]; saving: boolean; error: string; onClaim: () => void }) {
  return <C3Shell center><section className="w-full max-w-2xl rounded-[2.2rem] border border-emerald-200/20 bg-[#102622] p-7 text-center shadow-[0_30px_90px_rgba(0,0,0,.35)] sm:p-10"><p className="text-xs font-black tracking-[.2em] text-emerald-300">MISSION 0{mission.id} COMPLETE</p><div className="mx-auto mt-7 grid h-28 w-28 place-items-center rounded-[2rem] border border-amber-200/30 bg-amber-300/10 text-5xl text-amber-200">{mission.icon}</div><h1 className="mt-7 text-4xl font-black tracking-[-.05em] sm:text-6xl">{mission.reward}</h1><p className="mt-4 text-base font-semibold leading-7 text-white/50">Project Key를 구성하는 새로운 module을 획득했습니다.</p>{error && <p className="mt-4 rounded-xl bg-red-300/10 p-3 text-sm font-bold text-red-200">{error}</p>}<button onClick={onClaim} disabled={saving} className="mt-7 w-full rounded-full bg-gradient-to-r from-emerald-300 to-amber-300 px-6 py-4 text-base font-black text-[#102019] shadow-[0_6px_0_#176554] disabled:opacity-40">{saving ? "저장 중..." : mission.id === 4 ? "Project Key 완성하기" : "보상 받기 · 지도로"}</button></section></C3Shell>;
}

function Complete({ onMap, onProject }: { onMap: () => void; onProject: () => void }) {
  return <C3Shell center><section className="w-full max-w-5xl rounded-[2.3rem] border border-emerald-200/20 bg-[#102622] p-7 shadow-[0_30px_90px_rgba(0,0,0,.35)] sm:p-10"><div className="flex items-center justify-between text-xs font-black tracking-[.18em] text-emerald-200/55"><span>CHAPTER 03 REPORT</span><span>04 / COMPLETE</span></div><div className="mt-8 grid items-center gap-9 lg:grid-cols-[1fr_.85fr]"><div><Eyebrow>PROJECT KEY COMPLETE</Eyebrow><h1 className="mt-3 text-5xl font-black leading-[.95] tracking-[-.065em] sm:text-7xl">PROJECT<br /><span className="text-emerald-300">UNLOCKED</span></h1><p className="mt-5 text-base font-semibold leading-8 text-white/55">네 가지 핵심 역량을 모두 증명했습니다. 이제 팀과 함께 Project를 만들고 시작할 수 있어요.</p><div className="mt-6 grid grid-cols-2 gap-2">{MISSIONS.map((mission) => <div key={mission.id} className="rounded-xl bg-white/[.05] p-3"><small className="text-[9px] font-black text-emerald-300">MISSION 0{mission.id}</small><strong className="mt-1 block text-sm">✓ {mission.reward}</strong></div>)}</div></div><div className="flex items-center gap-4 rounded-[1.7rem] border border-emerald-200/15 bg-white/[.04] p-5"><Image src="/os-penguin.png" alt="Project 오픈을 축하하는 펭귄" width={120} height={120} className="h-28 w-28 shrink-0 object-contain" /><div className="relative rounded-2xl bg-white/[.07] p-4 before:absolute before:-left-2 before:top-1/2 before:h-4 before:w-4 before:-translate-y-1/2 before:rotate-45 before:bg-white/[.07]"><p className="text-sm font-bold leading-7 text-white/70">축하해요! Project를 시작하는 데 필요한 준비를 모두 마쳤어요. 이제 팀원들과 첫 Project를 만들어 보세요!</p></div></div></div><div className="mt-8 grid gap-3 sm:grid-cols-[auto_1fr]"><button onClick={onMap} className="rounded-full border border-white/15 px-6 py-4 text-sm font-black text-white/55">미션 다시 보기</button><button onClick={onProject} className="rounded-full bg-gradient-to-r from-emerald-300 to-amber-300 px-7 py-4 text-base font-black text-[#102019] shadow-[0_6px_0_#176554]">Project 시작하기 →</button></div></section></C3Shell>;
}

function MissionFrame({ number, title, subtitle, onBack, children }: { number: number; title: string; subtitle: string; onBack: () => void; children: ReactNode }) { return <C3Shell><div className="mx-auto w-full max-w-7xl"><header className="flex items-center justify-between"><button onClick={onBack} className="rounded-full bg-white/[.06] px-4 py-2 text-sm font-bold text-white/60">← PROJECT MAP</button><span className="text-xs font-black tracking-[.16em] text-emerald-300">CH.03 · MISSION 0{number}</span></header><div className="mt-8"><Eyebrow>PROJECT READINESS · 0{number}</Eyebrow><h1 className="mt-2 text-4xl font-black tracking-[-.055em] sm:text-6xl">{title}</h1><p className="mt-3 max-w-3xl text-base font-semibold leading-7 text-white/50">{subtitle}</p></div><div className="mt-7">{children}</div></div></C3Shell>; }
function CodePanel({ code, label = "C SOURCE CODE" }: { code: string; label?: string }) { return <section className="overflow-hidden rounded-[1.6rem] border border-white/10 bg-[#07110f]"><div className="flex items-center justify-between border-b border-white/10 bg-white/[.04] px-5 py-3"><span className="text-[10px] font-black tracking-[.18em] text-emerald-300">{label}</span><span className="flex gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-red-400" /><i className="h-2.5 w-2.5 rounded-full bg-amber-300" /><i className="h-2.5 w-2.5 rounded-full bg-emerald-300" /></span></div><pre className="max-h-[64vh] overflow-auto p-5 font-mono text-xs font-semibold leading-6 text-white/65 sm:text-sm"><code>{code}</code></pre></section>; }
function Status({ children }: { children: ReactNode }) { return <div role="status" className="mt-4 rounded-xl border border-emerald-200/10 bg-emerald-200/[.05] p-4 text-sm font-bold leading-6 text-white/60">💡 {children}</div>; }
function Eyebrow({ children }: { children: ReactNode }) { return <p className="text-xs font-black tracking-[.2em] text-emerald-300">{children}</p>; }
function C3Shell({ children, center = false }: { children: ReactNode; center?: boolean }) { return <main className={`relative min-h-screen overflow-hidden bg-[#071815] p-5 text-white sm:p-8 ${center ? "flex items-center justify-center" : ""}`}><div className="pointer-events-none absolute inset-0 opacity-20" style={{ backgroundImage: "linear-gradient(rgba(110,231,183,.12) 1px,transparent 1px),linear-gradient(90deg,rgba(110,231,183,.12) 1px,transparent 1px)", backgroundSize: "42px 42px" }} /><div className={`relative z-10 flex w-full ${center ? "justify-center" : ""}`}>{children}</div></main>; }