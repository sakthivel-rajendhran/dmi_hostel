"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Users,
  Home,
  Clock,
  MapPin,
  AlertTriangle,
  ClipboardCheck,
  Phone,
  ArrowRight,
  ShieldAlert,
  Search,
  Filter,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Bed,
  Lock,
  X,
  FileText,
  Calendar,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader.jsx";
import { StatCard } from "@/components/ui/StatCard.jsx";
import { Card } from "@/components/ui/Card.jsx";
import { Button } from "@/components/ui/Button.jsx";
import { Input } from "@/components/ui/Input.jsx";
import { Select } from "@/components/ui/Select.jsx";
import { StatusChip } from "@/components/ui/StatusChip.jsx";
import { RoleBadge } from "@/components/ui/RoleBadge.jsx";
import { Avatar } from "@/components/ui/Avatar.jsx";
import { Drawer } from "@/components/ui/Drawer.jsx";
import { Tabs } from "@/components/ui/Tabs.jsx";
import { Skeleton } from "@/components/ui/Skeleton.jsx";
import { useAuth } from "@/hooks/use-auth.js";
import { useDeptDashboard, useDeptStudents } from "@/hooks/queries/useDepartment.js";
import { formatDateTime, formatDate } from "@/lib/utils/format.js";
import { cn } from "@/lib/utils/cn.js";

