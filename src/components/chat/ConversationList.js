import { Card } from "@/components/ui/card";

export default function ConversationList({
  conversations,
  activeId,
  onSelect,
  onBack,
}) {
  const hasThread = Boolean(activeId);

  return (
    <aside
      className={`h-full w-full shrink-0 flex-col rounded-card bg-surface p-4 shadow-card md:flex md:w-[320px] ${
        hasThread ? "hidden" : "flex"
      }`}
    >
      <div className="flex items-center gap-3 px-1 py-2">
        <button
          type="button"
          onClick={onBack}
          className="flex size-6 shrink-0 items-center justify-center md:hidden"
          aria-label="Back"
        >
          <img src="/icon/chevron-left.svg" alt="" className="size-6" />
        </button>
        <h1 className="text-h3">Messages</h1>
      </div>
      <div className="mt-3 flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <p className="px-2 text-body-2 text-ink-400">No conversations yet</p>
        ) : (
          conversations.map((item) => {
            const isActive = String(item.id) === String(activeId);
            const unread = item.unreadCount > 0;

            return (
              <Card
                as="button"
                key={item.id}
                type="button"
                interactive
                onClick={() => onSelect(item.id)}
                className={`mb-2 flex w-full items-center gap-3 rounded-card p-3 text-left ${
                  isActive ? "bg-primary-50" : "hover:bg-primary-50/60"
                }`}
              >
                <span className="relative size-12 shrink-0 overflow-hidden rounded-full bg-primary-50">
                  {item.otherUser?.avatarUrl ? (
                    <img
                      src={item.otherUser.avatarUrl}
                      alt=""
                      className="size-full object-cover"
                    />
                  ) : (
                    <img
                      src="/icon/user.svg"
                      alt=""
                      className="absolute inset-3 size-6 object-contain"
                    />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1">
                    <span className="min-w-0 flex-1 truncate font-bold text-ink-900">
                      {item.otherUser?.name || "User"}
                    </span>
                    {unread ? (
                      <span className="size-2.5 shrink-0 rounded-full bg-primary" />
                    ) : null}
                  </span>
                  <span className="mt-0.5 block truncate text-caption text-ink-400">
                    {item.lastMessage || "Start a conversation!"}
                  </span>
                </span>
              </Card>
            );
          })
        )}
      </div>
    </aside>
  );
}
