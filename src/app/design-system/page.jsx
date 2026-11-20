"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  ArrowLeft,
  Check,
  AlertTriangle,
  Send,
  Download,
  Plus,
  Trash2,
  Lock,
  Mail,
  User,
  Search,
  Bell,
  QrCode,
  Moon,
  Sun,
  Shield,
  Layers,
} from "lucide-react";
import { useTheme } from "next-themes";
import { PageHeader } from "@/components/ui/PageHeader.jsx";
import { Card } from "@/components/ui/Card.jsx";
import { Button } from "@/components/ui/Button.jsx";
import { IconButton } from "@/components/ui/IconButton.jsx";
import { Input } from "@/components/ui/Input.jsx";
import { PasswordInput } from "@/components/ui/PasswordInput.jsx";
import { SearchInput } from "@/components/ui/SearchInput.jsx";
import { Textarea } from "@/components/ui/Textarea.jsx";
import { Select } from "@/components/ui/Select.jsx";
import { Checkbox } from "@/components/ui/Checkbox.jsx";
import { RadioGroup } from "@/components/ui/RadioGroup.jsx";
import { Switch } from "@/components/ui/Switch.jsx";
import { SegmentedControl } from "@/components/ui/SegmentedControl.jsx";
import { StatusChip } from "@/components/ui/StatusChip.jsx";
import { RoleBadge } from "@/components/ui/RoleBadge.jsx";
import { StatCard } from "@/components/ui/StatCard.jsx";
import { Avatar } from "@/components/ui/Avatar.jsx";
import { Badge } from "@/components/ui/Badge.jsx";
import { Modal } from "@/components/ui/Modal.jsx";
import { Drawer } from "@/components/ui/Drawer.jsx";
import { Timeline } from "@/components/ui/Timeline.jsx";
import { QrPlaceholder } from "@/components/ui/QrPlaceholder.jsx";
import { NotificationBell } from "@/components/ui/NotificationBell.jsx";
import { ALL_STATUSES } from "@/config/status.js";
import { ROLES } from "@/config/roles.js";

