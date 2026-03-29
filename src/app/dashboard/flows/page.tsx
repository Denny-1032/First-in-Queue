"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Workflow,
  Plus,
  Play,
  Pause,
  Pencil,
  Trash2,
  ArrowRight,
  MessageSquare,
  HelpCircle,
  Zap,
  GitBranch,
  UserCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";

interface Flow {
  id: string;
  name: string;
  trigger: string;
  steps: number;
  active: boolean;
  runs: number;
}


interface FlowStep {
  id: string;
  type: "message" | "question" | "action" | "condition" | "handoff";
  content?: string;
}

const stepTypeIcons = {
  message: MessageSquare,
  question: HelpCircle,
  action: Zap,
  condition: GitBranch,
  handoff: UserCheck,
};


export default function FlowsPage() {
  const { toast } = useToast();
  const [flows, setFlows] = useState<Flow[]>([]);
  const [selectedFlow, setSelectedFlow] = useState<string | null>(null);
  const [tenantFlowSteps, setTenantFlowSteps] = useState<Record<string, FlowStep[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadFlows() {
      try {
        const res = await fetch("/api/tenants");
        if (!res.ok) return;
        const tenants = await res.json();
        if (tenants.length > 0 && tenants[0].config?.flows?.length) {
          const configFlows = tenants[0].config.flows;
          const mapped: Flow[] = configFlows.map((f: { id: string; name: string; trigger: string; steps: FlowStep[] }, idx: number) => ({
            id: f.id || String(idx),
            name: f.name,
            trigger: f.trigger,
            steps: f.steps?.length || 0,
            active: true,
            runs: 0,
          }));
          const stepsMap: Record<string, FlowStep[]> = {};
          configFlows.forEach((f: { id: string; steps: FlowStep[] }) => {
            stepsMap[f.id] = f.steps || [];
          });
          setFlows(mapped);
          setTenantFlowSteps(stepsMap);
          setSelectedFlow(mapped[0]?.id || null);
        }
      } catch { /* no flows available */ }
      setLoading(false);
    }
    loadFlows();
  }, []);

  const toggleFlow = (id: string) => {
    const flow = flows.find((f) => f.id === id);
    setFlows(flows.map((f) => (f.id === id ? { ...f, active: !f.active } : f)));
    if (flow) toast(`Flow "${flow.name}" ${flow.active ? "paused" : "activated"}`, flow.active ? "warning" : "success");
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Conversation Flows</h1>
          <p className="text-gray-500 mt-1">Automated multi-step workflows</p>
        </div>
        <Button
          className="gap-2"
          onClick={() => {
            const id = Date.now().toString();
            const newFlow = { id, name: "New Flow", trigger: "custom", steps: 0, active: false, runs: 0 };
            setFlows((prev) => [...prev, newFlow]);
            setSelectedFlow(id);
            toast("New flow created. Configure its steps to get started.", "info");
          }}
        >
          <Plus className="h-4 w-4" />
          Create Flow
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Flow List */}
        <div className="space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-6 w-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : flows.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Workflow className="h-10 w-10 mx-auto text-gray-300 mb-3" />
                <p className="text-sm text-gray-500">No flows yet.</p>
                <p className="text-xs text-gray-400 mt-1">Create your first flow or configure flows in AI Config to automate conversations.</p>
              </CardContent>
            </Card>
          ) : null}
          {flows.map((flow) => (
            <Card
              key={flow.id}
              className={cn(
                "cursor-pointer transition-all hover:shadow-md",
                selectedFlow === flow.id && "ring-2 ring-emerald-500"
              )}
              onClick={() => setSelectedFlow(flow.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Workflow className="h-4 w-4 text-gray-400" />
                      <h3 className="text-sm font-semibold text-gray-900">{flow.name}</h3>
                    </div>
                    <p className="text-xs text-gray-500">
                      Trigger: &quot;{flow.trigger}&quot;
                    </p>
                    <div className="flex items-center gap-3 mt-2">
                      <Badge variant={flow.active ? "default" : "secondary"}>
                        {flow.active ? "Active" : "Paused"}
                      </Badge>
                      <span className="text-[10px] text-gray-400">{flow.steps} steps</span>
                      <span className="text-[10px] text-gray-400">{flow.runs} runs</span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleFlow(flow.id); }}
                      className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      {flow.active ? (
                        <Pause className="h-3.5 w-3.5 text-gray-400" />
                      ) : (
                        <Play className="h-3.5 w-3.5 text-emerald-500" />
                      )}
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Flow Editor */}
        <div className="lg:col-span-2">
          {(() => {
            const activeFlow = flows.find((f) => f.id === selectedFlow);
            const steps: Array<{ id: string; type: string; label: string; content: string }> =
              tenantFlowSteps[selectedFlow || ""]?.map((s, i) => ({
                id: s.id,
                type: s.type,
                label: `Step ${i + 1}`,
                content: s.content || ({ message: "Send a message", question: "Ask a question", action: "Perform an action", condition: "Check a condition", handoff: "Transfer to human agent" }[s.type] || "Configure this step"),
              })) || [];

            return (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{activeFlow?.name || "Select a flow"}</CardTitle>
                      <CardDescription>Trigger: &quot;{activeFlow?.trigger || "—"}&quot;</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="gap-1.5">
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 text-red-600 hover:bg-red-50"
                        onClick={() => {
                          if (!selectedFlow) return;
                          setFlows((prev) => prev.filter((f) => f.id !== selectedFlow));
                          setSelectedFlow(flows[0]?.id || null);
                          toast("Flow deleted", "warning");
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {steps.map((step, i) => {
                      const stepType = step.type as keyof typeof stepTypeIcons;
                      const Icon = stepTypeIcons[stepType] || MessageSquare;
                      const colors: Record<string, string> = {
                        message: "border-emerald-200 bg-emerald-50",
                        question: "border-blue-200 bg-blue-50",
                        action: "border-purple-200 bg-purple-50",
                        condition: "border-amber-200 bg-amber-50",
                        handoff: "border-rose-200 bg-rose-50",
                      };
                      const iconColors: Record<string, string> = {
                        message: "text-emerald-600",
                        question: "text-blue-600",
                        action: "text-purple-600",
                        condition: "text-amber-600",
                        handoff: "text-rose-600",
                      };
                      return (
                        <div key={step.id}>
                          <div className={cn("rounded-xl border-2 p-4", colors[stepType] || "border-gray-200 bg-gray-50")}>
                            <div className="flex items-center gap-3">
                              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-sm">
                                <Icon className={cn("h-4 w-4", iconColors[stepType] || "text-gray-600")} />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-gray-400">STEP {i + 1}</span>
                                  <Badge variant="outline" className="text-[10px] capitalize">{stepType}</Badge>
                                </div>
                                <p className="text-sm text-gray-700 mt-0.5">{step.content}</p>
                              </div>
                            </div>
                          </div>
                          {i < steps.length - 1 && (
                            <div className="flex justify-center py-1">
                              <ArrowRight className="h-4 w-4 text-gray-300 rotate-90" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <Button variant="outline" className="w-full mt-4 gap-2 border-dashed">
                    <Plus className="h-4 w-4" />
                    Add Step
                  </Button>
                </CardContent>
              </Card>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
