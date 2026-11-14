import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import {
  Bell,
  CheckCheck,
  Inbox,
  FileCheck2,
  CalendarCheck,
  MessageSquare,
  Sparkles,
  ExternalLink,
} from 'lucide-react';

export default function NotificationBell() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);

  // Poll notifications every 30 seconds
  const { data: notifData } = useQuery({
    queryKey: ['myNotifications'],
    queryFn: async () => {
      const res = await api.get('/notifications?limit=25');
      return res.data?.data;
    },
    refetchInterval: 30000,
  });

  const notifications = notifData?.notifications || [];
  const unreadCount = notifData?.unreadCount || 0;

  // Mark single as read
  const markReadMutation = useMutation({
    mutationFn: async (id) => {
      await api.patch(`/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['myNotifications']);
    },
  });

  // Mark all as read
  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await api.patch('/notifications/read-all');
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['myNotifications']);
    },
  });

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  const handleNotificationClick = (n) => {
    if (!n.readAt) {
      markReadMutation.mutate(n.id);
    }
    setOpen(false);
    if (n.link) {
      navigate(n.link);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'NEW_LEAD':
        return <Inbox className="h-4 w-4 text-indigo-600" />;
      case 'QUOTE_SENT':
        return <FileCheck2 className="h-4 w-4 text-emerald-600" />;
      case 'APPOINTMENT_PROPOSED':
      case 'APPOINTMENT_ACCEPTED':
        return <CalendarCheck className="h-4 w-4 text-sky-600" />;
      case 'NEW_MESSAGE':
        return <MessageSquare className="h-4 w-4 text-purple-600" />;
      default:
        return <Sparkles className="h-4 w-4 text-slate-500" />;
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
        aria-label="View notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white shadow-sm animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {open && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-200 z-50 overflow-hidden text-xs text-slate-800 animate-fadeIn">
          {/* Header */}
          <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-slate-900 text-sm">Notifications</span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {unreadCount} unread
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                disabled={markAllReadMutation.isLoading}
                onClick={() => markAllReadMutation.mutate()}
                className="inline-flex items-center space-x-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800"
              >
                <CheckCheck className="h-3 w-3" />
                <span>Mark all as read</span>
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
            {notifications.length === 0 ? (
              <div className="p-8 text-center space-y-1 text-slate-400">
                <Bell className="h-7 w-7 mx-auto text-slate-300" />
                <p className="text-xs font-semibold text-slate-600">No notifications</p>
                <p className="text-[11px]">Updates about your inquiries, quotes, and appointments will appear here.</p>
              </div>
            ) : (
              notifications.map((n) => {
                const isUnread = !n.readAt;

                return (
                  <div
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className={`p-3.5 flex items-start space-x-3 cursor-pointer transition-colors ${
                      isUnread ? 'bg-indigo-50/40 hover:bg-indigo-50/70' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="p-2 rounded-xl bg-white border border-slate-200 shadow-2xs shrink-0 mt-0.5">
                      {getIcon(n.type)}
                    </div>

                    <div className="flex-1 space-y-0.5">
                      <div className="flex items-center justify-between">
                        <p className={`text-xs ${isUnread ? 'font-bold text-slate-900' : 'font-semibold text-slate-700'}`}>
                          {n.title}
                        </p>
                        {isUnread && (
                          <span className="h-2 w-2 rounded-full bg-indigo-600 shrink-0 ml-1.5" />
                        )}
                      </div>

                      <p className="text-[11px] text-slate-500 line-clamp-2">{n.body}</p>

                      <p className="text-[10px] text-slate-400 pt-0.5">
                        {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} &bull; {new Date(n.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
