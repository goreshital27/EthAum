import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import {
  MessageSquare,
  Send,
  Building2,
  User,
  AlertCircle,
  Loader2,
  Lock,
} from 'lucide-react';

export default function ChatPanel({ caseId, hospitalId, hospitalName }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [inputText, setInputText] = useState('');
  const [sendError, setSendError] = useState('');
  const messagesEndRef = useRef(null);

  const isHospital = user?.role === 'HOSPITAL';

  // 1. Fetch messages with 5s polling interval
  const {
    data: messages = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['caseMessages', caseId, hospitalId],
    queryFn: async () => {
      const hospitalParam = hospitalId ? `?hospitalId=${hospitalId}` : '';
      const res = await api.get(`/cases/${caseId}/messages${hospitalParam}`);
      return res.data?.data || [];
    },
    enabled: Boolean(caseId),
    refetchInterval: 5000,
  });

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 2. Send Message Mutation
  const sendMutation = useMutation({
    mutationFn: async (body) => {
      setSendError('');
      const payload = {
        body,
        hospitalId: isHospital ? undefined : hospitalId,
      };
      const res = await api.post(`/cases/${caseId}/messages`, payload);
      return res.data?.data;
    },
    onSuccess: () => {
      setInputText('');
      queryClient.invalidateQueries(['caseMessages', caseId, hospitalId]);
    },
    onError: (err) => {
      setSendError(
        err.response?.data?.message || err.message || 'Failed to send message. Please retry.'
      );
    },
  });

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputText.trim() || sendMutation.isLoading) return;
    if (inputText.length > 2000) {
      setSendError('Message cannot exceed 2000 characters');
      return;
    }
    sendMutation.mutate(inputText.trim());
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[480px] overflow-hidden text-xs">
      {/* Header */}
      <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
            <MessageSquare className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-xs sm:text-sm">
              Direct Coordination Thread
            </h3>
            <p className="text-[10px] text-slate-500">
              {hospitalName ? `Thread with ${hospitalName}` : 'Patient & Medical Provider Messaging'}
            </p>
          </div>
        </div>

        <span className="text-[10px] text-slate-400 bg-white px-2 py-0.5 rounded border border-slate-200">
          Live sync &bull; Plain text
        </span>
      </div>

      {/* Message List */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/40">
        {isLoading ? (
          <div className="py-20 text-center text-slate-400 space-y-2">
            <Loader2 className="h-6 w-6 animate-spin mx-auto text-indigo-600" />
            <p>Loading conversation...</p>
          </div>
        ) : isError ? (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-center">
            {error?.response?.data?.message || 'Failed to load conversation messages.'}
          </div>
        ) : messages.length === 0 ? (
          <div className="py-16 text-center space-y-2 text-slate-400">
            <MessageSquare className="h-8 w-8 mx-auto text-slate-300" />
            <p className="font-semibold text-slate-600">No messages yet</p>
            <p className="text-[11px] max-w-xs mx-auto">
              Send questions regarding medical records, travel logistics, or procedure clarification.
            </p>
          </div>
        ) : (
          messages.map((m) => {
            const isMe = m.senderId === user?.id;

            return (
              <div
                key={m.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center space-x-1 text-[10px] text-slate-400 mb-1 px-1">
                  <span>{isMe ? 'You' : m.senderName}</span>
                  <span>&bull;</span>
                  <span>
                    {new Date(m.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                <div
                  className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-3 text-xs whitespace-pre-wrap break-words leading-relaxed shadow-2xs ${
                    isMe
                      ? 'bg-indigo-600 text-white rounded-br-xs'
                      : 'bg-white text-slate-800 border border-slate-200 rounded-bl-xs'
                  }`}
                >
                  {/* Plain text display - Never renders HTML */}
                  {String(m.body)}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <div className="p-3 bg-white border-t border-slate-200 space-y-1.5">
        {sendError && (
          <div className="p-2 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-[11px] flex items-center space-x-1.5">
            <AlertCircle className="h-3.5 w-3.5 shrink-0 text-rose-600" />
            <span>{sendError}</span>
          </div>
        )}

        <form onSubmit={handleSend} className="flex items-end space-x-2">
          <div className="flex-1 relative">
            <textarea
              rows={2}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type your message here (plain text, max 2000 chars)..."
              maxLength={2000}
              className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 resize-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(e);
                }
              }}
            />
            <span
              className={`absolute right-2 bottom-2 text-[10px] ${
                inputText.length > 1800 ? 'text-amber-600 font-bold' : 'text-slate-400'
              }`}
            >
              {inputText.length}/2000
            </span>
          </div>

          <button
            type="submit"
            disabled={!inputText.trim() || sendMutation.isLoading}
            className="p-3 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 transition-colors shrink-0 shadow-sm"
            title="Send message"
          >
            {sendMutation.isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
