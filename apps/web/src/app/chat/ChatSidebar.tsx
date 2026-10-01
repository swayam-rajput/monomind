"use client";

import { useEffect, useRef, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Add01Icon,
  Delete02Icon,
  SidebarLeftIcon,
  Search01Icon,
  MoreHorizontalIcon,
  Cancel01Icon,
} from "@hugeicons/core-free-icons";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { toast } from "@/components/ui/toast";

interface SessionSummary {
  id: string;
  lastActivityAt: string;
  preview: string;
}

interface ChatSidebarProps {
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  refreshKey: number;
}

export function ChatSidebar({
  activeSessionId,
  onSelectSession,
  onNewChat,
  refreshKey,
}: ChatSidebarProps) {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [search, setSearch] = useState("");
  const { toggleSidebar } = useSidebar();

  useEffect(() => {
    fetch("/api/chat/session")
      .then((r) => r.json())
      .then((body: { sessions: SessionSummary[] }) => setSessions(body.sessions))
      .catch(() => setSessions([]));
  }, [refreshKey]);

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation();

    const res = await fetch(`/api/chat/session/${id}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      toast.error("Failed to delete chat.");
      return;
    }

    setSessions((prev) => prev.filter((s) => s.id !== id));

    if (activeSessionId === id) {
      onNewChat();
    }
  }

  const filtered = search.trim()
    ? sessions.filter((s) =>
        s.preview.toLowerCase().includes(search.trim().toLowerCase())
      )
    : sessions;

  const groups =  [["Chats", filtered] as const];
  return (
    <>
      <Sidebar
        collapsible="offcanvas"
        className="border-r border-sidebar-border bg-sidebar"
      >
        {/* Header */}
        <SidebarHeader className="gap-2.5 px-3 pt-3 pb-2">
          {/* Top row */}
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <button
                onClick={toggleSidebar}
                className="flex size-7 items-center justify-center rounded-lg text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
                title="Collapse sidebar"
              >
                <HugeiconsIcon
                  icon={SidebarLeftIcon}
                  strokeWidth={2}
                  className="size-4"
                />
              </button>

              <span className="text-sm font-semibold tracking-tight text-sidebar-foreground">
                Chats
              </span>
            </div>
          </div>

          {/* New Thread */}
          <button
            onClick={onNewChat}
            className="flex w-full items-center justify-between rounded-xl border border-sidebar-border/60 bg-sidebar-accent/50 px-3 py-2 text-xs font-medium text-sidebar-foreground transition-all duration-150 hover:border-sidebar-border hover:bg-sidebar-accent hover:shadow-xs active:scale-[0.99]"
          >
            <span className="flex items-center gap-2">
              <HugeiconsIcon
                icon={Add01Icon}
                strokeWidth={2.5}
                className="size-3.5 text-sidebar-foreground/70"
              />
              <span>New Thread</span>
            </span>
          </button>

          {/* Search */}
          <div className="relative flex items-center rounded-xl border border-sidebar-border/40 bg-sidebar-accent/30 px-3 py-1.5 transition-colors focus-within:border-sidebar-border focus-within:bg-sidebar-accent/60">
            <HugeiconsIcon
              icon={Search01Icon}
              strokeWidth={2}
              className="size-3.5 shrink-0 text-sidebar-foreground/40"
            />

            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search threads"
              className="w-full bg-transparent px-2 text-xs text-sidebar-foreground placeholder:text-sidebar-foreground/35 outline-none"
            />

            {search && (
              <button
                onClick={() => setSearch("")}
                className="flex size-4 items-center justify-center text-sidebar-foreground/40 hover:text-sidebar-foreground"
              >
                <HugeiconsIcon
                  icon={Cancel01Icon}
                  strokeWidth={2}
                  className="size-3"
                />
              </button>
            )}
          </div>
        </SidebarHeader>

        {/* Chat Session Groups */}
        <hr />
        <SidebarContent className="overflow-visible px-2 pt-1 ">
          {filtered.length === 0 && (
            <p className="px-3 py-4 text-center text-xs text-sidebar-foreground/35">
              {search ? "No threads found." : "No chats yet."}
            </p>
          )}

          {groups.map(([label, items]) => (
            <SidebarGroup
              key={label}
              className="relative z-0 overflow-visible px-0 py-1"
            >
              <SidebarGroupLabel className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
                {label}
              </SidebarGroupLabel>

              <SidebarGroupContent className="overflow-visible">
                <SessionList
                  sessions={items}
                  activeSessionId={activeSessionId}
                  onSelectSession={onSelectSession}
                  onDelete={handleDelete}
                />
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </SidebarContent>
      </Sidebar>

      {/* Floating single toggle button shown ONLY when sidebar is collapsed */}
      <CollapsedSidebarButton />
    </>
  );
}

/** Shown ONLY when the sidebar is collapsed. */
function CollapsedSidebarButton() {
  const { toggleSidebar, state, isMobile } = useSidebar();

  if (state !== "collapsed" || isMobile) {
    return null;
  }

  return (
    <button
      onClick={toggleSidebar}
      aria-label="Open sidebar"
      title="Open sidebar"
      className="fixed left-3 top-[50px] z-40 flex size-8 items-center justify-center rounded-lg border border-border bg-background text-foreground/70 shadow-xs transition-all duration-150 hover:bg-accent hover:text-foreground hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <HugeiconsIcon
        icon={SidebarLeftIcon}
        strokeWidth={2}
        className="size-4 shrink-0"
      />
    </button>
  );
}

function SessionList({
  sessions,
  activeSessionId,
  onSelectSession,
  onDelete,
}: {
  sessions: SessionSummary[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onDelete: (e: React.MouseEvent, id: string) => void;
}) {
  return (
    <SidebarMenu className="gap-0.5 overflow-visible">
      {sessions.map((s) => (
        <SessionItem
          key={s.id}
          session={s}
          isActive={s.id === activeSessionId}
          onSelect={() => onSelectSession(s.id)}
          onDelete={(e) => onDelete(e, s.id)}
        />
      ))}
    </SidebarMenu>
  );
}

function SessionItem({
  session,
  isActive,
  onSelect,
  onDelete,
}: {
  session: SessionSummary;
  isActive: boolean;
  onSelect: () => void;
  onDelete: (e: React.MouseEvent) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;

    function onOutside(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", onOutside);

    return () => {
      document.removeEventListener("mousedown", onOutside);
    };
  }, [menuOpen]);

  return (
    <SidebarMenuItem
      className={[
        "group/item relative overflow-visible px-0 py-0",
        menuOpen ? "z-[999]" : "z-0",
      ].join(" ")}
    >
      {/* Session button */}
      <button
        onClick={onSelect}
        onKeyDown={(e) => e.key === "Enter" && onSelect()}
        className={[
          "flex w-full min-w-0 items-center rounded-lg px-3 py-2 text-left text-xs transition-colors",
          isActive
            ? "bg-sidebar-accent font-medium text-sidebar-foreground"
            : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
        ].join(" ")}
      >
        <span className="block min-w-0 flex-1 truncate pr-5 text-xs">
          {session.preview || "New conversation"}
        </span>
      </button>

      {/* Options / Delete menu */}
      <div
        ref={menuRef}
        className={[
          "absolute right-2 top-1/2 z-50 -translate-y-1/2",
          "opacity-0 transition-opacity group-hover/item:opacity-100",
          menuOpen ? "opacity-100" : "",
        ].join(" ")}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen((v) => !v);
          }}
          className="flex size-5 items-center justify-center rounded-md text-sidebar-foreground/40 hover:bg-sidebar-accent hover:text-sidebar-foreground"
          title="Options"
        >
          <HugeiconsIcon
            icon={MoreHorizontalIcon}
            strokeWidth={2}
            className="size-3.5"
          />
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-full z-[9999] mt-1 min-w-[120px] overflow-hidden rounded-xl border border-sidebar-border bg-sidebar p-1 shadow-lg backdrop-blur-md">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(false);
                onDelete(e);
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-red-400 transition-colors hover:bg-sidebar-accent"
            >
              <HugeiconsIcon
                icon={Delete02Icon}
                strokeWidth={2}
                className="size-3.5 shrink-0"
              />
              Delete
            </button>
          </div>
        )}
      </div>
    </SidebarMenuItem>
  );
}
