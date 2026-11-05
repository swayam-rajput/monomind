"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogPopup,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogPanel,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox} from "@/components/ui/checkbox";
import { CheckboxGroup } from "@/components/ui/checkbox-group";
import { Label } from "@/components/ui/label";
import type { ParsedConversation } from "@monome/types";

interface ChatSelectionDialogProps {
  conversations: ParsedConversation[];
  isOpen: boolean;
  onClose: () => void;
  onImport: (
    selectedConversations: ParsedConversation[]
  ) => Promise<void>;
  isImporting?: boolean;
}

export function ChatSelectionDialog({
  conversations,
  isOpen,
  onClose,
  onImport,
  isImporting = false,
}: ChatSelectionDialogProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const selectedCount = selectedIds.length;
  const isAllSelected =
    conversations.length > 0 &&
    selectedIds.length === conversations.length;

  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(
        conversations.map((_, index) => index.toString())
      );
    }
  };

  const handleImport = async () => {
    if (selectedIds.length === 0) return;

    const selectedConversations = selectedIds
      .map((id) => conversations[parseInt(id, 10)])
      .filter(Boolean);

    await onImport(selectedConversations);
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
    >
      <DialogPopup className="">
        <DialogHeader>
          <DialogTitle>
            Select Conversations to Import
          </DialogTitle>

          <DialogDescription>
            Found {conversations.length} conversations in the
            ChatGPT export. Choose which ones you&apos;d like to import.
          </DialogDescription>
        </DialogHeader>

        <DialogPanel>
          <div className="space-y-4">
            {/* Select all */}
            <div className="flex items-center justify-between border-b pb-4">
              <Label className="flex cursor-pointer items-center gap-2">
                <Checkbox
                  checked={isAllSelected}
                  onCheckedChange={handleSelectAll}
                />

                <span className="text-sm font-medium">
                  Select All
                </span>
              </Label>

              <span className="text-sm text-muted-foreground">
                {selectedCount} of {conversations.length} selected
              </span>
            </div>

            {/* Conversations */}
            <CheckboxGroup
              value={selectedIds}
              onValueChange={setSelectedIds}
              aria-label="Select conversations to import"
            >
              <div className="space-y-1">
                {conversations.map((conversation, index) => {
                  const id = index.toString();
                  const messageCount = conversation.messages.length;
                  const preview =
                    conversation.messages[0]?.content?.slice(0, 100) || "";

                  return (
                    <Label
                      key={id}
                      className="flex cursor-pointer items-center gap-3 rounded-lg p-2 transition-colors hover:bg-muted/50"
                    >
                      <Checkbox value={id} />

                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {conversation.title}
                          </p>

                          {preview && (
                            <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                              {preview}...
                            </p>
                          )}
                        </div>

                        <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium tabular-nums text-muted-foreground">
                          {messageCount} message
                          {messageCount === 1 ? "" : "s"}
                        </span>
                      </div>
                    </Label>
                  );
                })}
              </div>
            </CheckboxGroup>
          </div>
        </DialogPanel>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={isImporting}
          >
            Cancel
          </Button>

          <Button
            onClick={handleImport}
            disabled={selectedCount === 0 || isImporting}
          >
            {isImporting
              ? "Importing..."
              : `Import ${selectedCount} conversation${
                  selectedCount === 1 ? "" : "s"
                }`}
          </Button>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}