export function DepartmentDashboard({ role = "staff" }) {
  const router = useRouter();
  const { user } = useAuth();
  const isHod = role === "hod";

  // Data fetching
  const { data: dashData, isLoading: isDashLoading, refetch: refetchDash, isRefetching } = useDeptDashboard();
  const { data: students = [], isLoading: isStudentsLoading } = useDeptStudents();

  // Local state for interactive table filtering
  const [searchTerm, setSearchTerm] = useState("");
  const [floorFilter, setFloorFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState("profile");

  // Timer for overdue live countdown
  const [currentTime, setCurrentTime] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 10000);
    return () => clearInterval(timer);
  }, []);

  const kpis = dashData?.kpis || {
    inScope: 0,
    inCampus: 0,
    outLocal: 0,
    outHome: 0,
    overdue: 0,
    awaitingRecommendation: 0,
  };

  const needsAttention = dashData?.needsAttention || [];
  const movements = dashData?.movements || [];
  const hodOverview = dashData?.hodOverview;
  const deptName = user?.departmentName || "Computer Science & Engineering";
  const deptCode = user?.dept || user?.department || "CSE";
  const assignedYears = user?.assignedYears || [];

  // Filter students
  const filteredStudents = (students || []).filter((s) => {
    const matchesSearch =
      (s.name?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (s.studentId?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (s.roomNo || s.room || "").toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFloor = floorFilter === "all" || s.floor === floorFilter;
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "in_campus" && s.campusStatus === "in_campus") ||
      (statusFilter === "out" && s.campusStatus === "out") ||
      (statusFilter === "overdue" && s.campusStatus === "overdue");

    return matchesSearch && matchesFloor && matchesStatus;
  });

  const handleStudentClick = (student) => {
    setSelectedStudent(student);
    setIsDrawerOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Top Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-4">
          <Avatar
            name={user?.name || (isHod ? "HOD" : "Faculty Advisor")}
            src={user?.photo || user?.photoDataUrl}
            size="lg"
            status="online"
          />
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                {user?.name || (isHod ? "Dr. Meenakshi Sundaram" : "Prof. Rajesh Sharma")}
              </h1>
              <RoleBadge role={role} />
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold border border-slate-200 dark:border-slate-700">
                {deptCode}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
              <span>{deptName}</span>
              <span>•</span>
              <span className="font-medium text-slate-700 dark:text-slate-300">
                {isHod || assignedYears.length === 0
                  ? "All Academic Years Scope"
                  : `Assigned: Year ${assignedYears.join(", ")} Residents`}
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchDash()}
            isLoading={isRefetching}
            leftIcon={RefreshCw}
            className="text-xs"
          >
            Sync Feed
          </Button>
          <Link href={isHod ? "/hod/requests" : "/staff/requests"}>
            <Button
              size="sm"
              className={cn(
                "text-xs font-semibold shadow-sm",
                isHod ? "bg-violet-600 hover:bg-violet-700 text-white" : "bg-teal-600 hover:bg-teal-700 text-white"
              )}
            >
              Recommendation Queue ({kpis.awaitingRecommendation})
            </Button>
          </Link>
        </div>
      </div>

      {/* HOD Monthly Quick Overview Strip */}
      {isHod && hodOverview && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-violet-600/10 via-purple-600/5 to-transparent border border-violet-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-6 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-violet-600 animate-pulse" />
              <span className="text-xs font-semibold uppercase tracking-wider text-violet-700 dark:text-violet-300">
                This Month's Department Performance
              </span>
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-300">
              Total Passes: <strong className="text-slate-900 dark:text-white font-bold">{hodOverview.monthTotalPasses}</strong>
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-300">
              On-Time Return Rate: <strong className="text-emerald-600 font-bold">{hodOverview.onTimeReturnRate}</strong>
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-300">
              Primary Destination: <strong className="text-slate-900 dark:text-white font-bold">{hodOverview.topDestination}</strong>
            </div>
          </div>
          <Link
            href="/hod/analytics"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300 shrink-0"
          >
            <span>Department Analytics</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* 6 KPI StatCards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <StatCard
          title="In Scope"
          value={kpis.inScope}
          subtitle="Department Students"
          icon={Users}
          variant="default"
          onClick={() => setStatusFilter("all")}
          className="cursor-pointer hover:border-slate-400 transition"
        />
        <StatCard
          title="In Campus"
          value={kpis.inCampus}
          subtitle="Resident in Hostel"
          icon={Home}
          variant="teal"
          onClick={() => setStatusFilter("in_campus")}
          className="cursor-pointer hover:border-teal-400 transition"
        />
        <StatCard
          title="Out Local"
          value={kpis.outLocal}
          subtitle="Local Day Outpasses"
          icon={Clock}
          variant="default"
          onClick={() => setStatusFilter("out")}
          className="cursor-pointer hover:border-blue-400 transition"
        />
        <StatCard
          title="Out Home"
          value={kpis.outHome}
          subtitle="Weekend / Vacation"
          icon={MapPin}
          variant="indigo"
          onClick={() => setStatusFilter("out")}
          className="cursor-pointer hover:border-indigo-400 transition"
        />
        <StatCard
          title="Overdue"
          value={kpis.overdue}
          subtitle="Curfew Elapsed"
          icon={AlertTriangle}
          variant={kpis.overdue > 0 ? "rose" : "default"}
          onClick={() => setStatusFilter("overdue")}
          className={cn("cursor-pointer hover:border-rose-400 transition", kpis.overdue > 0 && "ring-1 ring-rose-500/30")}
        />
        <StatCard
          title="Awaiting Review"
          value={kpis.awaitingRecommendation}
          subtitle="Pending Advisory"
          icon={ClipboardCheck}
          variant={isHod ? "violet" : "teal"}
          onClick={() => router.push(isHod ? "/hod/requests" : "/staff/requests")}
          className="cursor-pointer hover:border-primary transition"
        />
      </div>

      {/* Needs Attention & Live Movements Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Needs Attention (Overdue + Emergency) */}
        <div className="lg:col-span-2">
          <Card className="h-full flex flex-col">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Needs Attention ({needsAttention.length})
                </h3>
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Overdue Curfews & Emergency Outpass Requests
              </span>
            </div>

            <div className="p-4 flex-1">
              {needsAttention.length === 0 ? (
                <div className="py-8 text-center text-slate-500 text-xs flex flex-col items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-2 opacity-80" />
                  <p className="font-semibold text-slate-700 dark:text-slate-300">All clear right now</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">No overdue residents or unreviewed emergency passes in your scope.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {needsAttention.map((item) => {
                    const isOverdue = item.type === "overdue";
                    return (
                      <div
                        key={item.id}
                        className={cn(
                          "p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition",
                          isOverdue
                            ? "bg-rose-50/60 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/60"
                            : "bg-amber-50/60 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/60"
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={cn(
                              "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 font-bold text-xs",
                              isOverdue ? "bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300" : "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300"
                            )}
                          >
                            {isOverdue ? "LATE" : "EMRG"}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 dark:text-white">{item.studentName}</span>
                              <span className="text-slate-500">({item.studentId})</span>
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-200/70 dark:bg-slate-800 font-medium">
                                Year {item.year} • Room {item.room}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                              {isOverdue ? (
                                <span className="font-medium text-rose-600 dark:text-rose-400">
                                  Expected return was {formatDateTime(item.expectedReturnTime)} (Destination: {item.destination})
                                </span>
                              ) : (
                                <span>Emergency Reason: {item.reason || item.destination}</span>
                              )}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                          {item.phone && (
                            <a
                              href={`tel:${item.phone}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 text-xs font-semibold"
                            >
                              <Phone className="w-3 h-3 text-emerald-600" />
                              <span>Student</span>
                            </a>
                          )}
                          {item.guardianPhone && (
                            <a
                              href={`tel:${item.guardianPhone}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 text-xs font-semibold"
                            >
                              <Phone className="w-3 h-3 text-rose-600" />
                              <span>Guardian</span>
                            </a>
                          )}
                          <Link href={isHod ? `/hod/requests?pass=${item.passId}` : `/staff/requests?pass=${item.passId}`}>
                            <Button size="sm" variant="outline" className="h-7 text-xs px-2">
                              Review
                            </Button>
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* 15s Polling: Today's Movements Feed */}
        <div className="lg:col-span-1">
          <Card className="h-full flex flex-col">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Today's Movements</h3>
              </div>
              <span className="text-[10px] text-slate-400 font-medium">15s Live Feed</span>
            </div>

            <div className="p-4 flex-1 overflow-y-auto max-h-[380px] space-y-3">
              {movements.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  No gate entries or exits recorded yet today for your department.
                </div>
              ) : (
                movements.map((m) => {
                  const isExit = m.direction === "EXIT";
                  return (
                    <div
                      key={m.id}
                      className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40 text-xs flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded text-[10px] font-bold shrink-0",
                            isExit
                              ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                              : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                          )}
                        >
                          {m.direction}
                        </span>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 dark:text-white truncate">
                            {m.studentName}
                          </p>
                          <p className="text-[10px] text-slate-500 truncate">
                            {m.type} • {m.destination}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[10px] font-mono text-slate-600 dark:text-slate-400">
                          {formatDateTime(m.timestamp).split(",")[1] || m.timestamp}
                        </p>
                        {m.isLate && (
                          <span className="text-[9px] font-bold text-rose-600 dark:text-rose-400">
                            LATE RETURN
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Student Status & Directory Table */}
      <Card className="overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Department Residents & Presence Status
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Live residency and campus presence status for {deptCode}
            </p>
          </div>

          {/* Table Filters */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="w-full sm:w-56">
              <Input
                placeholder="Search student, ID, room..."
                leftIcon={Search}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="text-xs"
              />
            </div>

            <Select
              value={floorFilter}
              onChange={(e) => setFloorFilter(e.target.value)}
              className="w-32 text-xs"
            >
              <option value="all">All Floors</option>
              <option value="GF">Ground Floor</option>
              <option value="F2">2nd Floor</option>
              <option value="F3">3rd Floor</option>
              <option value="F4">4th Floor</option>
            </Select>

            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-36 text-xs"
            >
              <option value="all">All Status</option>
              <option value="in_campus">In Campus</option>
              <option value="out">Outside Campus</option>
              <option value="overdue">Overdue Curfew</option>
            </Select>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          {isStudentsLoading ? (
            <div className="p-6 space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              No matching students found in your department scope.
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200/80 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Resident</th>
                  <th className="py-3 px-4">Academic</th>
                  <th className="py-3 px-4">Room & Floor</th>
                  <th className="py-3 px-4">Campus Presence</th>
                  <th className="py-3 px-4">Home Passes (Mo.)</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredStudents.map((student) => {
                  const isOverdue = student.campusStatus === "overdue";
                  const isOut = student.campusStatus === "out";

                  return (
                    <tr
                      key={student.id}
                      onClick={() => handleStudentClick(student)}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 cursor-pointer transition"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <Avatar
                            name={student.name}
                            src={student.photo || student.photoDataUrl}
                            size="sm"
                          />
                          <div>
                            <p className="font-semibold text-slate-900 dark:text-white">
                              {student.name}
                            </p>
                            <p className="text-[11px] text-slate-400 font-mono">
                              {student.studentId}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          Year {student.year}
                        </span>
                        <span className="text-slate-400 text-[11px] block">
                          {student.department}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
                          <Bed className="w-3.5 h-3.5 text-slate-400" />
                          <span>Room {student.roomNo || student.room || "—"}</span>
                        </div>
                        <span className="text-[11px] text-slate-400">
                          {student.floorLabel || "Hostel Floor"}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        {isOverdue ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 animate-pulse">
                              <AlertTriangle className="w-3 h-3" />
                              OVERDUE
                            </span>
                            <span className="text-[10px] text-rose-600 dark:text-rose-400 block font-medium">
                              Curfew elapsed
                            </span>
                          </div>
                        ) : isOut ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                            <Clock className="w-3 h-3" />
                            OUTSIDE CAMPUS
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                            <Home className="w-3 h-3" />
                            IN CAMPUS
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded font-mono font-bold text-[11px]",
                            student.homePassesUsedThisMonth >= 2
                              ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                          )}
                        >
                          {student.homePassesUsedThisMonth || 0} / 2
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {student.phone && (
                            <a
                              href={`tel:${student.phone}`}
                              title="Call Student"
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 text-slate-600 dark:text-slate-300"
                            >
                              <Phone className="w-3.5 h-3.5 text-emerald-600" />
                            </a>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleStudentClick(student)}
                            className="h-7 text-xs px-2 text-primary"
                          >
                            Details
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      {/* Read-Only Student Drawer with Locked Notice */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title={selectedStudent ? selectedStudent.name : "Resident Details"}
        width="max-w-md"
      >
        {selectedStudent && (
          <div className="space-y-5">
            {/* Locked Notice Banner */}
            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-200">
              <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Student records are read-only for academic staff</p>
                <p className="text-[11px] opacity-90 mt-0.5">
                  Hostel floor, room allocation, and profile changes are administered solely by the Chief Warden.
                </p>
              </div>
            </div>

            {/* Profile Overview Card */}
            <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800">
              <Avatar
                name={selectedStudent.name}
                src={selectedStudent.photo || selectedStudent.photoDataUrl}
                size="lg"
              />
              <div>
                <h4 className="text-base font-bold text-slate-900 dark:text-white">
                  {selectedStudent.name}
                </h4>
                <p className="text-xs text-slate-500 font-mono">
                  {selectedStudent.studentId} • Reg: {selectedStudent.regNo || "—"}
                </p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-[11px] px-2 py-0.5 rounded bg-slate-200/80 dark:bg-slate-700 font-semibold">
                    {selectedStudent.department} • Year {selectedStudent.year}
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded bg-primary/10 text-primary font-semibold">
                    Room {selectedStudent.roomNo || selectedStudent.room}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Contact Buttons */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              {selectedStudent.phone && (
                <a
                  href={`tel:${selectedStudent.phone}`}
                  className="flex items-center justify-center gap-1.5 p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-semibold"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Call Resident</span>
                </a>
              )}
              {selectedStudent.guardianPhone && (
                <a
                  href={`tel:${selectedStudent.guardianPhone}`}
                  className="flex items-center justify-center gap-1.5 p-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold"
                >
                  <Phone className="w-3.5 h-3.5 text-rose-500" />
                  <span>Call Guardian</span>
                </a>
              )}
            </div>

            {/* Information Tabs */}
            <Tabs
              tabs={[
                { id: "profile", label: "Profile" },
                { id: "passes", label: "Pass History" },
              ]}
              activeTab={drawerTab}
              onChange={setDrawerTab}
            />

            {drawerTab === "profile" ? (
              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Hostel & Room Details
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-slate-700 dark:text-slate-300">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Hostel Floor</span>
                      <strong className="font-semibold">{selectedStudent.floorLabel || "3rd Floor"}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Room Number</span>
                      <strong className="font-semibold">Room {selectedStudent.roomNo || selectedStudent.room}</strong>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Guardian Information
                  </span>
                  <div className="space-y-1 text-slate-700 dark:text-slate-300">
                    <p>
                      <strong>{selectedStudent.guardianName || "Guardian Name"}</strong> ({selectedStudent.guardianRelation || "Parent"})
                    </p>
                    <p className="font-mono text-slate-500">{selectedStudent.guardianPhone || "+91 98765 00001"}</p>
                    <p className="text-[11px] text-slate-500">{selectedStudent.address || "Hometown, Tamil Nadu"}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5 text-xs">
                {selectedStudent.passes && selectedStudent.passes.length > 0 ? (
                  selectedStudent.passes.slice(0, 5).map((p) => (
                    <div
                      key={p.id}
                      className="p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 dark:text-white">{p.type}</span>
                        <StatusChip status={p.status} size="sm" />
                      </div>
                      <p className="text-slate-500 text-[11px] mt-0.5 truncate">{p.destination}</p>
                      <span className="text-[10px] text-slate-400 font-mono block mt-1">
                        {formatDate(p.appliedAt || p.departureTime)}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-slate-400 py-6 text-xs">
                    No recent pass history available for this resident.
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}

export default DepartmentDashboard;
