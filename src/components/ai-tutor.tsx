"use client";

import { useEffect, useRef, useState } from "react";
import Markdown from "markdown-to-jsx";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

export function AITutor({
  courseCode,
  paperContent,
}: {
  courseCode: string;
  paperContent: string;
}) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content: `I can see the predicted paper for **${courseCode || "this course"}**. Ask me to solve or explain any question.`,
    },
  ]);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open, loading]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next,
          courseContext: courseCode,
          paperContext: paperContent,
        }),
      });
      const data = await res.json();
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: res.ok ? data.text : `**Error:** ${data.error ?? "unavailable"}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-40 no-print">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="rounded-pill bg-cobalt px-5 py-3 text-body-sm font-medium text-white transition-colors hover:bg-cobalt-hover"
        >
          Ask the tutor
        </button>
      ) : (
        <div className="flex h-[460px] w-[360px] flex-col rounded-card border border-hairline bg-graphite sm:w-[400px]">
          <div className="flex items-center justify-between border-b border-hairline px-4 py-3">
            <span className="text-body-sm text-ivory">Tutor</span>
            <button onClick={() => setOpen(false)} className="text-ash hover:text-ivory">
              Close
            </button>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`max-w-[85%] rounded-input px-3 py-2 text-body-sm ${
                  m.role === "user"
                    ? "ml-auto bg-cobalt text-white"
                    : "bg-obsidian text-ivory [&_code]:font-mono [&_pre]:overflow-x-auto"
                }`}
              >
                {m.role === "user" ? m.content : <Markdown>{m.content}</Markdown>}
              </div>
            ))}
            {loading && <p className="text-caption text-faint">Thinking…</p>}
            <div ref={endRef} />
          </div>
          <form onSubmit={send} className="border-t border-hairline p-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="How do I solve Q2(b)?"
              className="w-full rounded-input border border-hairline bg-obsidian px-3 py-2 text-body-sm text-ivory placeholder:text-faint focus:border-cobalt focus:outline-none"
            />
          </form>
        </div>
      )}
    </div>
  );
}
