"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Copy, Eye, Code, Settings, Palette, Globe } from "lucide-react";

export default function WidgetConfigPage() {
  const [agents, setAgents] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedAgent, setSelectedAgent] = useState("");
  const [config, setConfig] = useState({
    theme: "default",
    primaryColor: "#3b82f6",
    backgroundColor: "#ffffff",
    textColor: "#1f2937",
    title: "Need Help?",
    subtitle: "Talk to our AI assistant",
    showBranding: true,
    position: "bottom-right",
  });
  const [embedCode, setEmbedCode] = useState("");
  const [iframeCode, setIframeCode] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState("");

  useEffect(() => {
    loadAgents();
  }, []);

  useEffect(() => {
    generateEmbedCode();
  }, [selectedAgent, config]);

  const loadAgents = async () => {
    try {
      const response = await fetch("/api/voice/agents");
      if (response.ok) {
        const data = await response.json();
        setAgents(data.agents || []);
        if (data.agents?.length > 0) {
          setSelectedAgent(data.agents[0].id);
        }
      }
    } catch (error) {
      console.error("Failed to load agents:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateEmbedCode = async () => {
    if (!selectedAgent) return;

    const params = new URLSearchParams({
      tenantId: "current-tenant", // This should come from auth context
      agentId: selectedAgent,
      theme: config.theme,
      primaryColor: config.primaryColor,
      backgroundColor: config.backgroundColor,
      textColor: config.textColor,
      title: config.title,
      subtitle: config.subtitle,
      showBranding: config.showBranding.toString(),
    });

    try {
      const response = await fetch(`/api/widget/embed?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setEmbedCode(data.embedCode);
        setIframeCode(data.iframeCode);
      }
    } catch (error) {
      console.error("Failed to generate embed code:", error);
    }
  };

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(""), 2000);
  };

  const applyTheme = (theme: string) => {
    const themes = {
      default: {
        primaryColor: "#3b82f6",
        backgroundColor: "#ffffff",
        textColor: "#1f2937",
        title: "Need Help?",
        subtitle: "Talk to our AI assistant",
      },
      dark: {
        primaryColor: "#10b981",
        backgroundColor: "#1f2937",
        textColor: "#f9fafb",
        title: "Support",
        subtitle: "AI assistant available",
      },
      minimal: {
        primaryColor: "#6b7280",
        backgroundColor: "#ffffff",
        textColor: "#374151",
        title: "Chat",
        subtitle: "Get help now",
      },
    };

    if (themes[theme as keyof typeof themes]) {
      setConfig({ ...config, ...themes[theme as keyof typeof themes], theme });
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center min-h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Call Us Widget</h1>
          <p className="text-gray-600">Embed an AI voice assistant on your website</p>
        </div>

        {agents.length === 0 ? (
          <Alert>
            <Globe className="h-4 w-4" />
            <AlertDescription>
              No voice agents available. Please create a voice agent first to use the widget.
            </AlertDescription>
          </Alert>
        ) : (
          <Tabs defaultValue="configure" className="space-y-6">
            <TabsList>
              <TabsTrigger value="configure">
                <Settings className="w-4 h-4 mr-2" />
                Configure
              </TabsTrigger>
              <TabsTrigger value="preview">
                <Eye className="w-4 h-4 mr-2" />
                Preview
              </TabsTrigger>
              <TabsTrigger value="embed">
                <Code className="w-4 h-4 mr-2" />
                Embed Code
              </TabsTrigger>
            </TabsList>

            <TabsContent value="configure" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Basic Settings</CardTitle>
                  <CardDescription>
                    Choose which voice agent to use and basic widget configuration
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
                    <Label htmlFor="position">Widget Position</Label>
                    <Select value={config.position} onValueChange={(value) => setConfig({ ...config, position: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bottom-right">Bottom Right</SelectItem>
                        <SelectItem value="bottom-left">Bottom Left</SelectItem>
                        <SelectItem value="top-right">Top Right</SelectItem>
                        <SelectItem value="top-left">Top Left</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="branding"
                      checked={config.showBranding}
                      onCheckedChange={(checked) => setConfig({ ...config, showBranding: checked })}
                    />
                    <Label htmlFor="branding">Show "Powered by First in Queue" branding</Label>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Palette className="w-4 h-4 mr-2" />
                    Appearance
                  </CardTitle>
                  <CardDescription>
                    Customize colors and text or use a preset theme
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      variant={config.theme === "default" ? "default" : "outline"}
                      onClick={() => applyTheme("default")}
                      className="text-xs"
                    >
                      Default
                    </Button>
                    <Button
                      variant={config.theme === "dark" ? "default" : "outline"}
                      onClick={() => applyTheme("dark")}
                      className="text-xs"
                    >
                      Dark
                    </Button>
                    <Button
                      variant={config.theme === "minimal" ? "default" : "outline"}
                      onClick={() => applyTheme("minimal")}
                      className="text-xs"
                    >
                      Minimal
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Title</Label>
                      <Input
                        id="title"
                        value={config.title}
                        onChange={(e) => setConfig({ ...config, title: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="subtitle">Subtitle</Label>
                      <Input
                        id="subtitle"
                        value={config.subtitle}
                        onChange={(e) => setConfig({ ...config, subtitle: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="primaryColor">Primary Color</Label>
                      <div className="flex space-x-2">
                        <Input
                          id="primaryColor"
                          type="color"
                          value={config.primaryColor}
                          onChange={(e) => setConfig({ ...config, primaryColor: e.target.value })}
                          className="w-12 h-8 p-0 border-0"
                        />
                        <Input
                          value={config.primaryColor}
                          onChange={(e) => setConfig({ ...config, primaryColor: e.target.value })}
                          className="flex-1"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="backgroundColor">Background</Label>
                      <div className="flex space-x-2">
                        <Input
                          id="backgroundColor"
                          type="color"
                          value={config.backgroundColor}
                          onChange={(e) => setConfig({ ...config, backgroundColor: e.target.value })}
                          className="w-12 h-8 p-0 border-0"
                        />
                        <Input
                          value={config.backgroundColor}
                          onChange={(e) => setConfig({ ...config, backgroundColor: e.target.value })}
                          className="flex-1"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="textColor">Text Color</Label>
                      <div className="flex space-x-2">
                        <Input
                          id="textColor"
                          type="color"
                          value={config.textColor}
                          onChange={(e) => setConfig({ ...config, textColor: e.target.value })}
                          className="w-12 h-8 p-0 border-0"
                        />
                        <Input
                          value={config.textColor}
                          onChange={(e) => setConfig({ ...config, textColor: e.target.value })}
                          className="flex-1"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="preview">
              <Card>
                <CardHeader>
                  <CardTitle>Widget Preview</CardTitle>
                  <CardDescription>
                    This is how your widget will appear on your website
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="bg-gray-100 rounded-lg p-8 flex items-center justify-center">
                    <div className="text-center">
                      <div
                        className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg"
                        style={{ backgroundColor: config.primaryColor }}
                      >
                        <Globe className="w-8 h-8 text-white" />
                      </div>
                      <h3 className="font-semibold mb-1" style={{ color: config.textColor }}>
                        {config.title}
                      </h3>
                      <p className="text-sm opacity-75 mb-4" style={{ color: config.textColor }}>
                        {config.subtitle}
                      </p>
                      <Badge variant="secondary">Preview Mode</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="embed" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>JavaScript Embed Code</CardTitle>
                  <CardDescription>
                    Copy this code and paste it before the closing &lt;/body&gt; tag of your website
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="relative">
                    <pre className="bg-gray-100 p-4 rounded-lg text-xs overflow-x-auto">
                      {embedCode}
                    </pre>
                    <Button
                      size="sm"
                      variant="outline"
                      className="absolute top-2 right-2"
                      onClick={() => copyToClipboard(embedCode, "script")}
                    >
                      {copied === "script" ? "Copied!" : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>iframe Embed Code</CardTitle>
                  <CardDescription>
                    Alternative: Use this iframe if you prefer a simpler approach
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="relative">
                    <pre className="bg-gray-100 p-4 rounded-lg text-xs overflow-x-auto">
                      {iframeCode}
                    </pre>
                    <Button
                      size="sm"
                      variant="outline"
                      className="absolute top-2 right-2"
                      onClick={() => copyToClipboard(iframeCode, "iframe")}
                    >
                      {copied === "iframe" ? "Copied!" : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Alert>
                <Globe className="h-4 w-4" />
                <AlertDescription>
                  <strong>Important:</strong> Your website must use HTTPS for WebRTC voice calls to work.
                  The widget will automatically handle microphone permissions and audio streaming.
                </AlertDescription>
              </Alert>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
