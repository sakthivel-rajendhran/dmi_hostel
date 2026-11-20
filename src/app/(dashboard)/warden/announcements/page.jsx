"use client";

import React, { useState } from "react";
import { Megaphone, Send, Bell } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/PageHeader.jsx";
import { Card } from "@/components/ui/Card.jsx";
import { Button } from "@/components/ui/Button.jsx";
import { Input } from "@/components/ui/Input.jsx";
import { Textarea } from "@/components/ui/Textarea.jsx";
import { notificationService } from "@/lib/services/notificationService.js";
import { useNotifications } from "@/hooks/queries/useNotifications.js";
import { formatDateTime } from "@/lib/utils/format.js";

export default function WardenAnnouncementsPage() {
  const { data: notifications = [], refetch } = useNotifications();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  const handleBroadcast = async (e) => {
    e.preventDefault();
    if (!title || !message) {
      toast.error("Please enter both title and message.");
      return;
    }

    setIsSending(true);
    try {
      const res = await notificationService.sendNotification({
        title,
        message,
        type: "circular",
      });
      if (res.ok) {
        toast.success("Hostel circular broadcasted successfully!");
        setTitle("");
        setMessage("");
        refetch();
      }
    } catch {
      toast.error("Failed to broadcast announcement");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Hostel Announcements & Circulars"
        subtitle="Broadcast urgent notices and reminders to all hostel residents"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Broadcast Form */}
        <Card className="p-5 lg:col-span-1 h-fit">
          <h3 className="font-bold text-sm text-text-dark dark:text-white mb-3 flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-primary" />
            <span>Compose Circular</span>
          </h3>

          <form onSubmit={handleBroadcast} className="space-y-3">
            <Input
              label="Circular Title"
              placeholder="e.g. Curfew Timing Update"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
            <Textarea
              label="Notice Body"
              placeholder="Type your circular notice..."
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
            />
            <Button
              type="submit"
              className="w-full mt-2"
              isLoading={isSending}
              leftIcon={Send}
            >
              Broadcast to All Students
            </Button>
          </form>
        </Card>

        {/* Existing Announcements */}
        <Card className="p-5 lg:col-span-2">
          <h3 className="font-bold text-sm text-text-dark dark:text-white mb-3 flex items-center gap-2">
            <Bell className="w-4 h-4 text-primary" />
            <span>Past Announcements</span>
          </h3>

          <div className="space-y-3">
            {notifications.slice(0, 6).map((notif) => (
              <div
                key={notif.id}
                className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40"
              >
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-bold text-xs text-text-dark dark:text-white">
                    {notif.title}
                  </h4>
                  <span className="text-[10px] text-text-muted dark:text-slate-400">
                    {formatDateTime(notif.createdAt)}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {notif.message}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
