"use client";

import { useEffect, useMemo, useState } from "react";
import { authenticatedFetch } from "@/lib/api";
import { API_BASE_URL } from "@/lib/config";

type MessageItem = {
  id: string;
  sender: "team" | "you";
  body: string;
  type?: string;
  doc_id?: string | null;
  created_at: string;
};

type ThreadItem = {
  id: string;
  subject: string;
  unread: boolean;
  latest_preview: string;
  latest_at: string;
  messages: MessageItem[];
};

type RawMessage = {
  id?: string | number;
  sender?: string;
  body?: string;
  message_body?: string;
  type?: string;
  doc_id?: string | number | null;
  created_at?: string;
  timestamp?: string;
};

type RawThread = {
  id?: string | number;
  thread_id?: string | number;
  subject?: string;
  unread?: boolean;
  latest_message_preview?: string;
  latest_preview?: string;
  latest_message_at?: string;
  latest_at?: string;
  messages?: RawMessage[];
};

type ThreadsResponse = {
  threads?: RawThread[];
  unread_count?: number;
};

type MessageCentreProps = {
  applicationId: number;
  onUploadDocumentRequest: (docId: string) => void;
  onUnreadCountChange?: (count: number) => void;
};

const toIso = (value?: string) => {
  if (!value) return "";
  const time = new Date(value);
  return Number.isNaN(time.getTime()) ? "" : time.toISOString();
};

const normalizeSender = (value?: string): "team" | "you" => {
  const sender = (value || "").toLowerCase();
  if (sender.includes("you") || sender.includes("customer") || sender.includes("user")) {
    return "you";
  }
  return "team";
};

const normalizeMessage = (raw: RawMessage): MessageItem => ({
  id: String(raw.id || `${Math.random()}`),
  sender: normalizeSender(raw.sender),
  body: String(raw.body || raw.message_body || ""),
  type: raw.type ? String(raw.type) : undefined,
  doc_id: raw.doc_id != null ? String(raw.doc_id) : null,
  created_at: toIso(raw.created_at || raw.timestamp) || new Date(0).toISOString(),
});

const normalizeThread = (raw: RawThread): ThreadItem => {
  const messages = Array.isArray(raw.messages) ? raw.messages.map(normalizeMessage) : [];
  messages.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  const latest = messages[messages.length - 1];
  return {
    id: String(raw.id || raw.thread_id || `${Math.random()}`),
    subject: String(raw.subject || "Message thread"),
    unread: Boolean(raw.unread),
    latest_preview: String(raw.latest_preview || raw.latest_message_preview || latest?.body || ""),
    latest_at: toIso(raw.latest_at || raw.latest_message_at || latest?.created_at) || new Date(0).toISOString(),
    messages,
  };
};

