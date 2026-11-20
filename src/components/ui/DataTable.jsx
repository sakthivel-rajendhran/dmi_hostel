"use client";

import React, { useState } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils/cn.js";
import { Skeleton } from "./Skeleton.jsx";
import { EmptyState } from "./Skeleton.jsx";
import { Pagination } from "./Pagination.jsx";

export function DataTable({
  columns = [],
  data = [],
  loading = false,
  page = 1,
  pageSize = 10,
  total = 0,
  onPageChange,
  onRowClick,
  emptyTitle = "No records found",
  emptyDescription = "No entries matching your filter criteria.",
  className = "",
}) {
  const [sortKey, setSortKey] = useState(null);
  const [sortOrder, setSortOrder] = useState("asc");

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortOrder("asc");
    }
  };

  const sortedData = React.useMemo(() => {
    if (!sortKey) return data;
    return [...data].sort((a, b) => {
      const valA = a[sortKey];
      const valB = b[sortKey];
      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
  }, [data, sortKey, sortOrder]);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Desktop Table View (>= 768px) */}
      <div className="hidden md:block rounded-[28px] bg-white dark:bg-[#0B133A]/90 border border-slate-200/90 dark:border-white/10 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-[#111936] dark:text-white">
            <thead className="bg-slate-50/80 dark:bg-white/5 border-b border-slate-200/80 dark:border-white/10 sticky top-0 z-10 select-none">
              <tr>
                {columns.map((col) => (
                  <th
                    key={col.key || col.header}
                    onClick={() => col.sortable && handleSort(col.key)}
                    className={cn(
                      "px-5 py-4 font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400",
                      col.sortable && "cursor-pointer hover:text-slate-900 dark:hover:text-white"
                    )}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>{col.header}</span>
                      {col.sortable && sortKey === col.key && (
                        sortOrder === "asc" ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5 font-medium">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {columns.map((_, cIdx) => (
                      <td key={cIdx} className="px-5 py-4">
                        <Skeleton className="h-4 w-full max-w-[120px]" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : sortedData.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="p-8 text-center">
                    <EmptyState title={emptyTitle} description={emptyDescription} />
                  </td>
                </tr>
              ) : (
                sortedData.map((row, rIdx) => (
                  <tr
                    key={row.id || rIdx}
                    onClick={() => onRowClick && onRowClick(row)}
                    className={cn(
                      "transition-colors hover:bg-slate-50/60 dark:hover:bg-white/5",
                      onRowClick && "cursor-pointer"
                    )}
                  >
                    {columns.map((col) => (
                      <td key={col.key || col.header} className="px-5 py-4 text-xs sm:text-sm">
                        {col.render ? col.render(row[col.key], row) : row[col.key]}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Collapsible Cards (< 768px) */}
      <div className="md:hidden space-y-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="p-4 rounded-2xl bg-white dark:bg-[#0B133A] border border-slate-200 dark:border-white/10 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
          ))
        ) : sortedData.length === 0 ? (
          <EmptyState title={emptyTitle} description={emptyDescription} />
        ) : (
          sortedData.map((row, rIdx) => (
            <div
              key={row.id || rIdx}
              onClick={() => onRowClick && onRowClick(row)}
              className="p-4 rounded-2xl bg-white dark:bg-[#0B133A] border border-slate-200/90 dark:border-white/10 shadow-sm space-y-2.5"
            >
              {columns.map((col) => (
                <div key={col.key || col.header} className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-400 uppercase tracking-wider">{col.header}</span>
                  <span className="font-medium text-slate-800 dark:text-white">
                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                  </span>
                </div>
              ))}
            </div>
          ))
        )}
      </div>

      {/* Pagination Bar */}
      {total > pageSize && (
        <Pagination page={page} pageSize={pageSize} total={total} onPageChange={onPageChange} />
      )}
    </div>
  );
}

export default DataTable;
