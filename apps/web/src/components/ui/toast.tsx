"use client";

import { Portal } from "@ark-ui/react/portal";
import {
  Toast as ArkToast,
  Toaster as ArkToaster,
  createToaster,
  useToastContext,
} from "@ark-ui/react/toast";
import {
  CircleAlertIcon,
  CircleCheckIcon,
  InfoIcon,
  TriangleAlertIcon,
  XIcon,
} from "lucide-react";
import type React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

export const useToast = useToastContext;

const baseToaster = createToaster({
  placement: "bottom-end",
  overlap: true,
  max: 3,
});

export type ToastId = string;

interface ToastCallOptions {
  /**
   * Reuse an existing toast instead of creating a new one. Matches the
   * sonner-style `toast.success(msg, { id })` pattern used across the app:
   * when the id is still visible the toast is updated in place, otherwise
   * a new toast is created.
   */
  id?: ToastId | number;
  description?: React.ReactNode;
  /**
   * `Infinity` (or a `loading` type) keeps the toast up until it is
   * updated/dismissed — zag persists those instead of auto-dismissing.
   */
  duration?: number;
  action?: { label: string; onClick: () => void };
  closable?: boolean;
}

type ToastType = "loading" | "success" | "error" | "warning" | "info";

function upsert(type: ToastType, message: React.ReactNode, options?: ToastCallOptions): ToastId {
  const { id, description, duration, action, closable } = options ?? {};
  const key = id != null ? String(id) : undefined;
  if (key != null && baseToaster.isVisible(key)) {
    baseToaster.update(key, { title: message, description, type, duration, action, closable });
    return key;
  }
  return baseToaster.create({ title: message, description, type, duration, action, closable });
}

/**
 * App-wide toast API. Rendered by the Ark UI `<Toaster />`, but called with
 * the sonner-style signatures the codebase already uses:
 * `toast.loading(msg, opts)` returns an id, and
 * `toast.success/error/warning/info(msg, { id, ... })` updates that toast
 * in place. Native store methods (`create`, `update`, `dismiss`, `remove`)
 * pass straight through.
 */
export const toast = Object.assign(baseToaster, {
  loading: (message: React.ReactNode, options?: ToastCallOptions): ToastId =>
    upsert("loading", message, options),
  success: (message: React.ReactNode, options?: ToastCallOptions): ToastId =>
    upsert("success", message, options),
  error: (message: React.ReactNode, options?: ToastCallOptions): ToastId =>
    upsert("error", message, options),
  warning: (message: React.ReactNode, options?: ToastCallOptions): ToastId =>
    upsert("warning", message, options),
  info: (message: React.ReactNode, options?: ToastCallOptions): ToastId =>
    upsert("info", message, options),
});

interface ToasterProps
  extends Omit<
    React.ComponentProps<typeof ArkToaster>,
    "toaster" | "children"
  > {
  /**
   * Toaster instance
   */
  toaster?: ReturnType<typeof createToaster>;
}

export const Toaster = (props: ToasterProps) => {
  const { toaster: toasterInstance = toast, className, style, ...rest } = props;

  return (
    <Portal>
      <ArkToaster
        className={cn(
          "",
          "data-[align=center]:left-[calc(var(--viewport-offset-right)/2)]!",
          "sm:data-[align=center]:w-full",
          className
        )}
        style={{ ...style } as React.CSSProperties}
        toaster={toasterInstance}
        {...rest}
      >
        {(toastItem) => <ToastItem toast={toastItem} />}
      </ArkToaster>
    </Portal>
  );
};

const TOAST_ICONS = {
  loading: <Spinner />,
  success: <CircleCheckIcon />,
  error: <CircleAlertIcon />,
  info: <InfoIcon />,
  warning: <TriangleAlertIcon />,
} as const;

interface ToastItemProps extends React.ComponentProps<typeof ArkToast.Root> {
  /**
   * The toast item data
   */
  toast: ArkToast.Options;
}

export const ToastItem = (props: ToastItemProps) => {
  const { toast: toastData, className, ...rest } = props;

  const ToastIcon = toastData.type
    ? TOAST_ICONS[toastData.type as keyof typeof TOAST_ICONS]
    : null;

  const isExplicitClosable = toastData.closable === false;

  return (
    <ArkToast.Root
      className={cn(
        "z-(--z-index) translate-x-(--x) translate-y-(--y)",
        "relative",
        "w-max ",
        "px-3.5 py-3",
        "flex items-start justify-between gap-1.5",
        "bg-popover",
        "select-none text-card-foreground text-sm",
        "rounded-lg border shadow-lg/5",
        "scale-(--scale) opacity-(--opacity)",
        "transition-all duration-250 will-change-[translate,opacity,scale]",
        "ease-[cubic-bezier(0.21,1.02,0.73,1)]",
        "data-[state=closed]:transition-[translate,scale,opacity]",
        "data-[state=closed]:duration-[300ms,300ms,150ms]",
        "data-[state=closed]:ease-[cubic-bezier(0.06,0.71,0.55,1)]",
        "motion-reduce:transition-none!",
        className
      )}
      data-slot="toast"
      {...rest}
    >
      <div className="flex items-start gap-1.5">
        <div
          className={cn(
            "in-data-[type=warning]:text-warning",
            "in-data-[type=success]:text-success",
            "in-data-[type=error]:text-destructive",
            "in-data-[type=info]:text-info",
            "[&_svg]:pointer-events-none [&_svg]:h-lh [&_svg]:w-4 [&_svg]:shrink-0"
          )}
          data-slot="toast-icon"
        >
          {ToastIcon}
        </div>

        <div className="flex flex-col gap-0.5">
          <ArkToast.Title
            className="font-medium text-sm"
            data-slot="toast-title"
          >
            {toastData.title}
          </ArkToast.Title>

          {toastData.description && (
            <ArkToast.Description
              className="text-muted-foreground text-sm"
              data-slot="toast-description"
            >
              {toastData.description}
            </ArkToast.Description>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {toastData.action && (
          <ArkToast.ActionTrigger
            asChild
            data-slot="toast-action-trigger"
            onClick={toastData.action.onClick}
          >
            <Button size="sm" variant="secondary">
              {toastData.action.label}
            </Button>
          </ArkToast.ActionTrigger>
        )}

        {!isExplicitClosable && (
          <ArkToast.CloseTrigger asChild data-slot="toast-close-trigger">
            <Button
              aria-label="Close"
              className="opacity-64 hover:opacity-100"
              size="icon-xs"
              variant="ghost"
            >
              <XIcon />
            </Button>
          </ArkToast.CloseTrigger>
        )}
      </div>
    </ArkToast.Root>
  );
};
