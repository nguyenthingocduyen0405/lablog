"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useI18n } from "../lib/i18n";
import "./paper-arena.css";

const SCENES = ["intro", "misconception", "conference", "journal", "boss", "check", "result"] as const;
type ArenaScene = (typeof SCENES)[number];
type CheckKey = "fast" | "label";

type PaperArenaProps = {
  open: boolean;
  onClose: () => void;
};

export default function PaperArena({ open, onClose }: PaperArenaProps) {
  const { l } = useI18n();
  const [scene, setScene] = useState<ArenaScene>("intro");
  const [checks, setChecks] = useState<Record<CheckKey, boolean | null>>({ fast: null, label: null });
  const [routeProgress, setRouteProgress] = useState({ conference: 0, journal: 0 });
  const dialogRef = useRef<HTMLDivElement | null>(null);

  const closeArena = useCallback(() => {
    setScene("intro");
    setChecks({ fast: null, label: null });
    setRouteProgress({ conference: 0, journal: 0 });
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusTimer = window.setTimeout(() => dialogRef.current?.focus(), 0);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeArena();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [closeArena, open]);

  if (!open) return null;

  const sceneIndex = SCENES.indexOf(scene);
  const advance = () => {
    const next = SCENES[sceneIndex + 1];
    if (next) setScene(next);
  };
  const checksCorrect = checks.fast === false && checks.label === false;

  return (
    <div className="paper-arena-backdrop fixed inset-0 z-[100] overflow-y-auto bg-stone-950/85 px-3 py-3 backdrop-blur-md sm:px-6 sm:py-6">
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="paper-arena-title" tabIndex={-1} className="paper-arena-shell relative mx-auto flex min-h-[calc(100dvh-1.5rem)] max-w-6xl flex-col overflow-hidden rounded-[1.75rem] border border-amber-200/20 bg-[#17120e] text-white shadow-2xl outline-none sm:min-h-[calc(100dvh-3rem)] sm:rounded-[2.5rem]">
        <div className="paper-arena-grid pointer-events-none absolute inset-0 opacity-30" />
        <header className="relative z-20 flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-7 sm:py-4">
          <div className="min-w-0">
            <p className="text-[9px] font-black tracking-[.22em] text-amber-300 sm:text-[10px]">PAPER CLUB · BEGINNER STORY</p>
            <h1 id="paper-arena-title" className="truncate text-lg font-black sm:text-xl">PAPER ARENA</h1>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="hidden rounded-full bg-white/[.06] px-3 py-2 text-[10px] font-black text-white/45 sm:block">{Math.min(sceneIndex + 1, 6)} / 6</span>
            <button type="button" onClick={closeArena} className="rounded-full border border-white/10 bg-white/[.06] px-3 py-2 text-xs font-black text-white/60 transition hover:bg-white/10 hover:text-white">{l("건너뛰기", "Bỏ qua", "Skip")}</button>
          </div>
        </header>

        <main className="relative z-10 flex flex-1 flex-col px-4 pb-5 pt-4 sm:px-7 sm:pb-7 sm:pt-6">
          <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col">
            <section aria-label={l("논문 출판 이야기", "Câu chuyện công bố paper", "Paper publication story")} className="relative flex min-h-[15rem] flex-1 items-center justify-center sm:min-h-[20rem]">
              {scene === "intro" && <IntroVisual />}
              {scene === "misconception" && <MisconceptionVisual />}
              {scene === "conference" && (
                <ProcessVisual
                  key="conference-route"
                  kind="conference"
                  progress={routeProgress.conference}
                  onProgress={(progress) => setRouteProgress((current) => ({ ...current, conference: progress }))}
                />
              )}
              {scene === "journal" && (
                <ProcessVisual
                  key="journal-route"
                  kind="journal"
                  progress={routeProgress.journal}
                  onProgress={(progress) => setRouteProgress((current) => ({ ...current, journal: progress }))}
                />
              )}
              {scene === "boss" && <BossVisual />}
              {scene === "check" && <CheckVisual checks={checks} onChange={(key, value) => setChecks((current) => ({ ...current, [key]: value }))} />}
              {scene === "result" && <ResultVisual />}
            </section>

            <section className="relative z-40 mx-auto w-full max-w-3xl rounded-[1.5rem] border border-white/10 bg-[#251e18]/95 p-4 shadow-xl sm:p-6">
              {scene === "intro" && (
                <SceneCopy
                  eyebrow={l("첫 연구를 마친 새내기 연구자", "MINH · NHÀ NGHIÊN CỨU MỚI", "MINH · A NEW RESEARCHER")}
                  title={l("민은 첫 연구 결과를 다른 사람들과 공유하고 싶습니다", "Minh muốn chia sẻ kết quả nghiên cứu đầu tiên", "Minh wants to share a first research result")}
                  body={l("연구자는 결과를 글로 정리한 paper를 전문가에게 검토받고 공개합니다. Journal과 Conference는 그 대표적인 두 가지 경로입니다.", "Nhà nghiên cứu viết kết quả thành một paper, gửi cho chuyên gia kiểm tra rồi công bố. Journal và Conference là hai con đường phổ biến để làm việc đó.", "Researchers write results as a paper, have specialists check it, and publish it. Journal and conference are two common paths.")}
                  action={l("두 경로 알아보기 →", "Khám phá hai con đường →", "Explore the two paths →")}
                  onAction={advance}
                />
              )}
              {scene === "misconception" && (
                <SceneCopy
                  eyebrow={l("민의 첫 번째 생각", "SUY NGHĨ ĐẦU TIÊN CỦA MINH", "MINH'S FIRST THOUGHT")}
                  title={l("“Conference가 더 빠르면, 심사도 간단한 걸까?”", "“Conference nhanh hơn, vậy review cũng đơn giản hơn?”", "“If a conference is faster, is its review simpler?”")}
                  body={l("그럴듯한 생각이지만, 속도만으로 심사의 꼼꼼함을 판단할 수는 없습니다. 민이 각 경로를 선택했을 때 어떤 일이 일어나는지 비교해 봅시다.", "Nghe có vẻ hợp lý, nhưng tốc độ không đủ để kết luận review có kỹ hay không. Hãy xem điều gì sẽ xảy ra nếu Minh chọn từng con đường.", "It sounds plausible, but speed alone does not tell us how careful the review is. Let us compare what happens on each path.")}
                  action={l("Conference 경로 보기 →", "Xem con đường Conference →", "See the conference path →")}
                  onAction={advance}
                />
              )}
              {scene === "conference" && (
                <SceneCopy
                  eyebrow="CONFERENCE · FIXED SCHEDULE"
                  title={l("빠르지만, 검토 단계를 건너뛰는 것은 아닙니다", "Nhanh, nhưng không có nghĩa là bỏ qua review", "Fast does not mean skipping review")}
                  body={l("많은 주요 CS 컨퍼런스에서는 여러 전문가가 paper를 읽고, 저자의 답변을 확인하며, 서로 토론한 뒤 정해진 날짜까지 결정을 내립니다. 세부 절차는 컨퍼런스마다 다릅니다.", "Ở nhiều conference CS lớn, nhiều chuyên gia đọc paper, xem phản hồi của tác giả và thảo luận trước khi ra quyết định đúng lịch. Quy trình cụ thể khác nhau theo từng conference.", "At many major CS conferences, multiple specialists read the paper, consider the authors' response, and discuss it before a scheduled decision. Details vary by conference.")}
                  action={l("Journal 경로와 비교 →", "So sánh với Journal →", "Compare with the journal path →")}
                  onAction={advance}
                  disabled={routeProgress.conference < 3}
                />
              )}
              {scene === "journal" && (
                <SceneCopy
                  eyebrow="JOURNAL · REVISION CYCLES"
                  title={l("Journal은 수정할 시간을 더 많이 줍니다", "Journal dành nhiều thời gian hơn cho việc chỉnh sửa", "Journals allow more time for revision")}
                  body={l("Journal은 보통 저자가 의견을 반영해 수정하고 다시 제출하는 과정을 여러 번 거칠 수 있습니다. 그래서 더 오래 걸리기 쉽지만, 모든 Journal이 항상 더 엄격하다는 뜻은 아닙니다.", "Journal thường cho phép tác giả sửa và nộp lại qua nhiều vòng. Vì vậy quá trình thường lâu hơn, nhưng điều đó không có nghĩa mọi Journal luôn nghiêm ngặt hơn.", "Journals commonly allow authors to revise and resubmit through several rounds. That often takes longer, but it does not mean every journal is always more rigorous.")}
                  action={l("진짜 적과 만나기 →", "Gặp kẻ thù thật sự →", "Meet the real enemy →")}
                  onAction={advance}
                  disabled={routeProgress.journal < 3}
                />
              )}
              {scene === "boss" && (
                <SceneCopy
                  eyebrow={l("최종 보스 · 라벨만 보고 판단하기", "FINAL BOSS · PHÁN XÉT CHỈ BẰNG NHÃN", "FINAL BOSS · JUDGING BY LABEL")}
                  title={l("Journal과 Conference는 서로의 적이 아닙니다", "Journal và Conference không phải kẻ thù của nhau", "Journal and conference are not enemies")}
                  body={l("둘은 서로 다른 일정과 강점을 가진 출판 경로입니다. 둘이 힘을 합쳐 ‘Conference는 빠르니까 대충 본다’는 오해를 물리칩니다.", "Chúng là hai con đường công bố có lịch trình và thế mạnh khác nhau. Cả hai hợp lực đánh bại định kiến “Conference nhanh nên review qua loa”.", "They are publication paths with different schedules and strengths. Together they defeat the belief that faster conferences must review carelessly.")}
                  action={l("오해를 물리치기!", "Đánh bại định kiến!", "Defeat the misconception!")}
                  onAction={advance}
                  accent="emerald"
                />
              )}
              {scene === "check" && (
                <div>
                  <p className="text-[10px] font-black tracking-[.18em] text-amber-300">{l("마지막 확인", "KIỂM TRA CUỐI", "FINAL CHECK")}</p>
                  <h2 className="mt-2 text-xl font-black sm:text-2xl">{l("두 문장을 O 또는 X로 판단하세요", "Chọn O hoặc X cho hai câu", "Mark both statements O or X")}</h2>
                  <p className="mt-2 text-sm font-medium leading-6 text-white/58">{l("두 문장을 모두 맞혀야 Paper Arena를 완료할 수 있습니다.", "Bạn cần trả lời đúng cả hai để hoàn thành Paper Arena.", "Answer both correctly to clear Paper Arena.")}</p>
                  <button type="button" disabled={!checksCorrect} onClick={advance} className="mt-4 w-full rounded-xl bg-amber-300 px-5 py-3 text-sm font-black text-stone-950 shadow-[0_5px_0_#8a6926] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-35 disabled:shadow-none">{l("결과 보기 →", "Xem kết quả →", "See the result →")}</button>
                </div>
              )}
              {scene === "result" && (
                <div className="text-center">
                  <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-300 text-2xl font-black text-emerald-950">✓</div>
                  <p className="mt-4 text-[10px] font-black tracking-[.2em] text-emerald-300">MISCONCEPTION CLEARED</p>
                  <h2 className="mt-2 text-2xl font-black sm:text-3xl">{l("빠르다고 심사가 간단한 것은 아닙니다", "Nhanh không có nghĩa là review đơn giản", "Fast does not mean simple review")}</h2>
                  <p className="mx-auto mt-3 max-w-2xl text-sm font-medium leading-6 text-white/60">{l("Journal인지 Conference인지만 보지 말고, 실제 출판 장소의 평판과 심사 절차를 확인하세요. 그 구체적인 출판 장소를 venue라고 합니다.", "Đừng chỉ nhìn nhãn Journal hay Conference. Hãy kiểm tra uy tín và quy trình review của nơi công bố cụ thể — nơi đó được gọi là venue.", "Do not rely only on the journal or conference label. Check the reputation and review process of the specific publication place — its venue.")}</p>
                  <button type="button" onClick={closeArena} className="mt-5 w-full rounded-xl bg-emerald-300 px-5 py-3 text-sm font-black text-emerald-950 shadow-[0_5px_0_#27755f] transition hover:-translate-y-0.5">{l("Paper Club 입장 →", "Vào Paper Club →", "Enter Paper Club →")}</button>
                </div>
              )}
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}

function IntroVisual() {
  const { l } = useI18n();
  return (
    <div className="grid w-full max-w-4xl items-center gap-5 sm:grid-cols-[1fr_auto_1fr]">
      <div className="paper-arena-student mx-auto text-center">
        <div className="paper-arena-student-head">•ᴗ•</div>
        <div className="paper-arena-student-body">MINH</div>
        <div className="paper-arena-first-paper">PAPER #1</div>
      </div>
      <div className="text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full border border-emerald-200/30 bg-emerald-300/10 text-2xl">🔍</div>
        <b className="mt-2 block text-xs text-emerald-200">PEER REVIEW</b>
        <p className="mt-1 max-w-44 text-[10px] font-medium leading-4 text-white/45">{l("같은 분야의 전문가가 연구를 확인", "Chuyên gia cùng lĩnh vực kiểm tra", "Specialists in the field check the work")}</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <PaperDoor kind="journal" />
        <PaperDoor kind="conference" />
      </div>
    </div>
  );
}

function MisconceptionVisual() {
  const { l } = useI18n();
  return (
    <div className="relative mx-auto grid w-full max-w-3xl grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 sm:gap-10">
      <PaperDoor kind="journal" large />
      <div className="relative z-20 min-w-0 rounded-[1.5rem] border border-white/15 bg-white p-3 text-center text-stone-950 shadow-xl sm:p-6">
        <span className="absolute -left-2 top-1/2 h-4 w-4 rotate-45 bg-white" />
        <p className="text-sm font-black leading-6 sm:text-lg">{l("Conference가 빠르면 review도 간단한 걸까?", "Conference nhanh thì review cũng đơn giản hơn?", "If a conference is fast, is its review simpler?")}</p>
        <div className="mt-3 text-3xl">🤔</div>
      </div>
      <PaperDoor kind="conference" large />
    </div>
  );
}

function PaperDoor({ kind, large = false }: { kind: "journal" | "conference"; large?: boolean }) {
  const journal = kind === "journal";
  return (
    <div className={`paper-arena-door ${journal ? "is-journal" : "is-conference"} ${large ? "is-large" : ""}`}>
      <span>{journal ? "J" : "C"}</span>
      <b>{journal ? "JOURNAL" : "CONFERENCE"}</b>
    </div>
  );
}

function ProcessVisual({ kind, progress, onProgress }: {
  kind: "journal" | "conference";
  progress: number;
  onProgress: (progress: number) => void;
}) {
  const { l } = useI18n();
  const [choice, setChoice] = useState<"correct" | "wrong" | null>(null);
  const journal = kind === "journal";
  const challenges = journal
    ? [
        {
          prompt: l("민이 Journal에 paper를 제출했습니다. 다음에는 누가 확인할까요?", "Minh đã nộp paper cho Journal. Ai sẽ kiểm tra tiếp?", "Minh submitted to a journal. Who checks it next?"),
          correct: l("편집자가 분야 전문가에게 review를 요청한다", "Editor gửi paper cho chuyên gia review", "The editor asks specialists to review it"),
          wrong: l("시간이 오래 걸리면 자동으로 출판된다", "Chờ đủ lâu thì paper tự được xuất bản", "It is published automatically after waiting"),
        },
        {
          prompt: l("Reviewer가 방법을 더 명확히 설명해 달라고 했습니다. 민은?", "Reviewer yêu cầu giải thích phương pháp rõ hơn. Minh nên làm gì?", "Reviewers ask for a clearer method. What should Minh do?"),
          correct: l("의견을 반영해 수정하고 다시 제출한다", "Chỉnh sửa theo góp ý rồi nộp lại", "Revise from the feedback and resubmit"),
          wrong: l("의견을 무시하고 그대로 출판한다", "Bỏ qua góp ý và xuất bản nguyên bản", "Ignore the feedback and publish unchanged"),
        },
        {
          prompt: l("수정본을 다시 제출했습니다. 이제 어떻게 될까요?", "Bản sửa đã được nộp lại. Điều gì xảy ra tiếp theo?", "The revision was resubmitted. What happens next?"),
          correct: l("다시 검토하고 충분하면 승인한다", "Review lại và chấp nhận khi đã đủ tốt", "Review again and accept when ready"),
          wrong: l("수정했으니 확인 없이 바로 승인한다", "Đã sửa nên chấp nhận ngay, không cần kiểm tra", "Accept immediately without checking the revision"),
        },
      ]
    : [
        {
          prompt: l("Conference 마감일까지 paper를 제출했습니다. 다음에는?", "Paper đã được nộp trước deadline Conference. Bước tiếp theo?", "The paper reached the conference deadline. What comes next?"),
          correct: l("여러 분야 전문가에게 review를 맡긴다", "Gửi cho nhiều chuyên gia trong lĩnh vực review", "Send it to multiple specialists for review"),
          wrong: l("빠른 Conference이므로 바로 출판한다", "Conference nhanh nên xuất bản ngay", "Publish immediately because conferences are fast"),
        },
        {
          prompt: l("Reviewer들이 질문과 우려를 보냈습니다. 저자는?", "Reviewer gửi câu hỏi và lo ngại. Tác giả nên làm gì?", "Reviewers sent questions and concerns. What should the authors do?"),
          correct: l("오해를 풀고 질문에 답변한다", "Giải thích hiểu nhầm và trả lời câu hỏi", "Clarify misunderstandings and answer questions"),
          wrong: l("일정이 짧으므로 질문을 무시한다", "Vì lịch ngắn nên bỏ qua câu hỏi", "Ignore the questions because the schedule is short"),
        },
        {
          prompt: l("Reviewer들의 의견이 서로 다릅니다. 결정하기 전에?", "Ý kiến reviewer khác nhau. Trước khi quyết định nên làm gì?", "The reviewers disagree. What happens before a decision?"),
          correct: l("서로 토론하고 근거를 비교한다", "Thảo luận và so sánh bằng chứng", "Discuss and compare the evidence"),
          wrong: l("무작위로 한 점수를 선택한다", "Chọn ngẫu nhiên một điểm số", "Choose one score at random"),
        },
      ];
  const challenge = challenges[progress];
  const correctFirst = progress === 1;
  const options = challenge
    ? correctFirst
      ? [{ kind: "correct" as const, label: challenge.correct }, { kind: "wrong" as const, label: challenge.wrong }]
      : [{ kind: "wrong" as const, label: challenge.wrong }, { kind: "correct" as const, label: challenge.correct }]
    : [];

  return (
    <div className="w-full max-w-4xl">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className={`text-sm font-black tracking-[.12em] ${journal ? "text-sky-200" : "text-amber-200"}`}>{journal ? "JOURNAL CHALLENGE" : "CONFERENCE CHALLENGE"}</p>
          <h2 className="mt-1 text-2xl font-black sm:text-3xl">{l("민의 paper를 다음 단계로 보내세요", "Giúp paper của Minh đi tiếp", "Move Minh's paper forward")}</h2>
        </div>
        <PaperDoor kind={kind} />
      </div>

      <div className="mt-5 grid grid-cols-[auto_1fr_auto_1fr_auto] items-center gap-2" aria-label={l("진행 단계", "Các bước tiến trình", "Process progress")}>
        {[0, 1, 2].map((step) => (
          <div key={step} className="contents">
            <span className={`grid h-10 w-10 place-items-center rounded-full border-2 text-base font-black transition ${step < progress ? "border-emerald-300 bg-emerald-300 text-emerald-950" : step === progress ? (journal ? "border-sky-200 bg-sky-300/15 text-sky-100" : "border-amber-200 bg-amber-300/15 text-amber-100") : "border-white/15 bg-white/[.04] text-white/30"}`}>{step < progress ? "✓" : step + 1}</span>
            {step < 2 && <span className={`h-1 rounded-full transition ${step < progress ? "bg-emerald-300" : "bg-white/10"}`} />}
          </div>
        ))}
      </div>

      {challenge ? (
        <div className={`mt-5 rounded-[1.5rem] border p-4 sm:p-6 ${journal ? "border-sky-200/25 bg-sky-300/[.08]" : "border-amber-200/25 bg-amber-300/[.08]"}`}>
          <p className="text-sm font-black text-white/45">DECISION {progress + 1} / 3</p>
          <h3 className="mt-2 text-lg font-black leading-7 sm:text-2xl sm:leading-8">{challenge.prompt}</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {options.map((option) => (
              <button key={option.kind} type="button" aria-pressed={choice === option.kind} onClick={() => setChoice(option.kind)} className={`rounded-xl border p-4 text-left text-sm font-bold leading-6 transition sm:text-base ${choice === option.kind ? (option.kind === "correct" ? "border-emerald-300 bg-emerald-300/15 text-emerald-100" : "border-red-300 bg-red-300/15 text-red-100") : "border-white/15 bg-white/[.05] text-white/75 hover:border-white/30"}`}>{option.label}</button>
            ))}
          </div>
          {choice && (
            <div role="status" className={`mt-4 rounded-xl p-3 text-sm font-bold leading-6 sm:text-base ${choice === "correct" ? "bg-emerald-300/10 text-emerald-200" : "bg-red-300/10 text-red-200"}`}>
              {choice === "correct"
                ? l("정답! Paper가 review gate를 통과했습니다.", "Chính xác! Paper đã vượt qua review gate.", "Correct! The paper passed this review gate.")
                : l("다시 선택하세요. 빠르거나 오래 걸리는 것 자체가 검토를 대신하지는 않습니다.", "Hãy chọn lại. Nhanh hay chậm tự nó không thể thay thế việc kiểm tra.", "Try again. Being fast or slow does not replace review.")}
            </div>
          )}
          <button type="button" disabled={choice !== "correct"} onClick={() => { onProgress(progress + 1); setChoice(null); }} className="mt-4 w-full rounded-xl bg-emerald-300 px-5 py-3 text-base font-black text-emerald-950 disabled:cursor-not-allowed disabled:opacity-35">
            {l("Paper를 다음 gate로 이동 →", "Đưa paper đến gate tiếp theo →", "Move paper to the next gate →")}
          </button>
        </div>
      ) : (
        <div className="mt-5 rounded-[1.5rem] border border-emerald-300/30 bg-emerald-300/[.08] p-6 text-center">
          <div className="text-4xl">📄✨</div>
          <h3 className="mt-3 text-2xl font-black text-emerald-100">{l("모든 review gate 통과!", "Đã vượt qua mọi review gate!", "All review gates cleared!")}</h3>
          <p className="mt-2 text-base font-bold text-white/55">{journal ? l("여러 번 수정할 수 있는 것이 Journal의 강점입니다.", "Nhiều vòng chỉnh sửa là một thế mạnh của Journal.", "Repeated revision is a journal strength.") : l("고정된 일정 안에서도 꼼꼼한 검토가 가능합니다.", "Review kỹ vẫn có thể diễn ra trong lịch trình cố định.", "Careful review can still happen within a fixed schedule.")}</p>
        </div>
      )}
    </div>
  );
}

function BossVisual() {
  return (
    <div className="grid w-full max-w-4xl grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-8">
      <SimpleFighter kind="journal" />
      <div className="paper-arena-boss text-center">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-full border-2 border-fuchsia-300/50 bg-fuchsia-500/20 text-3xl shadow-[0_0_40px_rgba(217,70,239,.45)] sm:h-28 sm:w-28 sm:text-5xl">?!</div>
        <b className="mt-2 block text-[8px] tracking-wider text-fuchsia-200 sm:text-[10px]">MISCONCEPTION</b>
        <p className="mt-2 max-w-40 text-[9px] font-bold leading-4 text-white/50 sm:text-xs">FAST = CARELESS REVIEW</p>
      </div>
      <SimpleFighter kind="conference" />
      <div className="paper-arena-combo pointer-events-none absolute inset-x-0 top-1/2 z-30 text-center">
        <span className="inline-block rounded-full border border-emerald-200/40 bg-emerald-300 px-4 py-2 text-[10px] font-black tracking-wider text-emerald-950 shadow-[0_0_30px_rgba(110,231,183,.55)] sm:text-xs">EVIDENCE COMBO!</span>
      </div>
    </div>
  );
}

function SimpleFighter({ kind }: { kind: "journal" | "conference" }) {
  const journal = kind === "journal";
  return (
    <div className={`paper-arena-character mx-auto ${journal ? "paper-arena-book" : "paper-arena-runner"}`} aria-label={journal ? "Journal" : "Conference"}>
      {journal ? <span className="paper-arena-bookmark" /> : <span className="paper-arena-wing">⚡</span>}
      <b>{journal ? "J" : "C"}</b>
      <i>{journal ? "•ᴗ•" : "•̀ᴗ•́"}</i>
    </div>
  );
}

function CheckVisual({ checks, onChange }: {
  checks: Record<CheckKey, boolean | null>;
  onChange: (key: CheckKey, value: boolean) => void;
}) {
  const { l } = useI18n();
  return (
    <div className="grid w-full max-w-4xl gap-3 sm:grid-cols-2">
      <CheckCard
        number="01"
        statement={l("Conference가 빠른 이유는 review가 항상 간단하기 때문이다.", "Conference nhanh vì review luôn đơn giản hơn.", "Conferences are fast because review is always simpler.")}
        value={checks.fast}
        onChange={(value) => onChange("fast", value)}
      />
      <CheckCard
        number="02"
        statement={l("Journal인지 Conference인지만 보면 paper의 품질을 알 수 있다.", "Chỉ nhìn nhãn Journal hay Conference là biết chất lượng paper.", "The journal or conference label alone tells us paper quality.")}
        value={checks.label}
        onChange={(value) => onChange("label", value)}
      />
    </div>
  );
}

function CheckCard({ number, statement, value, onChange }: {
  number: string;
  statement: string;
  value: boolean | null;
  onChange: (value: boolean) => void;
}) {
  const { l } = useI18n();
  const answered = value !== null;
  const correct = value === false;
  return (
    <article className={`rounded-[1.5rem] border p-4 sm:p-5 ${answered ? (correct ? "border-emerald-300/40 bg-emerald-300/[.08]" : "border-red-300/40 bg-red-300/[.08]") : "border-white/10 bg-white/[.04]"}`}>
      <p className="text-[10px] font-black tracking-[.18em] text-white/35">QUESTION {number}</p>
      <h3 className="mt-3 text-sm font-black leading-6 sm:text-base">{statement}</h3>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button type="button" aria-pressed={value === true} onClick={() => onChange(true)} className={`rounded-xl border px-4 py-3 text-lg font-black transition ${value === true ? "border-red-300 bg-red-300/15 text-red-100" : "border-white/10 bg-white/[.04] text-white/55 hover:border-white/25"}`}>O</button>
        <button type="button" aria-pressed={value === false} onClick={() => onChange(false)} className={`rounded-xl border px-4 py-3 text-lg font-black transition ${value === false ? "border-emerald-300 bg-emerald-300/15 text-emerald-100" : "border-white/10 bg-white/[.04] text-white/55 hover:border-white/25"}`}>X</button>
      </div>
      {answered && (
        <p role="status" className={`mt-3 text-xs font-bold leading-5 ${correct ? "text-emerald-200" : "text-red-200"}`}>
          {correct
            ? l("정답! 실제 심사 절차를 확인해야 합니다.", "Chính xác! Cần xem quy trình review thực tế.", "Correct! Check the actual review process.")
            : l("다시 생각해 보세요. 이 문장은 항상 참이 아닙니다.", "Hãy thử lại. Câu này không phải lúc nào cũng đúng.", "Try again. This statement is not always true.")}
        </p>
      )}
    </article>
  );
}

function ResultVisual() {
  const { l } = useI18n();
  return (
    <div className="grid w-full max-w-4xl gap-3 sm:grid-cols-2">
      <ResultCard
        color="sky"
        title="JOURNAL"
        points={[
          l("수정할 기회가 많음", "Nhiều cơ hội chỉnh sửa", "More revision opportunities"),
          l("상세한 설명에 유리", "Phù hợp trình bày chi tiết", "Room for fuller detail"),
          l("보통 더 오래 걸림", "Thường mất nhiều thời gian", "Often takes longer"),
        ]}
      />
      <ResultCard
        color="amber"
        title="CONFERENCE"
        points={[
          l("고정된 심사 일정", "Lịch review cố định", "Fixed review schedule"),
          l("빠르게 공유하고 토론", "Chia sẻ và thảo luận nhanh", "Rapid sharing and discussion"),
          l("절차는 행사마다 다름", "Quy trình khác nhau từng nơi", "Process varies by conference"),
        ]}
      />
    </div>
  );
}

function ResultCard({ color, title, points }: { color: "sky" | "amber"; title: string; points: string[] }) {
  return (
    <article className={`rounded-[1.5rem] border p-5 ${color === "sky" ? "border-sky-200/25 bg-sky-300/[.08]" : "border-amber-200/25 bg-amber-300/[.08]"}`}>
      <h3 className={`text-lg font-black ${color === "sky" ? "text-sky-200" : "text-amber-200"}`}>{title}</h3>
      <ul className="mt-3 space-y-2 text-sm font-bold text-white/65">
        {points.map((point) => <li key={point}>✓ {point}</li>)}
      </ul>
    </article>
  );
}

function SceneCopy({ eyebrow, title, body, action, onAction, accent = "amber", disabled = false }: {
  eyebrow: string;
  title: string;
  body: string;
  action: string;
  onAction: () => void;
  accent?: "amber" | "emerald";
  disabled?: boolean;
}) {
  const { l } = useI18n();
  return (
    <div>
      <p className={`text-[10px] font-black tracking-[.18em] ${accent === "emerald" ? "text-emerald-300" : "text-amber-300"}`}>{eyebrow}</p>
      <h2 className="mt-2 text-xl font-black leading-tight sm:text-2xl">{title}</h2>
      <p className="mt-2 text-sm font-medium leading-6 text-white/58">{body}</p>
      {disabled && <p className="mt-3 text-sm font-bold text-amber-200">↑ {l("위의 3개 결정을 완료하면 계속할 수 있어요.", "Hoàn thành 3 quyết định phía trên để tiếp tục.", "Complete the three decisions above to continue.")}</p>}
      <button type="button" disabled={disabled} onClick={onAction} className={`mt-4 w-full rounded-xl px-5 py-3 text-base font-black text-stone-950 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-35 disabled:shadow-none ${accent === "emerald" ? "bg-emerald-300 shadow-[0_5px_0_#27755f]" : "bg-amber-300 shadow-[0_5px_0_#8a6926]"}`}>{action}</button>
    </div>
  );
}
