"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Workflow,
  Plus,
  Trash2,
  Edit2,
  Save,
  X,
  MessageSquare,
  HelpCircle,
  Zap,
  GitBranch,
  UserCheck,
  GripVertical,
  BookOpen,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useToast } from "@/components/ui/toast";
import type { ConversationFlow, FlowStep } from "@/types";

const STEP_TYPES = [
  { value: "message", label: "Send Message", icon: MessageSquare, desc: "Bot sends a text to the customer" },
  { value: "question", label: "Ask Question", icon: HelpCircle, desc: "Bot asks and waits for a reply" },
  { value: "action", label: "Action", icon: Zap, desc: "Trigger booking, lead capture, etc." },
  { value: "handoff", label: "Hand off to Human", icon: UserCheck, desc: "Escalate to a human agent" },
] as const;

const ACTION_OPTIONS = [
  { value: "book_appointment", label: "Book Appointment" },
  { value: "capture_lead", label: "Capture Lead" },
  { value: "send_confirmation", label: "Send Confirmation" },
];

function stepIcon(type: FlowStep["type"]) {
  const map = { message: MessageSquare, question: HelpCircle, action: Zap, condition: GitBranch, handoff: UserCheck };
  const Icon = map[type] || MessageSquare;
  return <Icon className="h-4 w-4" />;
}

function emptyStep(): FlowStep {
  return { id: Date.now().toString(), type: "message", content: "" };
}

function emptyFlow(): ConversationFlow {
  return { id: Date.now().toString(), name: "", trigger: "", steps: [emptyStep()] };
}

interface EditingFlow extends ConversationFlow {
  addToKB?: boolean;
}

