"use client";

import * as React from "react";
import { X, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  open:     boolean;
  onClose:  () => void;
  name:     string;
  qrToken:  string;
}

const APP_URL = typeof window !== "undefined" ? window.location.origin : "https://invitee.co.tz";

export function QrCodeModal({ open, onClose, name, qrToken }: Props) {
  const [dataUrl, setDataUrl] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const scanUrl = `${APP_URL}/scan/${qrToken}`;

  React.useEffect(() => {
    if (!open || !qrToken) return;
    setLoading(true);
    import("qrcode").then(QRCode =>
      QRCode.toDataURL(scanUrl, {
        width:           320,
        margin:          2,
        color:           { dark: "#1a1a1a", light: "#fffaf5" },
        errorCorrectionLevel: "M",
      })
    ).then(url => {
      setDataUrl(url);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [open, qrToken, scanUrl]);

  function download() {
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `qr-${name.replace(/\s+/g, "-").toLowerCase()}.png`;
    a.click();
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-xs overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-warm-100">
          <div>
            <p className="font-bold text-gray-900 text-sm truncate max-w-[180px]">{name}</p>
            <p className="text-xs text-gray-400">Check-in QR Code</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-warm-100 text-gray-400 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* QR area */}
        <div className="p-6 flex flex-col items-center gap-4">
          <div className="rounded-2xl overflow-hidden border-4 border-amber-100 bg-[#fffaf5]">
            {loading ? (
              <div className="w-[232px] h-[232px] flex items-center justify-center">
                <Loader2 size={32} className="animate-spin text-amber-400" />
              </div>
            ) : dataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={dataUrl} alt={`QR code for ${name}`} className="w-[232px] h-[232px]" />
            ) : (
              <div className="w-[232px] h-[232px] flex items-center justify-center text-xs text-gray-400">
                Failed to generate
              </div>
            )}
          </div>

          <p className="text-[10px] text-gray-400 font-mono break-all text-center leading-relaxed">
            {scanUrl}
          </p>

          <div className="flex gap-2 w-full">
            <Button
              variant="outline"
              className="flex-1 gap-1.5 text-sm"
              onClick={onClose}
            >
              Close
            </Button>
            <Button
              className="flex-1 gap-1.5 text-sm bg-amber-600 hover:bg-amber-700 text-white"
              disabled={!dataUrl}
              onClick={download}
            >
              <Download size={14} /> Download
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