export function MessageCentre({ applicationId, onUploadDocumentRequest, onUnreadCountChange }: MessageCentreProps) {
  const [threads, setThreads] = useState<ThreadItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [replyStatus, setReplyStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const selectedThread = useMemo(
    () => threads.find((thread) => thread.id === selectedThreadId) || null,
    [selectedThreadId, threads]
  );

  const unreadCount = useMemo(() => threads.filter((thread) => thread.unread).length, [threads]);

  const fetchThreads = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await authenticatedFetch(`${API_BASE_URL}/applications/${applicationId}/messages`, {
        method: "GET",
      });

      if (!response.ok) {
        throw new Error("Failed to load messages.");
      }

      const raw = (await response.json()) as unknown;
      const payload: ThreadsResponse =
        raw && typeof raw === "object" && "data" in (raw as Record<string, unknown>)
          ? (((raw as { data?: ThreadsResponse }).data || {}) as ThreadsResponse)
          : ((raw as ThreadsResponse) || {});
      const list: ThreadItem[] = Array.isArray(payload.threads) ? payload.threads.map(normalizeThread) : [];
      list.sort((a: ThreadItem, b: ThreadItem) => new Date(b.latest_at).getTime() - new Date(a.latest_at).getTime());
      setThreads(list);
      if (!selectedThreadId && list.length > 0) {
        setSelectedThreadId(list[0].id);
      }
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Failed to load messages.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchThreads();
    const intervalId = window.setInterval(() => {
      void fetchThreads();
    }, 60000);
    return () => {
      window.clearInterval(intervalId);
    };
  }, [applicationId]);

  useEffect(() => {
    onUnreadCountChange?.(unreadCount);
  }, [onUnreadCountChange, unreadCount]);

  const openThread = async (threadId: string) => {
    setSelectedThreadId(threadId);
    setReplyStatus(null);

    const current = threads.find((thread) => thread.id === threadId);
    if (!current?.unread) return;

    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/applications/${applicationId}/messages/${threadId}/read`, {
        method: "PATCH",
      });
      if (!response.ok) {
        return;
      }
      setThreads((currentThreads) =>
        currentThreads.map((thread) =>
          thread.id === threadId
            ? {
                ...thread,
                unread: false,
              }
            : thread
        )
      );
    } catch {
      // Keep UI responsive even if mark-read fails.
    }
  };

  const sendReply = async () => {
    if (!selectedThreadId || !replyText.trim()) return;

    try {
      setSendingReply(true);
      setReplyStatus(null);

      const response = await authenticatedFetch(`${API_BASE_URL}/applications/${applicationId}/messages`, {
        method: "POST",
        body: JSON.stringify({
          thread_id: selectedThreadId,
          message_body: replyText.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send message.");
      }

      setReplyText("");
      setReplyStatus({ type: "success", message: "Message sent successfully." });
      await fetchThreads();
    } catch (sendError) {
      setReplyStatus({
        type: "error",
        message: sendError instanceof Error ? sendError.message : "Failed to send message.",
      });
    } finally {
      setSendingReply(false);
    }
  };

  return (
    <div className="rounded-3xl border border-border bg-white p-5 sm:p-6 shadow-sm">
      <h3 className="text-xl font-heading font-bold text-primary">Communication Centre</h3>
      <p className="mt-1 text-sm text-slate-600">All document requests and case communication stay inside this portal.</p>

      <div className="mt-4 grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-4 rounded-2xl border border-slate-200 bg-[#fcfdff]">
          <div className="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-primary">Threads</div>
          <div className="max-h-[420px] overflow-auto">
            {loading && threads.length === 0 ? (
              <p className="px-4 py-3 text-sm text-slate-500">Loading messages...</p>
            ) : null}
            {error ? <p className="px-4 py-3 text-sm text-rose-700">{error}</p> : null}
            {!loading && threads.length === 0 && !error ? (
              <p className="px-4 py-3 text-sm text-slate-500">No messages yet.</p>
            ) : null}
            {threads.map((thread) => (
              <button
                key={thread.id}
                type="button"
                onClick={() => void openThread(thread.id)}
                className={`w-full border-b border-slate-100 px-4 py-3 text-left hover:bg-slate-50 ${
                  selectedThreadId === thread.id ? "bg-bg-blue" : "bg-transparent"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-800">{thread.subject}</p>
                  {thread.unread ? (
                    <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-700">Unread</span>
                  ) : null}
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-slate-600">{thread.latest_preview}</p>
                <p className="mt-2 text-[11px] text-slate-500">{new Date(thread.latest_at).toLocaleString()}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-8 rounded-2xl border border-slate-200 bg-white">
          {selectedThread ? (
            <>
              <div className="border-b border-slate-200 px-4 py-3">
                <p className="font-semibold text-primary">{selectedThread.subject}</p>
              </div>
              <div className="max-h-[360px] space-y-3 overflow-auto px-4 py-4">
                {selectedThread.messages.map((message) => (
                  <div key={message.id} className="rounded-xl border border-slate-200 bg-[#fcfdff] px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {message.sender === "team" ? "FlyOCI Team" : "You"}
                      </p>
                      <p className="text-xs text-slate-500">{new Date(message.created_at).toLocaleString()}</p>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{message.body}</p>
                    {message.type === "doc-request" && message.doc_id ? (
                      <div className="mt-3">
                        <button
                          type="button"
                          onClick={() => onUploadDocumentRequest(message.doc_id || "")}
                          className="inline-flex items-center rounded-lg border border-primary/30 bg-white px-3 py-2 text-xs font-semibold text-primary hover:bg-bg-blue"
                        >
                          Upload Document
                        </button>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>

              <div className="border-t border-slate-200 px-4 py-4">
                <label className="mb-2 block text-sm font-semibold text-primary">Reply</label>
                <textarea
                  value={replyText}
                  onChange={(event) => setReplyText(event.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary/40"
                  placeholder="Type your message..."
                />
                {replyStatus ? (
                  <p className={`mt-2 text-xs ${replyStatus.type === "success" ? "text-emerald-700" : "text-rose-700"}`}>
                    {replyStatus.message}
                  </p>
                ) : null}
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => void sendReply()}
                    disabled={sendingReply || !replyText.trim()}
                    className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {sendingReply ? "Sending..." : "Send"}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="px-4 py-8 text-sm text-slate-500">Select a thread to view messages.</div>
          )}
        </div>
      </div>
    </div>
  );
}