export default function FlowsPage() {
  const { toast } = useToast();
  const [flows, setFlows] = useState<ConversationFlow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [existingConfig, setExistingConfig] = useState<Record<string, unknown>>({});

  // Editor state
  const [editing, setEditing] = useState<EditingFlow | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [expandedFlow, setExpandedFlow] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/tenants");
        if (!res.ok) return;
        const tenants = await res.json();
        if (tenants.length > 0) {
          setTenantId(tenants[0].id);
          setExistingConfig(tenants[0].config || {});
          setFlows(tenants[0].config?.flows || []);
        }
      } catch { /* silent */ }
      setLoading(false);
    }
    load();
  }, []);

  const openNew = () => {
    setEditing({ ...emptyFlow(), addToKB: false });
    setIsNew(true);
  };

  const openEdit = (flow: ConversationFlow) => {
    setEditing({ ...flow, steps: flow.steps.map((s) => ({ ...s })), addToKB: false });
    setIsNew(false);
  };

  const closeEditor = () => { setEditing(null); };

  const saveFlows = async (updatedFlows: ConversationFlow[], kbAddition?: { topic: string; content: string }) => {
    if (!tenantId) return;
    setSaving(true);
    try {
      const newConfig: Record<string, unknown> = { ...existingConfig, flows: updatedFlows };
      if (kbAddition) {
        const kb = (existingConfig.knowledge_base as Array<{ id: string; topic: string; content: string; keywords: string[] }>) || [];
        newConfig.knowledge_base = [
          ...kb.filter((k) => k.id !== `flow_${kbAddition.topic}`),
          { id: `flow_${Date.now()}`, topic: kbAddition.topic, content: kbAddition.content, keywords: [] },
        ];
      }
      const res = await fetch(`/api/tenants/${tenantId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: newConfig }),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setFlows(updated.config?.flows || updatedFlows);
      setExistingConfig(updated.config || newConfig);
      toast("Flows saved", "success");
    } catch {
      toast("Failed to save", "error");
    }
    setSaving(false);
  };

  const handleSaveEditing = async () => {
    if (!editing) return;
    if (!editing.name.trim() || !editing.trigger.trim()) {
      toast("Name and trigger are required", "error");
      return;
    }
    const { addToKB, ...flow } = editing;
    const cleanFlow: ConversationFlow = {
      ...flow,
      steps: flow.steps.filter((s) => s.content?.trim() || s.type === "handoff"),
    };
    const updatedFlows = isNew
      ? [...flows, cleanFlow]
      : flows.map((f) => (f.id === cleanFlow.id ? cleanFlow : f));

    const kbAddition = addToKB
      ? {
          topic: cleanFlow.name,
          content: `Flow triggered by: "${cleanFlow.trigger}". Steps: ${cleanFlow.steps.map((s) => s.content || s.type).join(" → ")}`,
        }
      : undefined;

    await saveFlows(updatedFlows, kbAddition);
    closeEditor();
  };

  const handleDelete = async (id: string) => {
    const updatedFlows = flows.filter((f) => f.id !== id);
    await saveFlows(updatedFlows);
  };

  const updateStep = (idx: number, patch: Partial<FlowStep>) => {
    if (!editing) return;
    setEditing({
      ...editing,
      steps: editing.steps.map((s, i) => (i === idx ? { ...s, ...patch } : s)),
    });
  };

  const addStep = () => {
    if (!editing) return;
    setEditing({ ...editing, steps: [...editing.steps, emptyStep()] });
  };

  const removeStep = (idx: number) => {
    if (!editing) return;
    setEditing({ ...editing, steps: editing.steps.filter((_, i) => i !== idx) });
  };

  const moveStep = (idx: number, dir: -1 | 1) => {
    if (!editing) return;
    const steps = [...editing.steps];
    const target = idx + dir;
    if (target < 0 || target >= steps.length) return;
    [steps[idx], steps[target]] = [steps[target], steps[idx]];
    setEditing({ ...editing, steps });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-6 w-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Conversation Flows</h1>
          <p className="text-gray-500 mt-1 text-sm">Flows run when a customer message matches the trigger</p>
        </div>
        <Button onClick={openNew} className="gap-2 bg-emerald-600 hover:bg-emerald-700 shrink-0">
          <Plus className="h-4 w-4" />
          New Flow
        </Button>
      </div>

      {/* Flow Editor (inline panel) */}
      {editing && (
        <Card className="border-emerald-300 shadow-md">
          <CardContent className="p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">{isNew ? "New Flow" : "Edit Flow"}</h2>
              <Button variant="ghost" size="sm" onClick={closeEditor}><X className="h-4 w-4" /></Button>
            </div>

            {/* Name + Trigger */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Flow Name</Label>
                <Input
                  placeholder="e.g. Appointment Booking"
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Trigger Phrase</Label>
                <Input
                  placeholder="e.g. book, appointment, schedule"
                  value={editing.trigger}
                  onChange={(e) => setEditing({ ...editing, trigger: e.target.value })}
                />
                <p className="text-[11px] text-gray-400">Customer message must contain this word/phrase</p>
              </div>
            </div>

            {/* Steps */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs uppercase tracking-wide text-gray-500">Steps</Label>
                <Button variant="ghost" size="sm" onClick={addStep} className="h-7 gap-1 text-xs text-emerald-700">
                  <Plus className="h-3 w-3" /> Add Step
                </Button>
              </div>

              {editing.steps.map((step, idx) => (
                <div key={step.id} className="flex gap-2 items-start bg-gray-50 rounded-lg p-3">
                  {/* Reorder */}
                  <div className="flex flex-col gap-0.5 pt-1 shrink-0">
                    <button onClick={() => moveStep(idx, -1)} disabled={idx === 0} className="text-gray-300 hover:text-gray-500 disabled:opacity-20">
                      <ChevronUp className="h-3.5 w-3.5" />
                    </button>
                    <GripVertical className="h-3.5 w-3.5 text-gray-300" />
                    <button onClick={() => moveStep(idx, 1)} disabled={idx === editing.steps.length - 1} className="text-gray-300 hover:text-gray-500 disabled:opacity-20">
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Step number */}
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold mt-1">
                    {idx + 1}
                  </div>

                  {/* Type selector */}
                  <div className="w-44 shrink-0">
                    <Select
                      value={step.type}
                      onValueChange={(v) => updateStep(idx, { type: v as FlowStep["type"] })}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STEP_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value} className="text-xs">
                            <span className="flex items-center gap-1.5">{t.label}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    {step.type === "handoff" ? (
                      <p className="text-xs text-gray-400 italic mt-1.5">Transfers to a human agent</p>
                    ) : step.type === "action" ? (
                      <Select
                        value={step.action || ""}
                        onValueChange={(v) => updateStep(idx, { action: v })}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Select action" />
                        </SelectTrigger>
                        <SelectContent>
                          {ACTION_OPTIONS.map((a) => (
                            <SelectItem key={a.value} value={a.value} className="text-xs">{a.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        className="h-8 text-xs"
                        placeholder={step.type === "question" ? "e.g. What date works for you?" : "e.g. Great! Let me help you with that."}
                        value={step.content || ""}
                        onChange={(e) => updateStep(idx, { content: e.target.value })}
                      />
                    )}
                  </div>

                  {/* Remove */}
                  {editing.steps.length > 1 && (
                    <button onClick={() => removeStep(idx)} className="text-gray-300 hover:text-red-400 mt-1.5 shrink-0">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* KB toggle */}
            <div className="flex items-center gap-3 rounded-lg border border-dashed border-emerald-200 bg-emerald-50/50 p-3">
              <BookOpen className="h-4 w-4 text-emerald-600 shrink-0" />
              <div className="flex-1">
                <p className="text-xs font-medium text-gray-800">Add to Knowledge Base</p>
                <p className="text-[11px] text-gray-500">The AI will reference this flow when answering related questions</p>
              </div>
              <Switch
                checked={editing.addToKB || false}
                onCheckedChange={(v) => setEditing({ ...editing, addToKB: v })}
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={closeEditor}>Cancel</Button>
              <Button
                size="sm"
                className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                disabled={saving}
                onClick={handleSaveEditing}
              >
                {saving ? <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Save Flow
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Flow List */}
      {flows.length === 0 && !editing ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
              <Workflow className="h-7 w-7 text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-600">No flows yet</p>
            <p className="text-xs text-gray-400 text-center max-w-xs">
              Create a flow to guide customers through bookings, FAQs, or any structured conversation
            </p>
            <Button onClick={openNew} variant="outline" size="sm" className="mt-2 gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Create your first flow
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {flows.map((flow) => (
            <Card key={flow.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-0">
                {/* Row header */}
                <div className="flex items-center gap-3 p-4">
                  <button
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600"
                    onClick={() => setExpandedFlow(expandedFlow === flow.id ? null : flow.id)}
                  >
                    <Workflow className="h-4 w-4" />
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{flow.name}</p>
                    <p className="text-xs text-gray-500 truncate">Trigger: <span className="font-mono">{flow.trigger}</span></p>
                  </div>
                  <Badge variant="secondary" className="text-[10px] shrink-0">
                    {flow.steps.length} step{flow.steps.length !== 1 ? "s" : ""}
                  </Badge>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-gray-400 hover:text-gray-700"
                      onClick={() => openEdit(flow)}
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-gray-300 hover:text-red-500"
                      onClick={() => handleDelete(flow.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                    <button
                      className="text-gray-300 hover:text-gray-600 ml-1"
                      onClick={() => setExpandedFlow(expandedFlow === flow.id ? null : flow.id)}
                    >
                      {expandedFlow === flow.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Expandable step preview */}
                {expandedFlow === flow.id && (
                  <div className="border-t border-gray-100 px-4 py-3 space-y-2 bg-gray-50/50">
                    {flow.steps.map((step, idx) => (
                      <div key={step.id} className="flex items-start gap-2.5">
                        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white border border-gray-200 text-gray-500">
                          {stepIcon(step.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-[10px] font-medium text-gray-400 uppercase">{step.type}</span>
                          <p className="text-xs text-gray-700 truncate">
                            {step.type === "handoff" ? "Transfer to human agent" : step.type === "action" ? (step.action || "—") : (step.content || "—")}
                          </p>
                        </div>
                        {idx < flow.steps.length - 1 && (
                          <div className="absolute left-[26px] mt-5 h-4 w-px bg-gray-200" />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
