"use client";

import React, { useState } from "react";
import { Users, Search, Filter, Plus, Phone } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader.jsx";
import { Card } from "@/components/ui/Card.jsx";
import { Button } from "@/components/ui/Button.jsx";
import { Input } from "@/components/ui/Input.jsx";
import { Avatar } from "@/components/ui/Avatar.jsx";
import { useStudents } from "@/hooks/queries/useStudents.js";

export default function WardenStudentsPage() {
  const { data: students = [], isLoading } = useStudents();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDept, setSelectedDept] = useState("all");

  const filtered = students.filter((s) => {
    const matchSearch =
      (s.name?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (s.studentId?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (s.roomNumber?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (s.room?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (s.roomNo?.toLowerCase() || "").includes(searchTerm.toLowerCase());
    const matchDept = selectedDept === "all" || s.dept === selectedDept || s.department === selectedDept;
    return matchSearch && matchDept;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Hostel Residents Roster"
        subtitle="Manage enrolled students, room assignments and parent contacts"
      />

      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="w-full sm:w-72">
          <Input
            placeholder="Search name, ID, or room..."
            leftIcon={Search}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex gap-2 self-start sm:self-auto overflow-x-auto pb-1 max-w-full">
          {["all", "CSE", "ECE", "MECH", "IT", "AIDS"].map((d) => (
            <button
              key={d}
              onClick={() => setSelectedDept(d)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition flex-none ${
                selectedDept === d
                  ? "bg-primary text-white"
                  : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
              }`}
            >
              {d === "all" ? "All Depts" : d}
            </button>
          ))}
        </div>
      </div>

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="text-center py-12 text-xs text-slate-400">Loading student directory...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-text-muted dark:text-slate-400 uppercase text-[11px] font-bold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-4">Resident</th>
                  <th className="p-4">Student ID</th>
                  <th className="p-4">Department & Year</th>
                  <th className="p-4">Room & Bed</th>
                  <th className="p-4">Parent Phone</th>
                  <th className="p-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <Avatar name={student.name} size="sm" />
                        <span className="font-bold text-text-dark dark:text-white">
                          {student.name}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 font-mono font-bold text-primary">{student.studentId}</td>
                    <td className="p-4 text-slate-600 dark:text-slate-300">
                      {student.dept} • Year {student.year}
                    </td>
                    <td className="p-4 font-semibold text-text-dark dark:text-white">
                      Room {student.roomNumber} (Bed {student.bedNumber || 1})
                    </td>
                    <td className="p-4 text-slate-500 font-mono">
                      {student.parentPhone || "+91 98401 23456"}
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                        In Campus
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
