"use client";

import React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils/cn.js";
import { getInitials } from "@/lib/utils/string.js";

const SIZE_MAP = {
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-12 h-12 text-base",
  xl: "w-16 h-16 text-lg",
};

export function Avatar({
  src,
  alt = "User Avatar",
  name = "User",
  size = "md",
  statusDot, // 'online' | 'offline' | 'busy'
  className = "",
}) {
  const [imgError, setImgError] = React.useState(false);

  React.useEffect(() => {
    setImgError(false);
  }, [src]);

  const initials = getInitials(name);
  const isImgUrl =
    !imgError &&
    typeof src === "string" &&
    (src.startsWith("/") ||
      src.startsWith("http://") ||
      src.startsWith("https://") ||
      src.startsWith("data:") ||
      src.startsWith("blob:"));

  return (
    <div
      className={cn(
        "relative inline-flex shrink-0 select-none rounded-full items-center justify-center overflow-hidden",
        SIZE_MAP[size],
        className
      )}
    >
      <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center font-bold text-white shadow-xs border border-white/60 dark:border-white/10 bg-gradient-to-tr from-[#2438E8] to-[#6D28D9] shrink-0 aspect-square">
        {isImgUrl ? (
          <Image
            src={src}
            alt={alt}
            width={64}
            height={64}
            unoptimized
            className="w-full h-full object-cover object-center aspect-square"
            style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center", aspectRatio: "1/1" }}
            onError={() => setImgError(true)}
          />
        ) : (
          <span className="leading-none text-center select-none uppercase font-bold">
            {initials || (typeof src === "string" && src.length <= 4 ? src : "U")}
          </span>
        )}
      </div>

      {statusDot && (
        <span
          className={cn(
            "absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900",
            statusDot === "online" && "bg-emerald-500",
            statusDot === "offline" && "bg-slate-400",
            statusDot === "busy" && "bg-rose-500"
          )}
        />
      )}
    </div>
  );
}

export function AvatarGroup({ avatars = [], max = 4, size = "md", className = "" }) {
  const visible = avatars.slice(0, max);
  const remaining = avatars.length - max;

  return (
    <div className={cn("flex items-center -space-x-2.5 overflow-hidden", className)}>
      {visible.map((av, idx) => (
        <Avatar key={idx} {...av} size={size} className="ring-2 ring-white dark:ring-slate-900" />
      ))}
      {remaining > 0 && (
        <div
          className={cn(
            "rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold flex items-center justify-center border-2 border-white dark:border-slate-900 ring-2 ring-white dark:ring-slate-900",
            SIZE_MAP[size]
          )}
        >
          +{remaining}
        </div>
      )}
    </div>
  );
}

export default Avatar;
