"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AlertTriangle, Info, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./dialog";
import { Button } from "./button";
import { Input } from "./input";
import { cn } from "@/lib/utils";

/**
 * In-app replacements for window.confirm and window.prompt.
 *
 * The native dialogs render as a browser chrome popup - "firstinqueue.com
 * says" - which reads as a phishing prompt, cannot be styled, and blocks the
 * whole tab. Both hooks return a promise so call sites keep the same shape:
 *
 *   if (!(await confirm({ title: "Delete this website?" }))) return;
 *   const phone = await prompt({ title: "Mobile money number" });
 */

type Tone = "danger" | "warning" | "info";

export interface ConfirmOptions {
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: Tone;
}

export interface PromptOptions {
  title: string;
  description?: ReactNode;
  label?: string;
  placeholder?: string;
  defaultValue?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  inputMode?: "text" | "tel" | "email" | "numeric";
  /** Return an error string to keep the dialog open, or null when valid. */
  validate?: (value: string) => string | null;
}

interface DialogContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  prompt: (options: PromptOptions) => Promise<string | null>;
}

const DialogContext = createContext<DialogContextValue | null>(null);

export function useConfirm() {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error("useConfirm must be used within DialogProvider");
  return ctx.confirm;
}

export function usePrompt() {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error("usePrompt must be used within DialogProvider");
  return ctx.prompt;
}

const toneIcon: Record<Tone, typeof AlertTriangle> = {
  danger: Trash2,
  warning: AlertTriangle,
  info: Info,
};

const toneIconStyles: Record<Tone, string> = {
  danger: "bg-red-50 text-red-600",
  warning: "bg-amber-50 text-amber-600",
  info: "bg-blue-50 text-blue-600",
};

const toneButton: Record<Tone, string> = {
  danger: "bg-red-600 hover:bg-red-700 text-white",
  warning: "bg-amber-600 hover:bg-amber-700 text-white",
  info: "bg-emerald-600 hover:bg-emerald-700 text-white",
};

type Request =
  | { kind: "confirm"; options: ConfirmOptions; resolve: (v: boolean) => void }
  | { kind: "prompt"; options: PromptOptions; resolve: (v: string | null) => void };

export function DialogProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<Request | null>(null);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setRequest({ kind: "confirm", options, resolve });
    });
  }, []);

  const prompt = useCallback((options: PromptOptions) => {
    return new Promise<string | null>((resolve) => {
      setValue(options.defaultValue ?? "");
      setError(null);
      setRequest({ kind: "prompt", options, resolve });
    });
  }, []);

  useEffect(() => {
    if (request?.kind === "prompt") {
      const id = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(id);
    }
  }, [request]);

  // A dismissed dialog must still settle its promise, otherwise the caller
  // hangs forever on the `await`.
  const dismiss = useCallback(() => {
    setRequest((current) => {
      if (current?.kind === "confirm") current.resolve(false);
      if (current?.kind === "prompt") current.resolve(null);
      return null;
    });
  }, []);

  const accept = useCallback(() => {
    if (!request) return;

    if (request.kind === "confirm") {
      request.resolve(true);
      setRequest(null);
      return;
    }

    const trimmed = value.trim();
    const validationError = request.options.validate
      ? request.options.validate(trimmed)
      : trimmed
        ? null
        : "This field is required.";

    if (validationError) {
      setError(validationError);
      return;
    }

    request.resolve(trimmed);
    setRequest(null);
  }, [request, value]);

  const options = request?.options;
  const tone: Tone = (request?.kind === "confirm" && request.options.tone) || "info";
  const Icon = toneIcon[tone];

  return (
    <DialogContext.Provider value={{ confirm, prompt }}>
      {children}
      <Dialog open={request !== null} onOpenChange={(open) => !open && dismiss()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-start gap-3 text-left">
              <div
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                  request?.kind === "prompt" ? toneIconStyles.info : toneIconStyles[tone]
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0 space-y-1.5">
                <DialogTitle>{options?.title ?? ""}</DialogTitle>
                {options?.description && (
                  <DialogDescription>{options.description}</DialogDescription>
                )}
              </div>
            </div>
          </DialogHeader>

          {request?.kind === "prompt" && (
            <div className="space-y-1.5">
              {request.options.label && (
                <label className="text-sm font-medium text-gray-700">
                  {request.options.label}
                </label>
              )}
              <Input
                ref={inputRef}
                value={value}
                inputMode={request.options.inputMode ?? "text"}
                placeholder={request.options.placeholder}
                onChange={(e) => {
                  setValue(e.target.value);
                  if (error) setError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    accept();
                  }
                }}
                className={cn(error && "border-red-300 focus-visible:ring-red-400")}
              />
              {error && <p className="text-xs text-red-600">{error}</p>}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={dismiss}>
              {options?.cancelLabel ?? "Cancel"}
            </Button>
            <Button
              onClick={accept}
              className={request?.kind === "confirm" ? toneButton[tone] : undefined}
            >
              {options?.confirmLabel ?? (request?.kind === "prompt" ? "Continue" : "Confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DialogContext.Provider>
  );
}
