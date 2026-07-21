"use client";

import { useState, useEffect, useMemo } from "react";
import QRCode from "qrcode";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { MessageCircle, Copy, Download, Loader2, QrCode } from "lucide-react";

const DEFAULT_MESSAGE = "Hi! I'd like to book an appointment.";

interface LinkInfo {
  status: string;
  message?: string;
  phone?: string;
  verified_name?: string;
  wa_link?: string;
}

export function WhatsAppLinkCard() {
  const { toast } = useToast();
  const [info, setInfo] = useState<LinkInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(DEFAULT_MESSAGE);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  useEffect(() => {
    fetch("/api/whatsapp/link")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setInfo(data))
      .catch(() => setInfo(null))
      .finally(() => setLoading(false));
  }, []);

  const shareLink = useMemo(() => {
    if (!info?.wa_link) return "";
    return message.trim()
      ? `${info.wa_link}?text=${encodeURIComponent(message.trim())}`
      : info.wa_link;
  }, [info, message]);

  useEffect(() => {
    // shareLink is only empty before WhatsApp is connected, when the QR block isn't shown
    if (!shareLink) return;
    QRCode.toDataURL(shareLink, { width: 512, margin: 2, color: { dark: "#065f46" } })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(""));
  }, [shareLink]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      toast("Link copied to clipboard", "success");
    } catch {
      toast("Could not copy link", "error");
    }
  };

  const downloadQr = () => {
    if (!qrDataUrl) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = "whatsapp-qr.png";
    a.click();
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start gap-4 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 shrink-0">
            <MessageCircle className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Share Your WhatsApp Assistant</h3>
            <p className="text-sm text-gray-500 mt-1">
              Put this link or QR code anywhere - Instagram bio, Facebook page, flyers, receipts.
              Customers tap it and land straight in a chat with your AI assistant. No website needed.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8 text-gray-400">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : !info || info.status !== "ok" ? (
          <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
            {info?.message || "WhatsApp is not connected for this business yet. Once connected, your shareable link appears here."}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-6">
            <div className="space-y-3 min-w-0">
              <div>
                <label className="text-xs font-medium text-gray-600">Pre-filled message (what the customer&apos;s chat starts with)</label>
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Your link ({info.phone})</label>
                <div className="mt-1 flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={shareLink}
                    className="flex-1 min-w-0 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600 focus:outline-none"
                  />
                  <Button variant="outline" size="sm" onClick={copyLink} className="gap-1.5 shrink-0">
                    <Copy className="h-3.5 w-3.5" /> Copy
                  </Button>
                </div>
              </div>
              <p className="text-xs text-gray-400">
                Tip: use different pre-filled messages on different flyers to know where customers come from.
              </p>
            </div>

            <div className="flex flex-col items-center gap-2">
              {qrDataUrl ? (
                // QR data URL is generated client-side; next/image adds nothing here
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qrDataUrl} alt="WhatsApp QR code" className="h-40 w-40 rounded-lg border border-gray-200" />
              ) : (
                <div className="flex h-40 w-40 items-center justify-center rounded-lg border border-gray-200 bg-gray-50">
                  <QrCode className="h-8 w-8 text-gray-300" />
                </div>
              )}
              <Button variant="outline" size="sm" onClick={downloadQr} disabled={!qrDataUrl} className="gap-1.5">
                <Download className="h-3.5 w-3.5" /> Download PNG
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
