"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { Loader2, CheckCircle2, AlertTriangle, Eye, EyeOff } from "lucide-react";

type InvalidReason = "missing" | "not_found" | "already_used" | "expired" | "error";

// Four failures, four different things for the reader to do next. They used to
// share one sentence, which told nobody anything.
const INVALID_COPY: Record<InvalidReason, { title: string; headline: string; detail: string }> = {
  missing: {
    title: "Incomplete invite link",
    headline: "This link is missing its invite code.",
    detail: "Copy the full link from your invitation email - some mail apps cut long links short.",
  },
  not_found: {
    title: "Invite link superseded",
    headline: "This link was replaced by a newer invitation.",
    detail: "Check your inbox for the most recent invite email, or ask your admin to resend.",
  },
  already_used: {
    title: "You've already joined",
    headline: "This invite has already been used.",
    detail: "Your account is active - sign in with the password you set.",
  },
  expired: {
    title: "Invite expired",
    headline: "This invite expired after 72 hours.",
    detail: "Ask your team admin to send a new invitation.",
  },
  error: {
    title: "Couldn't check this invite",
    headline: "We couldn't reach the server to check this link.",
    detail: "Check your connection and reload the page.",
  },
};

function AcceptInviteForm() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token") || "";

  const [status, setStatus] = useState<"loading" | "valid" | "invalid" | "done">("loading");
  const [reason, setReason] = useState<InvalidReason>("not_found");
  const [agentName, setAgentName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [existingUser, setExistingUser] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) { setReason("missing"); setStatus("invalid"); return; }
    fetch(`/api/team/invite/accept?token=${token}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.valid) {
          setAgentName(d.name || "");
          setBusinessName(d.businessName || "");
          setExistingUser(!!d.existingUser);
          setStatus("valid");
        } else {
          setReason((d.reason as InvalidReason) || "not_found");
          setStatus("invalid");
        }
      })
      .catch(() => { setReason("error"); setStatus("invalid"); });
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    // An existing account keeps its own password - nothing to set, nothing to check.
    if (!existingUser) {
      if (password.length < 8) { setError("Password must be at least 8 characters"); return; }
      if (password !== confirm) { setError("Passwords do not match"); return; }
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/team/invite/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(existingUser ? { token } : { token, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to accept invite");
      setStatus("done");
      setTimeout(
        () => router.push(data.existingAccount ? "/login" : "/dashboard/conversations"),
        2000
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle2 className="h-6 w-6 text-emerald-600" />
          </div>
          <CardTitle className="text-xl">
            {status === "loading" && "Checking invite..."}
            {status === "valid" && `Welcome, ${agentName}!`}
            {status === "invalid" && INVALID_COPY[reason].title}
            {status === "done" && "You're all set!"}
          </CardTitle>
          {status === "valid" && (
            <CardDescription>
              You've been invited to join <strong>{businessName}</strong> on First in Queue.
              {existingUser
                ? " You already have an account - accept to add this workspace to it."
                : " Set a password to activate your account."}
            </CardDescription>
          )}
        </CardHeader>

        <CardContent>
          {status === "loading" && (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          )}

          {status === "invalid" && (
            <div className="space-y-3">
              <div className="flex items-start gap-3 rounded-lg bg-red-50 border border-red-200 p-4">
                <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-800">{INVALID_COPY[reason].headline}</p>
                  <p className="text-xs text-red-600 mt-1">{INVALID_COPY[reason].detail}</p>
                </div>
              </div>
              {reason === "already_used" && (
                <Link href="/login" className="block">
                  <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
                    Sign in
                  </Button>
                </Link>
              )}
            </div>
          )}

          {status === "done" && (
            <div className="flex flex-col items-center py-6 text-center gap-3">
              <CheckCircle2 className="h-10 w-10 text-emerald-500" />
              <p className="text-sm text-gray-600">
                {existingUser
                  ? `Added to ${businessName}. Sign in with your existing password...`
                  : "Account activated! Redirecting to your dashboard..."}
              </p>
              <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
            </div>
          )}

          {status === "valid" && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {!existingUser && (
              <>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Password</label>
                <div className="relative">
                  <Input
                    type={showPw ? "text" : "password"}
                    placeholder="At least 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Confirm Password</label>
                <Input
                  type={showPw ? "text" : "password"}
                  placeholder="Repeat password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                />
              </div>
              </>
              )}
              {error && (
                <p className="text-xs text-red-600 flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  {error}
                </p>
              )}
              <Button
                type="submit"
                disabled={submitting}
                className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {existingUser ? "Accept Invitation" : "Activate My Account"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense>
      <AcceptInviteForm />
    </Suspense>
  );
}
