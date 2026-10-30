"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Phone } from "lucide-react";
import ChatBubble from "./ChatBubble";
import ChatInput from "./ChatInput";
import { getOwnerBooking, getSitterBooking } from "@/lib/api";
import { getUser } from "@/lib/auth";
import {
  formatThreadBookingBanner,
  getConversationBookingId,
  getConversationPhone,
  getConversationPresence,
  toTelHref,
} from "@/lib/chatThread";

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
  const isSitter = Boolean(getUser()?.isSitter);
  const bookingId = getConversationBookingId(conversation);
  const [bookingRecord, setBookingRecord] = useState(
    conversation?.booking && typeof conversation.booking === "object"
      ? conversation.booking
      : null,
  );

  useEffect(() => {
    const nested =
      conversation?.booking && typeof conversation.booking === "object"
        ? conversation.booking
        : null;
    if (nested && (nested.id || nested.title || nested.start_date || nested.startDate)) {
      setBookingRecord(nested);
      return;
    }

    if (!bookingId) {
      setBookingRecord(null);
      return;
    }

    let cancelled = false;
    const load = isSitter ? getSitterBooking(bookingId) : getOwnerBooking(bookingId);
    load
      .then((data) => {
        if (!cancelled) setBookingRecord(data ?? null);
      })
      .catch(() => {
        if (!cancelled) setBookingRecord(null);
      });

    return () => {
      cancelled = true;
    };
  }, [bookingId, conversation, isSitter]);

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

  const booking = formatThreadBookingBanner(bookingRecord, { isSitter });
  const phone = getConversationPhone(conversation, bookingRecord);
  const callHref = toTelHref(phone);
  const presence = getConversationPresence(conversation);

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
              {presence ? (
                <p className="text-caption text-success">{presence}</p>
              ) : null}
            </div>
          </div>
          {callHref ? (
            <a
              href={callHref}
              className="inline-flex h-10 items-center gap-2 rounded-full border border-line-strong px-4 text-caption font-bold"
            >
              <Phone className="size-4" aria-hidden />
              Call
            </a>
          ) : null}
        </div>

        {booking ? (
          <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl bg-primary-50 px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-label text-ink-900">{booking.title}</p>
              {booking.summary ? (
                <p className="mt-0.5 truncate text-caption text-ink-600">
                  {booking.summary}
                </p>
              ) : null}
            </div>
            <Link
              href={booking.href}
              className="shrink-0 text-caption font-bold text-primary"
            >
              View booking ›
            </Link>
          </div>
        ) : null}
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
