"use client";

import React, { useState, useMemo } from "react";
import {
  Users,
  Search,
  Filter,
  Eye,
  Phone,
  Mail,
  MapPin,
  Building,
  GraduationCap,
  X,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/PageHeader.jsx";
import { Card } from "@/components/ui/Card.jsx";
import { Button } from "@/components/ui/Button.jsx";
import { Input } from "@/components/ui/Input.jsx";
import { Drawer } from "@/components/ui/Drawer.jsx";
import { Avatar } from "@/components/ui/Avatar.jsx";
import { useStudents } from "@/hooks/queries/useStudents.js";
import { WORKFLOW_CONFIG } from "@/config/workflow.js";

const DEPTS = ["all", ...WORKFLOW_CONFIG.departments.map((d) => d.code)];
const YEARS = ["all", "1", "2", "3", "4"];
const FLOORS = ["all", "GF", "2nd Floor", "3rd Floor", "4th Floor"];
const ITEMS_PER_PAGE = 8;

export default function WardenStudentsPage() {
  const { data: students = [], isLoading, refetch } = useStudents();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDept, setSelectedDept] = useState("all");
  const [selectedYear, setSelectedYear] = useState("all");
  const [selectedFloor, setSelectedFloor] = useState("all");

  const [currentPage, setCurrentPage] = useState(1);
  const [viewingStudent, setViewingStudent] = useState(null);

  // Filter students based on search, department, year, floor
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const q = searchTerm.toLowerCase();
      const matchSearch =
        !q ||
        (s.name?.toLowerCase() || "").includes(q) ||
        (s.studentId?.toLowerCase() || "").includes(q) ||
        (s.regNo?.toLowerCase() || "").includes(q) ||
        (s.roomNumber?.toLowerCase() || "").includes(q) ||
        (s.room?.toLowerCase() || "").includes(q) ||
        (s.roomNo?.toLowerCase() || "").includes(q);

      const matchDept = selectedDept === "all" || s.dept === selectedDept || s.department === selectedDept;
      const matchYear = selectedYear === "all" || String(s.year) === selectedYear;

      const studentFloor = (s.floor || "").toLowerCase();
      const matchFloor =
        selectedFloor === "all" ||
        studentFloor === selectedFloor.toLowerCase() ||
        (selectedFloor === "GF" && (studentFloor === "gf" || studentFloor === "ground floor")) ||
        (selectedFloor.includes("1") && studentFloor.includes("1")) ||
        (selectedFloor.includes("2") && studentFloor.includes("2")) ||
        (selectedFloor.includes("3") && studentFloor.includes("3")) ||
        (selectedFloor.includes("4") && studentFloor.includes("4"));

      return matchSearch && matchDept && matchYear && matchFloor;
    });
  }, [students, searchTerm, selectedDept, selectedYear, selectedFloor]);

  // Pagination calculation
  const totalItems = filteredStudents.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredStudents.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredStudents, currentPage]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Hostel Residents Roster"
        subtitle="Manage enrolled students, room assignments, floor distribution and parent contacts"
      />

      {/* Filter and Search Bar */}
      <Card className="p-4 space-y-4">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="w-full md:w-80">
            <Input
              placeholder="Search name, student ID, reg no, room..."
              leftIcon={Search}
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Year Selector */}
            <select
              value={selectedYear}
              onChange={(e) => {
                setSelectedYear(e.target.value);
                setCurrentPage(1);
              }}
              className="h-9 px-3 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">All Years</option>
              <option value="1">Year 1</option>
              <option value="2">Year 2</option>
              <option value="3">Year 3</option>
              <option value="4">Year 4</option>
            </select>

            {/* Floor Selector */}
            <select
              value={selectedFloor}
              onChange={(e) => {
                setSelectedFloor(e.target.value);
                setCurrentPage(1);
              }}
              className="h-9 px-3 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">All Floors</option>
              <option value="GF">Ground Floor</option>
              <option value="2nd Floor">2nd Floor</option>
              <option value="3rd Floor">3rd Floor</option>
              <option value="4th Floor">4th Floor</option>
            </select>
          </div>
        </div>

        {/* Department Tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 max-w-full">
          {DEPTS.map((d) => (
            <button
              key={d}
              onClick={() => {
                setSelectedDept(d);
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex-none ${
                selectedDept === d
                  ? "bg-primary text-white shadow-sm"
                  : "bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/60"
              }`}
            >
              {d === "all" ? "All Depts" : d}
            </button>
          ))}
        </div>
      </Card>

      {/* Residents Table */}
      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="text-center py-16 text-xs text-slate-400">Loading student directory...</div>
        ) : filteredStudents.length === 0 ? (
          <div className="text-center py-16 space-y-2">
            <Users className="w-10 h-10 text-slate-400 mx-auto" />
            <h4 className="font-bold text-sm text-slate-800 dark:text-white">No student records found.</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              No hostel residents match the selected filters or search criteria.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase text-[11px] font-bold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-4">Resident</th>
                  <th className="p-4">Student ID / Reg No</th>
                  <th className="p-4">Department & Year</th>
                  <th className="p-4">Room & Floor</th>
                  <th className="p-4">Parent Phone</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {paginatedStudents.map((student) => {
                  const studentId = student.studentId || student.id;
                  const room = student.roomNumber || student.room || student.roomNo || "Unallocated";
                  const floor = student.floor || "—";
                  const parentPhone = student.parentPhone || student.guardianPhone || student.fatherPhone || "—";

                  return (
                    <tr
                      key={student.id || studentId}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <Avatar name={student.name} src={student.photoUrl || student.avatar} size="sm" />
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white block">
                              {student.name}
                            </span>
                            <span className="text-[11px] text-slate-500 font-mono">
                              {student.phone || student.email || ""}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="font-mono font-bold text-primary block">{studentId}</span>
                        {student.regNo && (
                          <span className="text-[10px] text-slate-400 font-mono">
                            Reg: {student.regNo}
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-slate-600 dark:text-slate-300">
                        <span className="font-semibold">{student.dept || student.department}</span>
                        <span className="text-slate-400 block text-[11px]">
                          Year {student.year || 1} • {student.section || "A"}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="font-bold text-slate-900 dark:text-white block">
                          Room {room}
                        </span>
                        <span className="text-[11px] text-slate-500">{floor}</span>
                      </td>
                      <td className="p-4 font-mono text-slate-600 dark:text-slate-400">
                        {parentPhone}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end">
                          <Button
                            size="xs"
                            variant="ghost"
                            onClick={() => setViewingStudent(student)}
                            leftIcon={Eye}
                            title="View Profile Details"
                          >
                            View
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {totalItems > 0 && (
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
            <div>
              Showing{" "}
              <strong>
                {Math.min(totalItems, (currentPage - 1) * ITEMS_PER_PAGE + 1)}–
                {Math.min(totalItems, currentPage * ITEMS_PER_PAGE)}
              </strong>{" "}
              of <strong>{totalItems}</strong> residents
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                size="xs"
                variant="outline"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                leftIcon={ChevronLeft}
              >
                Prev
              </Button>
              <span className="px-2 font-semibold">
                {currentPage} / {totalPages}
              </span>
              <Button
                size="xs"
                variant="outline"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                rightIcon={ChevronRight}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* View Details Drawer */}
      {viewingStudent && (
        <Drawer
          isOpen={Boolean(viewingStudent)}
          onClose={() => setViewingStudent(null)}
          title={viewingStudent.name}
          description={`ID: ${viewingStudent.studentId || viewingStudent.id} • ${viewingStudent.dept || viewingStudent.department}`}
          size="md"
        >
          <div className="space-y-6 text-xs p-1">
            {/* Header Identity Card */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex items-center gap-4">
              <Avatar
                name={viewingStudent.name}
                src={viewingStudent.photoUrl || viewingStudent.avatar}
                size="lg"
              />
              <div className="space-y-0.5">
                <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                  {viewingStudent.name}
                </h4>
                <p className="font-mono text-primary font-bold">
                  {viewingStudent.studentId || viewingStudent.id}
                </p>
                <p className="text-slate-500">
                  {viewingStudent.programme || "B.Tech"} • {viewingStudent.dept || viewingStudent.department} • Year {viewingStudent.year}
                </p>
              </div>
            </div>

            {/* Academic & Room Allocation */}
            <div className="space-y-2">
              <h5 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">
                Hostel & Academic Details
              </h5>
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50/70 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Register Number</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">
                    {viewingStudent.regNo || "—"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Batch</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {viewingStudent.batch || "2023 – 2027"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Room Assigned</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    Room {viewingStudent.roomNumber || viewingStudent.room || "Unallocated"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Floor</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {viewingStudent.floor || "—"}
                  </span>
                </div>
              </div>
            </div>

            {/* Contact & Parent Info */}
            <div className="space-y-2">
              <h5 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">
                Contact & Guardian Information
              </h5>
              <div className="space-y-2 p-3 rounded-xl bg-slate-50/70 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800">
                <div className="flex justify-between py-1 border-b border-slate-200/50 dark:border-slate-800/50">
                  <span className="text-slate-500">Student Mobile:</span>
                  <span className="font-semibold font-mono">{viewingStudent.phone || "—"}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/50 dark:border-slate-800/50">
                  <span className="text-slate-500">Student Email:</span>
                  <span className="font-semibold">{viewingStudent.email || "—"}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/50 dark:border-slate-800/50">
                  <span className="text-slate-500">Guardian / Parent:</span>
                  <span className="font-semibold">
                    {viewingStudent.guardianName || viewingStudent.fatherName || "—"}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/50 dark:border-slate-800/50">
                  <span className="text-slate-500">Parent Contact:</span>
                  <span className="font-semibold font-mono">
                    {viewingStudent.guardianPhone || viewingStudent.parentPhone || "—"}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Home Address:</span>
                  <span className="font-semibold max-w-[200px] text-right truncate">
                    {viewingStudent.address || "—"}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button size="sm" variant="outline" onClick={() => setViewingStudent(null)}>
                Close
              </Button>
            </div>
          </div>
        </Drawer>
      )}
    </div>
  );
}
