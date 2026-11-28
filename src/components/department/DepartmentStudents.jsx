"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSafeSearchParams } from "@/hooks/useSafeSearchParams.js";
import {
  Users,
  Search,
  Filter,
  Download,
  Bed,
  Phone,
  Lock,
  AlertTriangle,
  Clock,
  Home,
  CheckCircle2,
  Calendar,
  FileText,
  Shield,
  X,
  ExternalLink,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader.jsx";
import { Card } from "@/components/ui/Card.jsx";
import { Button } from "@/components/ui/Button.jsx";
import { Input } from "@/components/ui/Input.jsx";
import { Select } from "@/components/ui/Select.jsx";
import { StatusChip } from "@/components/ui/StatusChip.jsx";
import { Avatar } from "@/components/ui/Avatar.jsx";
import { Drawer } from "@/components/ui/Drawer.jsx";
import { Tabs } from "@/components/ui/Tabs.jsx";
import { Skeleton } from "@/components/ui/Skeleton.jsx";
import { useAuth } from "@/hooks/use-auth.js";
import { useDeptStudents, useDeptStudent } from "@/hooks/queries/useDepartment.js";
import { formatDateTime, formatDate } from "@/lib/utils/format.js";
import { cn } from "@/lib/utils/cn.js";
import { toast } from "sonner";

export function DepartmentStudents({ role = "staff" }) {
  const router = useRouter();
  const searchParams = useSafeSearchParams();
  const initialStudentId = searchParams.get("student");

  const { user } = useAuth();
  const isHod = role === "hod";
  const deptCode = user?.dept || user?.department || "CSE";
  const assignedYears = user?.assignedYears || [];

  // Table filters
  const [searchTerm, setSearchTerm] = useState("");
  const [yearFilter, setYearFilter] = useState("all");
  const [floorFilter, setFloorFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "all");
  const [homePassFilter, setHomePassFilter] = useState("all");
  const [lateFilter, setLateFilter] = useState("all");

  // Query hook
  const { data: students = [], isLoading, refetch } = useDeptStudents({
    search: searchTerm,
    year: yearFilter,
    floor: floorFilter,
    campusStatus: statusFilter,
    homePassesUsed: homePassFilter === "limit_reached" ? "2" : undefined,
    lateReturns: lateFilter,
  });

  // Drawer state
  const [drawerStudentId, setDrawerStudentId] = useState(initialStudentId || null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(Boolean(initialStudentId));
  const [drawerTab, setDrawerTab] = useState("profile");

  // Fetch scoped student details if drawer opened
  const {
    data: studentDetail,
    isLoading: isDetailLoading,
    error: detailError,
  } = useDeptStudent(drawerStudentId);

  // Sync drawer state with search param
  useEffect(() => {
    if (initialStudentId) {
      setDrawerStudentId(initialStudentId);
      setIsDrawerOpen(true);
    }
  }, [initialStudentId]);

  const handleOpenStudent = (id) => {
    setDrawerStudentId(id);
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setDrawerStudentId(null);
  };

  // CSV Export
  const handleExportCSV = () => {
    if (!students || students.length === 0) {
      toast.error("No students available to export");
      return;
    }

    const headers = [
      "Student ID",
      "Name",
      "Department",
      "Year",
      "Floor",
      "Room",
      "Campus Status",
      "Home Passes (Month)",
      "Late Returns (90D)",
      "Student Phone",
      "Guardian Name",
      "Guardian Phone",
    ];

    const rows = students.map((s) => [
      `"${s.studentId || ""}"`,
      `"${s.name || ""}"`,
      `"${s.department || ""}"`,
      `"Year ${s.year || ""}"`,
      `"${s.floorLabel || s.floor || ""}"`,
      `"${s.roomNo || s.room || ""}"`,
      `"${s.campusStatus || "in_campus"}"`,
      `"${s.homePassesUsedThisMonth || 0}/2"`,
      `"${s.lateReturnsCount || 0}"`,
      `"${s.phone || ""}"`,
      `"${s.guardianName || ""}"`,
      `"${s.guardianPhone || ""}"`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const dateStr = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.setAttribute("download", `DMI_${deptCode}_Students_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${students.length} students to CSV`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Department Students (${deptCode})`}
        subtitle={
          isHod || assignedYears.length === 0
            ? `All academic years • Enrolled residents in ${deptCode}`
            : `Faculty Advisor Scope: Year ${assignedYears.join(", ")} residents in ${deptCode}`
        }
      >
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            leftIcon={Download}
            onClick={handleExportCSV}
            className="text-xs"
          >
            Export CSV
          </Button>
        </div>
      </PageHeader>

      {/* Main Table Card */}
      <Card className="overflow-hidden">
        {/* Filters Strip */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5">
            {/* Search Input */}
            <div className="sm:col-span-2">
              <Input
                placeholder="Search name, ID, register #, room..."
                leftIcon={Search}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="text-xs"
              />
            </div>

            {/* Year Filter */}
            <Select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className="text-xs"
            >
              <option value="all">All Years</option>
              {(!isHod && assignedYears.length > 0 ? assignedYears : [1, 2, 3, 4]).map((yr) => (
                <option key={yr} value={yr}>
                  Year {yr}
                </option>
              ))}
            </Select>

            {/* Floor Filter */}
            <Select
              value={floorFilter}
              onChange={(e) => setFloorFilter(e.target.value)}
              className="text-xs"
            >
              <option value="all">All Floors</option>
              <option value="GF">Ground Floor</option>
              <option value="F2">2nd Floor</option>
              <option value="F3">3rd Floor</option>
              <option value="F4">4th Floor</option>
            </Select>

            {/* Campus Presence Filter */}
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs"
            >
              <option value="all">All Presence</option>
              <option value="in_campus">In Campus</option>
              <option value="out">Outside Campus</option>
              <option value="overdue">Overdue Curfew</option>
            </Select>

            {/* Late Returns Filter */}
            <Select
              value={lateFilter}
              onChange={(e) => setLateFilter(e.target.value)}
              className="text-xs"
            >
              <option value="all">Late Returns (All)</option>
              <option value="has_late">Has Late Returns</option>
              <option value="repeat_late">Repeat Late (≥ 2)</option>
            </Select>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>
              Showing <strong>{students.length}</strong> department residents
            </span>
            {(searchTerm || yearFilter !== "all" || floorFilter !== "all" || statusFilter !== "all" || lateFilter !== "all") && (
              <button
                onClick={() => {
                  setSearchTerm("");
                  setYearFilter("all");
                  setFloorFilter("all");
                  setStatusFilter("all");
                  setLateFilter("all");
                }}
                className="text-primary hover:underline text-xs font-semibold"
              >
                Reset Filters
              </button>
            )}
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-6 space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : students.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-xs">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="font-semibold text-slate-600 dark:text-slate-300">No students match current filters</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Try clearing your search query or selecting all years.</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200/80 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Resident</th>
                  <th className="py-3 px-4">Academic</th>
                  <th className="py-3 px-4">Hostel Allocation</th>
                  <th className="py-3 px-4">Campus Presence</th>
                  <th className="py-3 px-4">Home Passes (Mo.)</th>
                  <th className="py-3 px-4">90D Late Returns</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {students.map((student) => {
                  const isOverdue = student.campusStatus === "overdue";
                  const isOut = student.campusStatus === "out";

                  return (
                    <tr
                      key={student.id}
                      onClick={() => handleOpenStudent(student.id)}
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
                              {student.studentId} • Reg: {student.regNo || "—"}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          Year {student.year}
                        </span>
                        <span className="text-slate-400 text-[11px] block">
                          {student.programme || "B.E."} • Sec {student.section || "A"}
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
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 animate-pulse">
                            <AlertTriangle className="w-3 h-3" />
                            OVERDUE
                          </span>
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

                      <td className="py-3 px-4">
                        {student.lateReturnsCount > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                            {student.lateReturnsCount} {student.lateReturnsCount === 1 ? "Incident" : "Incidents"}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">0 Late Returns</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {student.phone && (
                            <a
                              href={`tel:${student.phone}`}
                              title="Call Resident"
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 text-slate-600 dark:text-slate-300"
                            >
                              <Phone className="w-3.5 h-3.5 text-emerald-600" />
                            </a>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenStudent(student.id)}
                            className="h-7 text-xs px-2 text-primary font-semibold"
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

      {/* Slide-out Read-Only Student Drawer */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
        title={studentDetail?.name || "Resident Details"}
        width="max-w-lg"
      >
        {detailError ? (
          <div className="p-6 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Lock className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-slate-900 dark:text-white">
              Unauthorized Student Access
            </h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {detailError.message || "This student record belongs outside your department or assigned academic years."}
            </p>
            <Button size="sm" variant="outline" onClick={handleCloseDrawer} className="mt-2 text-xs">
              Close Panel
            </Button>
          </div>
        ) : isDetailLoading ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
            <Skeleton className="h-40 w-full rounded-xl" />
          </div>
        ) : studentDetail ? (
          <div className="space-y-5">
            {/* Locked Notice Banner */}
            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-200">
              <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Student records are read-only for academic staff</p>
                <p className="text-[11px] opacity-90 mt-0.5">
                  Hostel floor, room allocation, and profile changes are administered solely by the Chief Warden. Contact administration for changes.
                </p>
              </div>
            </div>

            {/* Profile Header */}
            <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800">
              <Avatar
                name={studentDetail.name}
                src={studentDetail.photo || studentDetail.photoDataUrl}
                size="lg"
              />
              <div className="min-w-0">
                <h4 className="text-base font-bold text-slate-900 dark:text-white truncate">
                  {studentDetail.name}
                </h4>
                <p className="text-xs text-slate-500 font-mono">
                  {studentDetail.studentId} • Reg: {studentDetail.regNo || "—"}
                </p>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span className="text-[11px] px-2 py-0.5 rounded bg-slate-200/80 dark:bg-slate-700 font-semibold">
                    {studentDetail.department} • Year {studentDetail.year}
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded bg-primary/10 text-primary font-semibold">
                    Room {studentDetail.roomNo || studentDetail.room}
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-medium text-slate-600 dark:text-slate-300">
                    {studentDetail.floorLabel || "Hostel Floor"}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Contact Buttons */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              {studentDetail.phone && (
                <a
                  href={`tel:${studentDetail.phone}`}
                  className="flex items-center justify-center gap-1.5 p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-semibold"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Call Resident</span>
                </a>
              )}
              {studentDetail.guardianPhone && (
                <a
                  href={`tel:${studentDetail.guardianPhone}`}
                  className="flex items-center justify-center gap-1.5 p-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold"
                >
                  <Phone className="w-3.5 h-3.5 text-rose-500" />
                  <span>Call Guardian</span>
                </a>
              )}
            </div>

            {/* Drawer Tabs */}
            <Tabs
              tabs={[
                { id: "profile", label: "Profile" },
                { id: "passes", label: `Pass History (${studentDetail.passes?.length || 0})` },
                { id: "activity", label: "Curfew & Incidents" },
              ]}
              activeTab={drawerTab}
              onChange={setDrawerTab}
            />

            {/* Tab 1: Profile */}
            {drawerTab === "profile" && (
              <div className="space-y-3 text-xs">
                <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-2.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Academic & Hostel Registration
                  </span>
                  <div className="grid grid-cols-2 gap-3 text-slate-700 dark:text-slate-300">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Academic Batch</span>
                      <strong className="font-semibold">{studentDetail.batch || "2023 – 2027"}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Programme & Section</span>
                      <strong className="font-semibold">{studentDetail.programme || "B.E."} (Sec {studentDetail.section || "A"})</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Hostel Floor</span>
                      <strong className="font-semibold">{studentDetail.floorLabel || "3rd Floor"}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Room Number</span>
                      <strong className="font-semibold">Room {studentDetail.roomNo || studentDetail.room}</strong>
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-2.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Guardian Contact Details
                  </span>
                  <div className="space-y-1.5 text-slate-700 dark:text-slate-300">
                    <p className="font-medium">
                      {studentDetail.guardianName || "Guardian Name"} ({studentDetail.guardianRelation || "Parent"})
                    </p>
                    <p className="font-mono text-slate-600 dark:text-slate-400">
                      Primary: {studentDetail.guardianPhone || "+91 98765 00001"}
                    </p>
                    {studentDetail.guardianAltPhone && (
                      <p className="font-mono text-slate-500 text-[11px]">
                        Alt: {studentDetail.guardianAltPhone}
                      </p>
                    )}
                    <p className="text-[11px] text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-800">
                      Permanent Address: {studentDetail.address || "Madurai, Tamil Nadu"}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Pass History */}
            {drawerTab === "passes" && (
              <div className="space-y-3 text-xs">
                {studentDetail.passes && studentDetail.passes.length > 0 ? (
                  studentDetail.passes.map((p) => (
                    <div
                      key={p.id}
                      className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 dark:text-white">{p.type}</span>
                        <StatusChip status={p.status} size="sm" />
                      </div>
                      <p className="text-slate-600 dark:text-slate-300 text-xs">
                        <strong>Destination:</strong> {p.destination}
                      </p>
                      <p className="text-[11px] text-slate-500 line-clamp-2">
                        <strong>Reason:</strong> {p.reason}
                      </p>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
                        <span>Applied: {formatDate(p.appliedAt)}</span>
                        <span>Pass #{p.passNumber || p.id}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-slate-400 py-8 text-xs">
                    No outpasses found on record for this student resident.
                  </p>
                )}
              </div>
            )}

            {/* Tab 3: Curfew & Incidents */}
            {drawerTab === "activity" && (
              <div className="space-y-3 text-xs">
                <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Hostel Curfew Compliance Summary
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-slate-700 dark:text-slate-300">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Late Returns (90 Days)</span>
                      <strong className="text-base font-bold text-rose-600">
                        {studentDetail.lateReturnsCount || 0}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Monthly Home Passes Used</span>
                      <strong className="text-base font-bold text-slate-900 dark:text-white">
                        {studentDetail.homePassesUsedThisMonth || 0} (Unlimited)
                      </strong>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 text-[11px] text-slate-500 space-y-1">
                  <p className="font-semibold text-slate-700 dark:text-slate-300">Hostel Compliance Notes:</p>
                  <p>• Local passes must return before 21:00 on the same calendar day.</p>
                  <p>• Outpass applications are unlimited with independent approvals.</p>
                  <p>• Repeat late returns are flagged in the HOD analytics watchlist.</p>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </Drawer>
    </div>
  );
}

export default DepartmentStudents;
