"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import {
  Printer,
  RefreshCw,
  Copy,
  ExternalLink,
  ShieldCheck,
  MapPin,
  Clock,
  Sparkles,
  Info,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { WORKFLOW_CONFIG } from "@/config/workflow.js";
import { gateService } from "@/lib/services/gateService.js";
import { Card } from "@/components/ui/Card.jsx";
import { Button } from "@/components/ui/Button.jsx";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog.jsx";
import { formatDateTime } from "@/lib/utils/format.js";

export default function WardenGateQrPage() {
  const gates = WORKFLOW_CONFIG.gates || [{ id: "MAIN", name: "Main Campus Gate", lat: 12.845, lng: 79.95 }];
  const [selectedGateId, setSelectedGateId] = useState(gates[0]?.id || "MAIN");
  const [gateQrData, setGateQrData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRotateModalOpen, setIsRotateModalOpen] = useState(false);
  const [isRotating, setIsRotating] = useState(false);

  // Fetch active Gate QR
  const loadGateQr = async (gateId) => {
    setIsLoading(true);
    try {
      const res = await gateService.getGateQr(gateId);
      if (res.ok) {
        setGateQrData(res.data);
      } else {
        toast.error("Failed to load gate QR token.");
      }
    } catch (err) {
      toast.error("Error loading gate QR.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadGateQr(selectedGateId);
  }, [selectedGateId]);

  // Handle immediate manual rotation
  const handleConfirmRotate = async () => {
    setIsRotating(true);
    try {
      const res = await gateService.rotateGateQr(selectedGateId);
      if (res.ok) {
        setGateQrData(res.data);
        setIsRotateModalOpen(false);
        toast.success(`Gate QR successfully rotated! New fallback code: ${res.data.nonce.toUpperCase()}`);
      } else {
        toast.error(res.message || "Failed to rotate Gate QR.");
      }
    } catch (err) {
      toast.error("Rotation failed.");
    } finally {
      setIsRotating(false);
    }
  };

  // Copy fallback code
  const handleCopyCode = () => {
    if (!gateQrData?.nonce) return;
    navigator.clipboard.writeText(gateQrData.nonce.toUpperCase());
    toast.success(`Copied code "${gateQrData.nonce.toUpperCase()}" to clipboard.`);
  };

  // Print poster
  const handlePrint = () => {
    window.print();
  };

  const selectedGate = gates.find((g) => g.id === selectedGateId) || gates[0];

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* SCREEN CONTROLS (Hidden during print) */}
      <div className="print:hidden space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Gate QR Poster Management
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Fixed security poster scanned by hostel residents on campus exit and entry
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href={`/gate?gate=${selectedGateId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex"
            >
              <Button variant="outline" size="md" leftIcon={ExternalLink}>
                Gate Display Mode
              </Button>
            </Link>

            <Button
              variant="primary"
              size="md"
              leftIcon={Printer}
              onClick={handlePrint}
            >
              Print A4 Poster
            </Button>
          </div>
        </div>

        {/* Gate Selector & Rotation Control Card */}
        <Card className="p-5 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Gate Indicator / Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mr-1">
                Gate Location:
              </span>
              {gates.length > 1 ? (
                gates.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setSelectedGateId(g.id)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                      selectedGateId === g.id
                        ? "bg-primary text-white shadow-sm"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                    }`}
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{g.name}</span>
                  </button>
                ))
              ) : (
                <div className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-primary/10 text-primary border border-primary/20 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{gates[0]?.name || "Main Campus Gate"}</span>
                </div>
              )}
            </div>

            {/* Quick stats & rotate button */}
            <div className="flex items-center gap-3">
              <div className="text-right text-xs">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  Last Rotated
                </span>
                <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                  {gateQrData?.rotatedAt
                    ? formatDateTime(gateQrData.rotatedAt, "dd MMM, hh:mm a")
                    : "Today"}
                </span>
              </div>

              <Button
                variant="outline"
                size="sm"
                leftIcon={RefreshCw}
                onClick={() => setIsRotateModalOpen(true)}
                className="text-xs font-bold text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-800/80 hover:bg-amber-50 dark:hover:bg-amber-950/40"
              >
                Rotate Now
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* A4 PRINTABLE POSTER CONTAINER
          On screen: displayed in an elegant preview container with subtle border.
          On print: takes full page, hides all navigation/buttons via Tailwind @media print. */}
      <div className="print:m-0 print:p-0 print:border-none print:shadow-none">
        <div className="bg-white text-slate-900 rounded-3xl p-8 sm:p-12 border-2 border-slate-200 shadow-xl max-w-2xl mx-auto text-center space-y-6 print:max-w-none print:p-10 print:rounded-none print:border-none print:shadow-none">
          {/* 1. College Emblem & Header */}
          <div className="flex flex-col items-center justify-center space-y-2 border-b-2 border-slate-900 pb-5">
            <div className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-amber-400 shadow-sm mb-1">
              <Image
                src="/images/dmi-foundations-logo.png"
                alt="DMI College Emblem"
                fill
                className="object-cover"
                priority
              />
            </div>
            <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-slate-950">
              DMI COLLEGE OF ENGINEERING
            </h2>
            <p className="text-xs sm:text-sm font-bold tracking-widest uppercase text-slate-600">
              Hostel Administration &bull; Security Checkpoint
            </p>
            <div className="inline-block px-4 py-1 rounded-full bg-slate-900 text-white font-mono font-bold text-xs uppercase tracking-wider mt-1">
              {selectedGate.name} ({selectedGate.id})
            </div>
          </div>

          {/* 2. Big Action Title */}
          <div className="space-y-1">
            <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-indigo-700">
              SCAN HERE TO EXIT / ENTER
            </h1>
            <p className="text-xs sm:text-sm font-medium text-slate-600">
              Authorized digital gate clearance for hostel resident students
            </p>
          </div>

          {/* 3. High-Contrast QR Code */}
          <div className="p-6 bg-white border-4 border-slate-950 rounded-3xl inline-block shadow-md">
            {gateQrData?.payload ? (
              <QRCodeSVG
                value={gateQrData.payload}
                size={270}
                level="H"
                marginSize={2}
                className="mx-auto"
              />
            ) : (
              <div className="w-64 h-64 flex items-center justify-center text-slate-400">
                Loading QR Token...
              </div>
            )}
          </div>

          {/* 4. Fallback Manual Code Box */}
          <div className="p-4 bg-slate-100 border-2 border-slate-900 rounded-2xl max-w-md mx-auto">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block">
              Camera having trouble? Enter 6-character code:
            </span>
            <div className="flex items-center justify-center gap-2 mt-1">
              <span className="font-mono text-3xl font-black tracking-widest text-slate-950 uppercase">
                {gateQrData?.nonce || "------"}
              </span>
              <button
                type="button"
                onClick={handleCopyCode}
                className="print:hidden p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition"
                title="Copy Code"
                aria-label="Copy Code"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 5. 3-Step Clear Student Instructions */}
          <div className="bg-indigo-50/80 border border-indigo-200 rounded-2xl p-4 text-left max-w-lg mx-auto">
            <h4 className="font-bold text-xs uppercase tracking-wider text-indigo-900 mb-2">
              Instructions for Residents:
            </h4>
            <ol className="text-xs space-y-1.5 text-slate-700 list-decimal list-inside font-medium leading-relaxed">
              <li>
                Open the <strong>DMI Hostel App</strong> and tap the center <strong>Scan</strong> button.
              </li>
              <li>
                Point your camera at this poster (or type the 6-character code above).
              </li>
              <li>
                Show the green clearance screen with the <strong>live ticking clock</strong> to the Security Guard.
              </li>
            </ol>
          </div>

          {/* 6. Footer & Security Metadata */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-[11px] font-mono text-slate-500">
            <span>Date: {gateQrData?.dateKey || "Active"}</span>
            <span>Security ID: DMIGATE1-{selectedGate.id}</span>
            <span>Chief Warden Authorized</span>
          </div>
        </div>
      </div>

      {/* CONFIRM ROTATE MODAL */}
      <ConfirmDialog
        isOpen={isRotateModalOpen}
        title="Rotate Gate QR Code Immediately?"
        description={`This will generate a brand new QR token and fallback code for ${selectedGate.name}. Any printed posters with the old code will no longer scan. You should print and replace the gate poster immediately after rotating.`}
        confirmLabel="Yes, Rotate QR Token"
        cancelLabel="Keep Current QR"
        variant="warning"
        isLoading={isRotating}
        onConfirm={handleConfirmRotate}
        onClose={() => setIsRotateModalOpen(false)}
      />
    </div>
  );
}
