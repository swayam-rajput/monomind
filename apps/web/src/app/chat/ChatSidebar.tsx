"use client";

import { useEffect, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon, Delete02Icon } from "@hugeicons/core-free-icons";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface SessionSummary {
  id: string;
  createdAt: string;
  preview: string;
}

interface ChatSidebarProps {
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  /** Bumped by the parent whenever a message is sent, so the sidebar refreshes previews/order. */
  refreshKey: number;
}

export function ChatSidebar({ activeSessionId, onSelectSession, onNewChat, refreshKey }: ChatSidebarProps) {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);

  useEffect(() => {
    fetch("/api/chat/session")
      .then((r) => r.json())
      .then((body: { sessions: SessionSummary[] }) => setSessions(body.sessions))
      .catch(() => setSessions([]));
  }, [refreshKey]);

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    const res = await fetch(`/api/chat/session/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Failed to delete chat.");
      return;
    }
    setSessions((prev) => prev.filter((s) => s.id !== id));
    if (activeSessionId === id) onNewChat();
  }

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader>
        <Button variant="outline" size="sm" onClick={onNewChat} className="w-full justify-start gap-2">
          <HugeiconsIcon icon={Add01Icon} strokeWidth={2} className="size-4" />
          New chat
        </Button>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Chats</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {sessions.length === 0 && (
                <p className="px-2 py-1.5 text-xs text-muted-foreground">No chats yet.</p>
              )}
              {sessions.map((s) => (
                <SidebarMenuItem key={s.id}>
                  <SidebarMenuButton asChild isActive={s.id === activeSessionId}>
                    {/* A plain div, not a nested <button> - SidebarMenuAction below
                        renders its own <button> as a sibling. Nesting two <button>
                        elements is invalid HTML and browsers swallow/misroute the
                        inner click, which was silently breaking the delete action.
                        min-w-0 is required here: flex children default to
                        min-width:auto, which refuses to shrink below the text's
                        natural width - without it, `truncate` on the span below
                        never kicks in and a long preview just grows the sidebar. */}
                    <div role="button" tabIndex={0} onClick={() => onSelectSession(s.id)} className="min-w-0">
                      <span className="block truncate">{s.preview}</span>
                    </div>
                  </SidebarMenuButton>
                  <SidebarMenuAction showOnHover onClick={(e) => handleDelete(e, s.id)}>
                    <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} className="text-red-400 size-4" />
                  </SidebarMenuAction>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
