"use client";

import React, { useState } from "react";
import { UploadCloud, File, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils/cn.js";

export function FileDropzone({ onFileSelect, accept = "image/*,.pdf", label = "Upload verification document", className = "" }) {
  const [selectedFile, setSelectedFile] = useState(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (onFileSelect) onFileSelect(file);
    }
  };

  return (
    <div className={cn("w-full space-y-1.5", className)}>
      <label className="block text-xs font-semibold text-text-dark dark:text-slate-200">{label}</label>
      <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-3xl bg-slate-50/50 dark:bg-slate-900/50 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors text-center">
        <input type="file" accept={accept} onChange={handleFileChange} className="sr-only" />
        {selectedFile ? (
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
            <CheckCircle2 className="w-5 h-5" />
            <span className="truncate max-w-xs">{selectedFile.name}</span>
          </div>
        ) : (
          <>
            <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-primary-blue dark:text-indigo-400 flex items-center justify-center mb-2">
              <UploadCloud className="w-6 h-6" />
            </div>
            <p className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200">
              Click to select or drag and drop document
            </p>
            <p className="text-[11px] text-slate-400 mt-1">PNG, JPG, PDF up to 5MB</p>
          </>
        )}
      </label>
    </div>
  );
}

export default FileDropzone;
