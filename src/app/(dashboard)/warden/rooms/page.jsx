"use client";

import React, { useState } from "react";
import { Bed, Users, Filter, CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader.jsx";
import { Card } from "@/components/ui/Card.jsx";
import { Skeleton } from "@/components/ui/Skeleton.jsx";
import { useRooms } from "@/hooks/queries/useStudents.js";
import { WORKFLOW_CONFIG } from "@/config/workflow.js";

const FLOOR_FILTERS = [
  { id: "all", label: "All Floors" },
  ...WORKFLOW_CONFIG.floors.map((fl) => ({ id: fl.id, label: fl.label })),
];

export default function WardenRoomsPage() {
  const [selectedFloor, setSelectedFloor] = useState("all");
  const { data: rooms = [], isLoading } = useRooms(selectedFloor);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Hostel Room Allocations"
        subtitle="Manage single building floor capacities, rooms and occupancy rates (30 rooms/floor)"
      />

      <div className="flex gap-2 flex-wrap">
        {FLOOR_FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setSelectedFloor(f.id)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
              selectedFloor === f.id
                ? "bg-primary text-white shadow-sm"
                : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="p-4 space-y-3">
              <Skeleton className="h-6 w-3/4 rounded-lg" />
              <Skeleton className="h-4 w-1/2 rounded" />
              <Skeleton className="h-2 w-full rounded-full" />
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {rooms.map((room) => {
            const isFull = room.occupied >= room.capacity;
            return (
              <Card key={room.id} className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
                      <Bed className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-text-dark dark:text-white">
                        Room {room.roomNumber}
                      </h4>
                      <span className="text-[10px] text-text-muted dark:text-slate-400">
                        {room.floorLabel || room.floor}
                      </span>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      isFull
                        ? "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                        : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                    }`}
                  >
                    {isFull ? "Full" : "Available"}
                  </span>
                </div>

                <div>
                  <div className="flex justify-between text-xs text-text-muted dark:text-slate-400 mb-1">
                    <span>Occupancy</span>
                    <span className="font-bold text-text-dark dark:text-white">
                      {room.occupied} / {room.capacity} Beds
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        isFull ? "bg-rose-500" : "bg-primary"
                      }`}
                      style={{ width: `${(room.occupied / room.capacity) * 100}%` }}
                    />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
