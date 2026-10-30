import Link from "next/link";
import { useEffect, useRef } from "react";
import { Phone } from "lucide-react";
import ChatBubble from "./ChatBubble";
import ChatInput from "./ChatInput";

function bookingContext(conversation) {
  return {
    title: conversation?.booking?.title || "Dog walking · #PS-2502",
    summary: conversation?.booking?.summary || "Mon–Fri 08:00 · Walk 3 live now",
    href: conversation?.booking?.href || "/owner/bookings",
  };
}

export default function ChatThread({
  conversation,
  messages,
  currentUserId,
  draft,
  onDraftChange,
  onSend,
  onClose,
}) {
  const bottomRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    const root = listRef.current;
    const end = bottomRef.current;
    if (!root || !end) return;

    const distance = root.scrollHeight - root.scrollTop - root.clientHeight;
    if (distance < 160 || messages.length <= 1) {
      root.scrollTop = root.scrollHeight;
    }
  }, [messages.length]);

  if (!conversation) {
    return (
      <section className="flex min-h-0 flex-1 flex-col rounded-card bg-surface shadow-card">
        <div className="flex flex-1 flex-col items-center justify-center gap-4">
          <p className="text-4xl" aria-hidden>🐾</p>
          <p className="text-body-1 text-ink-400">Start a conversation!</p>
        </div>
      </section>
    );
  }

  const booking = bookingContext(conversation);

  return (
    <section className="flex min-h-0 flex-1 flex-col rounded-card bg-surface shadow-card">
      <header className="border-b border-line px-4 md:px-6">
        <div className="flex h-16 items-center justify-between md:h-20">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex size-6 shrink-0 items-center justify-center md:hidden"
              aria-label="Back to conversations"
            >
              <img src="/icon/chevron-left.svg" alt="" className="size-6" />
            </button>
            <span className="relative size-10 overflow-hidden rounded-full bg-primary-50">
              {conversation.otherUser?.avatarUrl ? (
                <img
                  src={conversation.otherUser.avatarUrl}
                  alt=""
                  className="size-full object-cover"
                />
              ) : (
                <img
                  src="/icon/user.svg"
                  alt=""
                  className="absolute inset-2 size-6 object-contain"
                />
              )}
            </span>
            <div className="min-w-0">
              <h2 className="truncate text-h4">
                {conversation.otherUser?.name || "User"}
              </h2>
              <p className="text-caption text-success">Online · replies in ~5 min</p>
            </div>
          </div>
          <button
            type="button"
            className="hidden h-10 items-center gap-2 rounded-full border border-line-strong px-4 text-caption font-bold md:inline-flex"
          >
            <Phone className="size-4" aria-hidden />
            Call
          </button>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-2xl bg-primary-50 px-4 py-3 mb-4">
          <div className="min-w-0">
            <p className="truncate text-label text-ink-900">🐕 {booking.title}</p>
            <p className="mt-0.5 truncate text-caption text-ink-600">{booking.summary}</p>
          </div>
          <Link
            href={booking.href}
            className="shrink-0 text-caption font-bold text-primary"
          >
            View booking ›
          </Link>
        </div>
      </header>

      <div
        ref={listRef}
        className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-5 md:px-6"
      >
        {messages.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4">
            <p className="text-4xl" aria-hidden>🐾</p>
            <p className="text-body-1 text-ink-400">Start a conversation!</p>
          </div>
        ) : (
          messages.map((message) => (
            <ChatBubble
              key={message.clientKey ?? message.id}
              message={message}
              isMine={String(message.senderId) === String(currentUserId)}
              avatarUrl={conversation.otherUser?.avatarUrl}
            />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <ChatInput
        value={draft}
        onChange={onDraftChange}
        onSend={onSend}
      />
    </section>
  );
}
