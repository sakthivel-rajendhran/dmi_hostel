"use client";

import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils/cn.js";

// Global event to ensure only one dropdown menu is open at a time
const CLOSE_ALL_DROPDOWNS_EVENT = "dmi_close_all_dropdowns";

export function DropdownMenu({ trigger, items = [], align = "right", className = "" }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState({
    top: 0,
    left: null,
    right: null,
    openUpwards: false,
    maxWidth: 224,
  });

  const containerRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Listen for other dropdowns opening to ensure only one open at a time
  useEffect(() => {
    const handleCloseOthers = (e) => {
      if (e.detail?.id !== containerRef.current) {
        setOpen(false);
      }
    };
    window.addEventListener(CLOSE_ALL_DROPDOWNS_EVENT, handleCloseOthers);
    return () => window.removeEventListener(CLOSE_ALL_DROPDOWNS_EVENT, handleCloseOthers);
  }, []);

  const calculatePosition = () => {
    if (!containerRef.current || typeof window === "undefined") return;
    const rect = containerRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Approximate menu height based on items
    const estimatedHeight = Math.max(120, items.length * 42 + 20);
    const spaceBelow = vh - rect.bottom;
    const openUpwards = spaceBelow < estimatedHeight && rect.top > estimatedHeight;

    const maxWidth = Math.min(224, vw - 16);
    let top = 0;
    let left = null;
    let right = null;

    if (openUpwards) {
      top = Math.max(8, rect.top - 6);
    } else {
      top = Math.min(vh - 8, rect.bottom + 6);
    }

    if (align === "right") {
      const distFromRight = vw - rect.right;
      right = Math.max(8, Math.min(vw - maxWidth - 8, distFromRight));
    } else {
      left = Math.max(8, Math.min(vw - maxWidth - 8, rect.left));
    }

    setCoords({
      top,
      left,
      right,
      openUpwards,
      maxWidth,
    });
  };

  const handleToggle = (e) => {
    e?.stopPropagation?.();
    if (!open) {
      calculatePosition();
      window.dispatchEvent(
        new CustomEvent(CLOSE_ALL_DROPDOWNS_EVENT, { detail: { id: containerRef.current } })
      );
      setOpen(true);
    } else {
      setOpen(false);
    }
  };

  useEffect(() => {
    if (!open) return;

    const handleOutside = (e) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target) &&
        containerRef.current &&
        !containerRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };

    const handleScrollOrResize = () => {
      setOpen(false);
    };

    document.addEventListener("mousedown", handleOutside, true);
    document.addEventListener("touchstart", handleOutside, true);
    window.addEventListener("scroll", handleScrollOrResize, { capture: true, passive: true });
    window.addEventListener("resize", handleScrollOrResize, { passive: true });

    return () => {
      document.removeEventListener("mousedown", handleOutside, true);
      document.removeEventListener("touchstart", handleOutside, true);
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [open]);

  const menuPortal = mounted && typeof document !== "undefined"
    ? createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              ref={menuRef}
              initial={{ opacity: 0, scale: 0.95, y: coords.openUpwards ? 4 : -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: coords.openUpwards ? 4 : -4 }}
              transition={{ duration: 0.15 }}
              style={{
                position: "fixed",
                top: coords.openUpwards ? undefined : `${coords.top}px`,
                bottom: coords.openUpwards ? `${typeof window !== "undefined" ? window.innerHeight - coords.top : 0}px` : undefined,
                left: coords.left !== null ? `${coords.left}px` : undefined,
                right: coords.right !== null ? `${coords.right}px` : undefined,
                width: `${coords.maxWidth}px`,
                maxHeight: "calc(100vh - 32px)",
                overflowY: "auto",
                zIndex: 99999,
              }}
              className={cn(
                "rounded-2xl bg-white dark:bg-[#0c1437] border border-slate-200/90 dark:border-white/10 shadow-2xl p-1.5 focus:outline-none backdrop-blur-md",
                className
              )}
              onClick={(e) => e?.stopPropagation?.()}
            >
              {items.map((item, idx) => {
                if (item.divider) {
                  return <div key={idx} className="h-px bg-slate-100 dark:bg-white/10 my-1" />;
                }

                const Icon = item.icon;
                const isButton = Boolean(item.onClick);
                const Component = item.as || (isButton ? "button" : "div");

                return (
                  <Component
                    key={idx}
                    {...(Component === "button" ? { type: "button" } : {})}
                    onClick={(e) => {
                      if (item.onClick) {
                        try {
                          item.onClick(e);
                        } catch (err) {
                          console.error("Dropdown item onClick error:", err);
                        }
                        setOpen(false);
                      }
                    }}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors text-left",
                      isButton
                        ? item.danger
                          ? "text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"
                          : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer"
                        : "text-slate-700 dark:text-slate-200",
                      item.className
                    )}
                  >
                    {Icon && <Icon className="w-4 h-4 flex-shrink-0" />}
                    {typeof item.label === "string" ? <span>{item.label}</span> : item.label}
                  </Component>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )
    : null;

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      <div onClick={handleToggle}>{trigger}</div>
      {menuPortal}
    </div>
  );
}

export function Tooltip({ text, children, position = "top" }) {
  const [visible, setVisible] = useState(false);

  return (
    <div
      className="relative inline-flex items-center"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}
      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className={cn(
              "absolute z-40 px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900 whitespace-nowrap shadow-lg pointer-events-none",
              position === "top" && "bottom-full left-1/2 -translate-x-1/2 mb-1.5",
              position === "bottom" && "top-full left-1/2 -translate-x-1/2 mt-1.5",
              position === "right" && "left-full top-1/2 -translate-y-1/2 ml-1.5"
            )}
          >
            {text}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default DropdownMenu;
