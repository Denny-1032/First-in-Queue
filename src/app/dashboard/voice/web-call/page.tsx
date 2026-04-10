"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Phone, AlertCircle, Loader2 } from "lucide-react";
import WebCallClient from "@/components/voice/WebCallClient";

export default function WebCallPage() {
  const searchParams = useSearchParams();
  const [agents, setAgents] = useState<Array<{ id: string; name: string; retell_agent_id: string; greeting_message?: string }>>([]);
  const [selectedAgent, setSelectedAgent] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [purpose, setPurpose] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isInitializing, setIsInitializing] = useState(false);
  const [callData, setCallData] = useState<{
    accessToken: string;
    callId: string;
    retellCallId: string;
  } | null>(null);
  const [error, setError] = useState("");
  const [transcript, setTranscript] = useState("");

  // Load available voice agents (scoped to authenticated tenant via cookie)
  useEffect(() => {
    const loadAgents = async () => {
      try {
        const response = await fetch("/api/voice/web-call");
        if (response.ok) {
          const data = await response.json();
          setAgents(data.agents || []);
          
          // Pre-select agent from URL params if provided
          const agentId = searchParams.get("agent");
          if (agentId && data.agents?.some((a: any) => a.id === agentId)) {
            setSelectedAgent(agentId);
          } else if (data.agents?.length === 1) {
            setSelectedAgent(data.agents[0].id);
          }
        }
      } catch (err) {
        console.error("Failed to load agents:", err);
        setError("Failed to load voice agents");
      } finally {
        setIsLoading(false);
      }
    };

    loadAgents();
  }, [searchParams]);

  const initializeCall = async () => {
    if (!selectedAgent) {
      setError("Please select a voice agent");
      return;
    }

    setIsInitializing(true);
    setError("");

    try {
      const response = await fetch("/api/voice/web-call", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          agentId: selectedAgent,
          customerName: customerName.trim() || undefined,
          purpose: purpose.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to initialize call");
      }

      const data = await response.json();
      setCallData({
        accessToken: data.accessToken,
        callId: data.callId,
        retellCallId: data.retellCallId,
      });
    } catch (err) {
      console.error("Failed to initialize call:", err);
      setError(err instanceof Error ? err.message : "Failed to initialize call");
    } finally {
      setIsInitializing(false);
    }
  };

  const handleCallStart = () => {
    console.log("Call started");
    setError("");
  };

  const handleCallEnd = () => {
    console.log("Call ended");
    // Optionally redirect or show call summary
  };

  const handleTranscriptUpdate = (newTranscript: string) => {
    setTranscript(newTranscript);
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
  };

  const resetCall = () => {
    setCallData(null);
    setTranscript("");
    setError("");
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center min-h-64">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      </div>
    );
  }

  if (callData) {
    return (
      <div className="container mx-auto py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Voice Call Active</h1>
              <p className="text-gray-600">Connected to AI assistant</p>
            </div>
            <Button variant="outline" onClick={resetCall}>
              End Session
            </Button>
          </div>

          <WebCallClient
            accessToken={callData.accessToken}
            onCallStart={handleCallStart}
            onCallEnd={handleCallEnd}
            onTranscriptUpdate={handleTranscriptUpdate}
            onError={handleError}
          />

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Start Voice Call</h1>
          <p className="text-gray-600">Connect with an AI assistant via your browser</p>
        </div>

        {agents.length === 0 ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No voice agents available. Please configure a voice agent first.
            </AlertDescription>
          </Alert>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Phone className="w-5 h-5 mr-2" />
                Call Setup
              </CardTitle>
              <CardDescription>
                Choose a voice agent and provide optional details to start your call
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="agent">Voice Agent</Label>
                <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a voice agent" />
                  </SelectTrigger>
                  <SelectContent>
                    {agents.map((agent) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        {agent.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="customerName">Your Name (Optional)</Label>
                <Input
                  id="customerName"
                  placeholder="Enter your name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="purpose">Purpose (Optional)</Label>
                <Input
                  id="purpose"
                  placeholder="e.g., Product inquiry, Support request"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button
                onClick={initializeCall}
                disabled={!selectedAgent || isInitializing}
                className="w-full"
                size="lg"
              >
                {isInitializing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Initializing...
                  </>
                ) : (
                  <>
                    <Phone className="w-4 h-4 mr-2" />
                    Start Call
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