export default function DesignSystemPage() {
  const { theme, setTheme } = useTheme();

  // Interactive component demo states
  const [modalOpen, setModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [inputText, setInputText] = useState("");
  const [switchVal, setSwitchVal] = useState(true);
  const [checkboxVal, setCheckboxVal] = useState(true);
  const [radioVal, setRadioVal] = useState("opt1");
  const [segVal, setSegVal] = useState("tab1");
  const [selectVal, setSelectVal] = useState("cse");

  const colors = [
    { name: "Primary Gradient Start", hex: "#2438E8", bg: "bg-[#2438E8]" },
    { name: "Primary Main", hex: "#2B2FE0", bg: "bg-primary" },
    { name: "Primary Violet End", hex: "#6D28D9", bg: "bg-[#6D28D9]" },
    { name: "Accent Lavender", hex: "#8FA2FF", bg: "bg-[#8FA2FF]" },
    { name: "Accent Gold", hex: "#FFC83D", bg: "bg-[#FFC83D]" },
    { name: "Success Emerald", hex: "#16A34A", bg: "bg-success" },
    { name: "Warning Amber", hex: "#F59E0B", bg: "bg-warning" },
    { name: "Danger Red", hex: "#DC2626", bg: "bg-danger" },
  ];

  const timelineSteps = [
    { title: "Application Submitted", description: "Student submitted local pass request", time: "10:15 AM", isCompleted: true },
    { title: "Staff Recommended", description: "Faculty advisor endorsed request", time: "10:30 AM", isCompleted: true },
    { title: "Warden Approved", description: "Clearance approved & QR generated", time: "10:45 AM", isCompleted: true },
    { title: "Gate Checkout", description: "Exit scanner verification pending", time: "Upcoming", isCompleted: false },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-text-dark dark:text-slate-100 p-6 sm:p-10 font-sans">
      <div className="max-w-6xl mx-auto space-y-12">
        {/* Top bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link
                href="/"
                className="text-xs text-primary font-semibold hover:underline flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Portal
              </Link>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3">
              <span>DMI Design System Catalog</span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-indigo-50 dark:bg-indigo-950/60 text-primary dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                Phase 0
              </span>
            </h1>
            <p className="text-sm text-text-muted dark:text-slate-400 mt-1">
              Comprehensive UI tokens, atoms, molecules and layout primitives for DMI Hostel Management PWA
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold shadow-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              {theme === "dark" ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-500" />}
              <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
            </button>
          </div>
        </div>

        {/* SECTION 1: COLOR PALETTE */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold">1. Color Palette Tokens</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {colors.map((c) => (
              <Card key={c.name} className="p-3">
                <div className={`h-16 rounded-xl ${c.bg} shadow-inner mb-2`} />
                <div className="text-xs font-bold text-text-dark dark:text-white truncate">
                  {c.name}
                </div>
                <div className="text-[11px] font-mono text-text-muted dark:text-slate-400">
                  {c.hex}
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* SECTION 2: STATUS CHIPS (9 STATUSES) */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold">2. Status Chips (All 9 Pass Lifecycles)</h2>
          <Card className="p-6">
            <div className="flex flex-wrap gap-3 items-center">
              {ALL_STATUSES.map((statusKey) => (
                <div key={statusKey} className="flex flex-col items-center gap-1.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                  <StatusChip status={statusKey} size="md" />
                  <span className="text-[10px] font-mono text-slate-400 capitalize">{statusKey}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-text-muted dark:text-slate-400 mt-4">
              Note: The <code>overdue</code> chip features a live CSS pulsing alert dot for instant warden recognition.
            </p>
          </Card>
        </section>

        {/* SECTION 3: ROLE BADGES (7 ROLES) */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold">3. Role Badges (All 7 Roles)</h2>
          <Card className="p-6">
            <div className="flex flex-wrap gap-3">
              {Object.values(ROLES).map((role) => (
                <RoleBadge key={role} role={role} />
              ))}
            </div>
          </Card>
        </section>

        {/* SECTION 4: BUTTON VARIANTS & SIZES */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold">4. Button Component Variants</h2>
          <Card className="p-6 space-y-6">
            <div>
              <span className="text-xs font-semibold text-text-muted uppercase tracking-wider block mb-3">
                Variants
              </span>
              <div className="flex flex-wrap gap-3">
                <Button variant="primary" leftIcon={Sparkles}>Primary Button</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="danger" leftIcon={Trash2}>Danger</Button>
                <Button variant="glass">Glass</Button>
                <Button isLoading>Loading State</Button>
              </div>
            </div>

            <div>
              <span className="text-xs font-semibold text-text-muted uppercase tracking-wider block mb-3">
                Sizes
              </span>
              <div className="flex flex-wrap items-center gap-3">
                <Button size="xs">Extra Small (xs)</Button>
                <Button size="sm">Small (sm)</Button>
                <Button size="md">Medium (md)</Button>
                <Button size="lg">Large (lg)</Button>
              </div>
            </div>
          </Card>
        </section>

        {/* SECTION 5: FORM CONTROLS */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold">5. Form Inputs & Interactive Controls</h2>
          <Card className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Standard Text Input"
                placeholder="Enter student name..."
                leftIcon={User}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
              />

              <PasswordInput
                label="Password Input"
                placeholder="Enter password..."
                helperText="Password must be at least 8 characters"
              />

              <SearchInput
                placeholder="Search students, passes..."
                onClear={() => {}}
              />

              <Select
                label="Department Select"
                value={selectVal}
                onChange={(e) => setSelectVal(e.target.value)}
                options={[
                  { label: "Computer Science (CSE)", value: "cse" },
                  { label: "Electronics & Communication (ECE)", value: "ece" },
                  { label: "Mechanical Engineering (MECH)", value: "mech" },
                  { label: "Information Technology (IT)", value: "it" },
                ]}
              />

              <div className="space-y-2">
                <span className="text-xs font-semibold block">Segmented Control</span>
                <SegmentedControl
                  options={[
                    { label: "Local Pass", value: "tab1" },
                    { label: "Home Pass", value: "tab2" },
                    { label: "Emergency", value: "tab3" },
                  ]}
                  value={segVal}
                  onChange={setSegVal}
                />
              </div>

              <div className="flex flex-col gap-4 justify-center">
                <div className="flex items-center gap-4">
                  <Switch checked={switchVal} onChange={setSwitchVal} label="Enable SMS Notifications" />
                </div>
                <div className="flex items-center gap-4">
                  <Checkbox checked={checkboxVal} onChange={(e) => setCheckboxVal(e.target.checked)} label="I accept hostel terms & curfew conditions" />
                </div>
              </div>
            </div>
          </Card>
        </section>

        {/* SECTION 6: STAT CARDS */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold">6. Metric StatCards</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Total Passes" value="1,248" subtitle="+12% this week" icon={Sparkles} variant="default" />
            <StatCard title="Active In Campus" value="88%" subtitle="Hostel curfew compliant" icon={Check} variant="indigo" />
            <StatCard title="Overdue Returns" value="2" subtitle="Requires follow up" icon={AlertTriangle} variant="danger" />
            <StatCard title="Approvals Done" value="142" subtitle="Processed today" icon={Send} variant="success" />
          </div>
        </section>

        {/* SECTION 7: QR CODE & TIMELINE */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold">7. QR Code & Verification Timeline</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-6 flex flex-col items-center justify-center text-center">
              <h3 className="font-bold text-sm mb-3">High-Resolution Gate QR Code</h3>
              <QrPlaceholder value="DMI-GATE-PASS:2026-0042:CSE-3-001" size={160} />
              <p className="font-mono text-xs text-slate-400 mt-3">
                Value: DMI-GATE-PASS:2026-0042:CSE-3-001
              </p>
            </Card>

            <Card className="p-6">
              <h3 className="font-bold text-sm mb-4">Outpass Approval Timeline</h3>
              <Timeline items={timelineSteps} />
            </Card>
          </div>
        </section>

        {/* SECTION 8: MODALS & DRAWERS */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold">8. Overlay Modals & Drawers</h2>
          <Card className="p-6">
            <div className="flex gap-4">
              <Button onClick={() => setModalOpen(true)}>
                Open Demo Modal
              </Button>
              <Button variant="outline" onClick={() => setDrawerOpen(true)}>
                Open Demo Drawer
              </Button>
            </div>
          </Card>
        </section>
      </div>

      {/* Demo Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="DMI Modal Component"
        description="Accessible dialog overlay with backdrop blur and smooth keyboard navigation."
      >
        <div className="py-4 text-xs text-text-muted dark:text-slate-400 leading-relaxed">
          This modal adheres to accessibility guidelines with ESC key dismissal, focus trapping, and animated scaling transitions.
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => setModalOpen(false)}>
            Close
          </Button>
          <Button onClick={() => setModalOpen(false)}>
            Confirm Action
          </Button>
        </div>
      </Modal>

      {/* Demo Drawer */}
      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Side Drawer Navigation"
      >
        <div className="p-4 space-y-3 text-xs">
          <p className="text-text-muted dark:text-slate-400">
            Slide-over drawer component used for mobile navigation menus and student mini cards.
          </p>
          <Button className="w-full" onClick={() => setDrawerOpen(false)}>
            Dismiss Drawer
          </Button>
        </div>
      </Drawer>
    </div>
  );
}
