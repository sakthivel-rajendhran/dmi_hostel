"use client";

import React, { useState, useEffect } from "react";
import { Bell, BellOff, AlertCircle, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/Card.jsx";
import { Switch } from "@/components/ui/Switch.jsx";
import { pushService } from "@/lib/services/pushService.js";
import { toast } from "sonner";

export function PushNotificationCard() {
  const [supported, setSupported] = useState(true);
  const [permission, setPermission] = useState("default");
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setSupported(pushService.isSupported());
    setPermission(pushService.getPermission());
    setSubscribed(pushService.isSubscribed());
  }, []);

  const handleToggle = async (checked) => {
    setLoading(true);
    try {
      if (checked) {
        const res = await pushService.subscribe();
        if (res.ok) {
          setSubscribed(true);
          setPermission(pushService.getPermission());
          toast.success("Device subscribed to push notifications!");
        } else {
          setSubscribed(false);
          toast.error(res.error || "Failed to enable notifications");
        }
      } else {
        await pushService.unsubscribe();
        setSubscribed(false);
        toast.info("Unsubscribed from push notifications");
      }
    } catch (err) {
      toast.error(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            {subscribed ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5 text-slate-400" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Browser Push Notifications
              </h3>
              {!supported && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500">
                  Unsupported
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
              Instant alerts for pass approvals, gate entry/exit receipts, and warden announcements.
            </p>
          </div>
        </div>

        {supported && (
          <Switch
            checked={subscribed}
            onChange={handleToggle}
            disabled={loading || permission === "denied"}
          />
        )}
      </div>

      {permission === "denied" && (
        <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-[11px] text-amber-800 dark:text-amber-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
          <span>
            Notifications are blocked in your browser settings. Unblock in your browser address bar to enable alerts.
          </span>
        </div>
      )}

      {subscribed && (
        <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          <span>Active — This device is registered for institutional notifications.</span>
        </div>
      )}
    </Card>
  );
}

export default PushNotificationCard;
