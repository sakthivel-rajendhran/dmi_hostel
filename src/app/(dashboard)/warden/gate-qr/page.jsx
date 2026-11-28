"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import {
  Printer,
  RefreshCw,
  ExternalLink,
  MapPin,
} from "lucide-react";
import { WORKFLOW_CONFIG } from "@/config/workflow.js";
import { gateService } from "@/lib/services/gateService.js";
import { Card } from "@/components/ui/Card.jsx";
import { Button } from "@/components/ui/Button.jsx";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog.jsx";

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
        toast.success("Gate QR successfully rotated!");
      } else {
        toast.error(res.message || "Failed to rotate Gate QR.");
      }
    } catch (err) {
      toast.error("Rotation failed.");
    } finally {
      setIsRotating(false);
    }
  };

  // Print poster
  const handlePrint = () => {
    window.print();
  };

  const selectedGate = gates.find((g) => g.id === selectedGateId) || gates[0];

  return (
    <>
      {/* Explicit Print Stylesheet for Guaranteed 1-Page A4 Landscape */}
      <style jsx global>{`
        @page {
          size: A4 landscape;
          margin: 0;
        }

        @media print {
          html,
          body {
            margin: 0 !important;
            padding: 0 !important;
            width: 297mm !important;
            height: 210mm !important;
            max-width: 297mm !important;
            max-height: 210mm !important;
            background: #ffffff !important;
            color: #000000 !important;
            overflow: hidden !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* Hide all non-printable shell and navigation elements */
          header,
          aside,
          nav,
          footer,
          .print\\:hidden {
            display: none !important;
          }

          /* Neutralize all parent layout wrappers so they don't cause extra pages */
          main,
          #__next,
          body > div {
            margin: 0 !important;
            padding: 0 !important;
            width: 297mm !important;
            height: 210mm !important;
            max-width: 297mm !important;
            max-height: 210mm !important;
            overflow: hidden !important;
            border: none !important;
            box-shadow: none !important;
            background: #ffffff !important;
          }

          /* Force poster container to fit exactly on ONE A4 landscape page */
          .gate-qr-print-wrapper {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 297mm !important;
            height: 210mm !important;
            max-width: 297mm !important;
            max-height: 210mm !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            box-shadow: none !important;
            border: none !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            page-break-before: avoid !important;
            page-break-after: avoid !important;
            page-break-inside: avoid !important;
            break-before: avoid !important;
            break-after: avoid !important;
            break-inside: avoid !important;
            overflow: hidden !important;
            z-index: 999999 !important;
          }

          .gate-qr-poster {
            width: 297mm !important;
            height: 210mm !important;
            max-width: 297mm !important;
            max-height: 210mm !important;
            margin: 0 !important;
            padding: 16mm 20mm !important;
            box-sizing: border-box !important;
            border: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            background: #ffffff !important;
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            justify-content: center !important;
            page-break-inside: avoid !important;
            page-break-after: avoid !important;
            break-inside: avoid !important;
            break-after: avoid !important;
            overflow: hidden !important;
          }

          .gate-qr-poster h1 {
            color: #000000 !important;
            font-size: 26pt !important;
            margin-bottom: 8mm !important;
          }

          .gate-qr-poster img {
            max-width: 80px !important;
            max-height: 80px !important;
          }

          .gate-qr-poster svg {
            width: 105mm !important;
            height: 105mm !important;
            max-width: 105mm !important;
            max-height: 105mm !important;
          }
        }
      `}</style>

      <div className="space-y-6 max-w-6xl mx-auto pb-12">
        {/* SCREEN CONTROLS (Hidden during print) */}
        <div className="print:hidden space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Gate QR Poster Management
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Print official single-page A4 landscape security posters for campus checkpoints
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
                  Live Gate Display
                </Button>
              </Link>

              <Button
                variant="primary"
                size="md"
                leftIcon={Printer}
                onClick={handlePrint}
              >
                Print A4 Landscape Poster
              </Button>
            </div>
          </div>

          {/* Gate Selector & Rotation Control Card */}
          <Card className="p-5 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              {/* Gate Indicator / Selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mr-1">
                  Gate Checkpoint:
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
                    Active Token Status
                  </span>
                  <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block" />
                    Cryptographically Signed (HMAC-SHA256)
                  </span>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={RefreshCw}
                  onClick={() => setIsRotateModalOpen(true)}
                  className="text-xs font-bold text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-800/80 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                >
                  Rotate Token
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* ==============================================================
            A4 LANDSCAPE PRINTABLE POSTER CONTAINER
            EXACTLY ONE PAGE IN PRINT:
            1. Official College Logo centered at the top
            2. DMI COLLEGE OF ENGINEERING prominently displayed
            3. One Large, Clearly Scannable Main Gate QR Code
            NOTHING ELSE!
            ============================================================== */}
        <div className="gate-qr-print-wrapper">
          <div className="gate-qr-poster bg-white text-slate-900 rounded-3xl p-8 sm:p-12 border-2 border-slate-200 shadow-xl max-w-2xl mx-auto flex flex-col items-center justify-center text-center">
            
            {/* 1. Official College Logo */}
            <div className="relative w-20 h-20 sm:w-24 sm:h-24 mb-3 shrink-0">
              <Image
                src="/images/dmi-foundations-logo.png"
                alt="DMI College Logo"
                fill
                className="object-contain"
                priority
              />
            </div>

            {/* 2. Prominent College Name */}
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black uppercase tracking-tight text-slate-950 leading-tight mb-8">
              DMI COLLEGE OF ENGINEERING
            </h1>

            {/* 3. One Large, Scannable Main Gate QR Code */}
            <div className="bg-white p-2 inline-block">
              {gateQrData?.payload ? (
                <QRCodeSVG
                  value={gateQrData.payload}
                  size={360}
                  level="H"
                  marginSize={2}
                  className="mx-auto"
                />
              ) : (
                <div className="w-[360px] h-[360px] flex items-center justify-center text-slate-400 text-sm font-semibold">
                  Loading Main Gate QR Code...
                </div>
              )}
            </div>

          </div>
        </div>

        {/* CONFIRM ROTATE MODAL */}
        <ConfirmDialog
          isOpen={isRotateModalOpen}
          title="Rotate Gate QR Code Immediately?"
          description={`This will generate a brand new cryptographically signed QR token and 6-character fallback code for ${selectedGate.name}. Active gate posters can be reprinted immediately.`}
          confirmLabel="Yes, Rotate QR Token"
          cancelLabel="Keep Current QR"
          variant="warning"
          isLoading={isRotating}
          onConfirm={handleConfirmRotate}
          onClose={() => setIsRotateModalOpen(false)}
        />
      </div>
    </>
  );
}
