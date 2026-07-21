"use client";

import { useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

export default function PaperReader({ file, title }: { file: string; title: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [containerWidth, setContainerWidth] = useState(620);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setContainerWidth(entry.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const pageWidth = Math.max(260, containerWidth - 24) * zoom;

  return <div className="flex h-[62vh] flex-col overflow-hidden rounded-xl bg-[#302920] lg:h-[calc(100vh-9rem)]">
    <div className="flex min-h-12 items-center justify-between gap-2 border-b border-white/10 bg-[#100d0a] px-3 text-xs font-black text-white/60">
      <div className="flex items-center gap-2"><button disabled={pageNumber <= 1} onClick={() => setPageNumber((value) => Math.max(1, value - 1))} className="rounded-lg bg-white/[.07] px-3 py-2 disabled:opacity-25">←</button><span>{pageNumber} / {numPages || "–"}</span><button disabled={!numPages || pageNumber >= numPages} onClick={() => setPageNumber((value) => Math.min(numPages, value + 1))} className="rounded-lg bg-white/[.07] px-3 py-2 disabled:opacity-25">→</button></div>
      <span className="hidden tracking-[.12em] text-amber-300/60 sm:block">PAPER READER · CONTENTS HIDDEN</span>
      <div className="flex items-center gap-2"><button disabled={zoom <= 0.75} onClick={() => setZoom((value) => Math.max(.75, value - .25))} className="rounded-lg bg-white/[.07] px-3 py-2 disabled:opacity-25">−</button><span>{Math.round(zoom * 100)}%</span><button disabled={zoom >= 1.75} onClick={() => setZoom((value) => Math.min(1.75, value + .25))} className="rounded-lg bg-white/[.07] px-3 py-2 disabled:opacity-25">＋</button></div>
    </div>
    <div ref={containerRef} className="flex-1 overflow-auto bg-[#4a4339] p-3">
      <Document file={file} onLoadSuccess={({ numPages: loadedPages }) => { setNumPages(loadedPages); setPageNumber((value) => Math.min(value, loadedPages)); }} loading={<p className="grid min-h-80 place-items-center text-sm font-black text-amber-100/50">PAPER LOADING...</p>} error={<p className="grid min-h-80 place-items-center px-6 text-center text-sm font-bold text-red-200">Paper를 불러오지 못했습니다. 다시 시도해 주세요.</p>}>
        <Page pageNumber={pageNumber} width={pageWidth} renderAnnotationLayer={false} renderTextLayer={false} className="mx-auto w-fit overflow-hidden rounded-sm shadow-[0_12px_35px_rgba(0,0,0,.35)]" />
      </Document>
    </div>
    <p className="border-t border-white/10 bg-[#100d0a] px-3 py-2 text-center text-[10px] font-bold text-white/35">{title}</p>
  </div>;
}