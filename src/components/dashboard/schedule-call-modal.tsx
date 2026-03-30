"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar, X, Clock, Phone, User, MessageSquareText, CheckCircle2 } from "lucide-react";
import { useToast } from "@/components/ui/toast";

interface ScheduleCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenantId: string | null;
  onScheduled?: () => void;
}

export function ScheduleCallModal({ isOpen, onClose, tenantId, onScheduled }: ScheduleCallModalProps) {
  const { toast } = useToast();
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [purpose, setPurpose] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  if (!isOpen) return null;

  const handleSchedule = async () => {
    if (!phone || !date || !time || !tenantId) return;

    setSaving(true);
    try {
      const scheduledAt = new Date(`${date}T${time}`).toISOString();

      const res = await fetch("/api/voice/scheduled", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId,
          customerPhone: phone.startsWith("+") ? phone : `+${phone}`,
          customerName: name || undefined,
          purpose: purpose || undefined,
          scheduledAt,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to schedule call");

      setDone(true);
      toast(`Call scheduled — ${name || phone} on ${date} at ${time}`, "success");
      onScheduled?.();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to schedule", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setPhone("");
    setName("");
    setPurpose("");
    setDate("");
    setTime("");
    setDone(false);
    onClose();
  };

  // Minimum date = today
  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
              <Calendar className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Schedule a Call</h2>
              <p className="text-xs text-gray-500">AI agent will call at the scheduled time</p>
            </div>
          </div>
          <button onClick={handleClose} className="rounded-lg p-2 hover:bg-white/60 transition-colors">
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        <div className="p-6">
          {!done ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  <Phone className="inline h-4 w-4 mr-1.5 text-gray-400" />
                  Phone Number *
                </label>
                <Input
                  placeholder="+260 97X XXX XXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="h-11"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  <User className="inline h-4 w-4 mr-1.5 text-gray-400" />
                  Customer Name
                </label>
                <Input
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-11"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    <Calendar className="inline h-4 w-4 mr-1.5 text-gray-400" />
                    Date *
                  </label>
                  <Input
                    type="date"
                    min={today}
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="h-11"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    <Clock className="inline h-4 w-4 mr-1.5 text-gray-400" />
                    Time *
                  </label>
                  <Input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="h-11"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  <MessageSquareText className="inline h-4 w-4 mr-1.5 text-gray-400" />
                  Purpose
                </label>
                <Input
                  placeholder="Appointment reminder, follow-up, etc."
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  className="h-11"
                />
              </div>

              <Button
                onClick={handleSchedule}
                disabled={!phone || !date || !time || saving}
                className="w-full h-11 gap-2 bg-blue-600 hover:bg-blue-700 text-white"
              >
                {saving ? (
                  <><Clock className="h-4 w-4 animate-spin" /> Scheduling...</>
                ) : (
                  <><Calendar className="h-4 w-4" /> Schedule Call</>
                )}
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center py-8 space-y-4">
              <div className="h-20 w-20 rounded-full bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="h-10 w-10 text-emerald-600" />
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold text-gray-900">Call Scheduled</p>
                <p className="text-sm text-gray-500">
                  {name || phone} — {date} at {time}
                </p>
              </div>
              <Button onClick={handleClose} variant="outline" className="gap-2">
                Close
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
