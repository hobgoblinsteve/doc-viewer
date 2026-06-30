"use client";

import { useState, useEffect, useRef, useCallback } from "react";

const SAMPLE_TEXT = `The mitochondria is the powerhouse of the cell. It generates most of the cell's supply of adenosine triphosphate (ATP), used as a source of chemical energy. In addition to supplying cellular energy, mitochondria are involved in other tasks, such as signaling, cellular differentiation, and cell death, as well as maintaining control of the cell cycle and cell growth.

The nucleus is perhaps the most critical organelle in the eukaryotic cell. It houses the genetic material in the form of chromosomes and is the site of DNA replication and RNA synthesis. The nucleus is enclosed by a double membrane called the nuclear envelope, which is perforated by nuclear pores that allow the transport of molecules in and out.

Photosynthesis is a process used by plants and other organisms to convert light energy into chemical energy that can be stored and later released to fuel the organism's activities. This process involves the absorption of carbon dioxide and water using sunlight, producing glucose and oxygen as byproducts. Chlorophyll, the green pigment found in chloroplasts, is fundamental to this process.

Osmosis is the movement of water molecules through a semipermeable membrane from a region of lower solute concentration to a region of higher solute concentration. This phenomenon is crucial for maintaining cell turgor pressure, nutrient absorption in the intestines, and the functioning of kidneys in filtering blood.`;

interface DictionaryResult {
  word: string;
  phonetic?: string;
  meanings: { partOfSpeech: string; definitions: { definition: string }[] }[];
}

interface WikiResult {
  title: string;
  extract: string;
}

type LookupResult =
  | { type: "dictionary"; data: DictionaryResult }
  | { type: "wiki"; data: WikiResult };

interface Popover {
  x: number;
  y: number;
  text: string;
  state: "loading" | "result" | "error";
  result?: LookupResult;
  errorMsg?: string;
}

async function fetchDefinition(word: string): Promise<DictionaryResult> {
  const res = await fetch(
    `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word.toLowerCase())}`
  );
  if (!res.ok) throw new Error("not found");
  const json = await res.json();
  return json[0] as DictionaryResult;
}

async function fetchWikiSummary(phrase: string): Promise<WikiResult> {
  // Strip parentheticals and punctuation, normalize whitespace
  const cleaned = phrase
    .replace(/\(.*?\)/g, "")
    .replace(/[^a-zA-Z0-9\s'-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const res = await fetch(
    `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(cleaned)}`,
    { headers: { Accept: "application/json" } }
  );
  if (!res.ok) throw new Error("not found");
  const json = await res.json();
  if (json.type === "disambiguation" || !json.extract) throw new Error("ambiguous");
  return { title: json.title, extract: json.extract };
}

async function lookup(text: string): Promise<LookupResult> {
  const words = text.trim().split(/\s+/);
  if (words.length === 1) {
    const word = words[0].replace(/[^a-zA-Z'-]/g, "");
    const data = await fetchDefinition(word);
    return { type: "dictionary", data };
  }
  // Multi-word: try Wikipedia
  const data = await fetchWikiSummary(text);
  return { type: "wiki", data };
}

export default function Home() {
  const [popover, setPopover] = useState<Popover | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseUp = useCallback(async () => {
    const selection = window.getSelection();
    const text = selection?.toString().trim();
    if (!text || text.length < 2) return;

    const range = selection!.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const containerRect = containerRef.current!.getBoundingClientRect();

    const x = rect.left + rect.width / 2 - containerRect.left;
    const y = rect.top - containerRect.top - 8;

    setPopover({ x, y, text, state: "loading" });

    try {
      const result = await lookup(text);
      setPopover((p) => p && { ...p, state: "result", result });
    } catch {
      setPopover((p) =>
        p && { ...p, state: "error", errorMsg: `No definition found for "${text}"` }
      );
    }
  }, []);

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setPopover(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const paragraphs = SAMPLE_TEXT.split("\n\n");

  return (
    <div className="min-h-screen bg-stone-50 py-16 px-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900 mb-1">Document Viewer</h1>
          <p className="text-sm text-gray-500">
            Highlight any word to get its definition.
          </p>
        </div>

        {/* Document */}
        <div
          ref={containerRef}
          className="relative bg-white rounded-xl border border-gray-200 shadow-sm px-10 py-10 leading-8 text-gray-800 text-[15px] select-text"
          onMouseUp={handleMouseUp}
        >
          {paragraphs.map((para, i) => (
            <p key={i} className={i < paragraphs.length - 1 ? "mb-6" : ""}>
              {para}
            </p>
          ))}

          {/* Popover */}
          {popover && (
            <div
              ref={popoverRef}
              className="absolute z-50 w-72 bg-white border border-gray-200 rounded-xl shadow-xl text-sm"
              style={{
                left: Math.max(8, Math.min(popover.x - 144, 10000)),
                top: popover.y,
                transform: "translateY(-100%)",
              }}
            >
              {/* Arrow */}
              <div
                className="absolute left-1/2 -translate-x-1/2 bottom-0 translate-y-full w-0 h-0"
                style={{
                  borderLeft: "7px solid transparent",
                  borderRight: "7px solid transparent",
                  borderTop: "7px solid #e5e7eb",
                }}
              />
              <div
                className="absolute left-1/2 -translate-x-1/2 bottom-0 translate-y-[calc(100%-1px)] w-0 h-0"
                style={{
                  borderLeft: "6px solid transparent",
                  borderRight: "6px solid transparent",
                  borderTop: "6px solid white",
                }}
              />

              <div className="p-4">
                {popover.state === "loading" && (
                  <div className="flex items-center gap-2 text-gray-400 py-1">
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Looking up definition…
                  </div>
                )}

                {popover.state === "error" && (
                  <div className="text-gray-500 text-xs">{popover.errorMsg}</div>
                )}

                {popover.state === "result" && popover.result && (
                  <>
                    {popover.result.type === "dictionary" && (
                      <>
                        <div className="flex items-baseline gap-2 mb-3">
                          <span className="font-semibold text-gray-900 text-base">
                            {popover.result.data.word}
                          </span>
                          {popover.result.data.phonetic && (
                            <span className="text-xs text-gray-400">{popover.result.data.phonetic}</span>
                          )}
                        </div>
                        <div className="space-y-3 max-h-52 overflow-y-auto">
                          {popover.result.data.meanings.slice(0, 2).map((m, i) => (
                            <div key={i}>
                              <span className="inline-block text-[10px] font-medium uppercase tracking-wide text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded mb-1">
                                {m.partOfSpeech}
                              </span>
                              <p className="text-gray-700 text-xs leading-5">
                                {m.definitions[0].definition}
                              </p>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                    {popover.result.type === "wiki" && (
                      <>
                        <div className="flex items-baseline gap-2 mb-3">
                          <span className="font-semibold text-gray-900 text-base">
                            {popover.result.data.title}
                          </span>
                          <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">Wikipedia</span>
                        </div>
                        <p className="text-gray-700 text-xs leading-5 max-h-52 overflow-y-auto">
                          {popover.result.data.extract}
                        </p>
                      </>
                    )}
                  </>
                )}
              </div>

              <button
                onClick={() => setPopover(null)}
                className="absolute top-2 right-2 text-gray-300 hover:text-gray-500 transition-colors"
                aria-label="Close"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          Definitions from the Free Dictionary API
        </p>
      </div>
    </div>
  );
}
