import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Send,
  Shield,
  User,
  Clock,
  AlertCircle,
  Loader2,
  Lock,
} from 'lucide-react';
import { ticketsApi, TicketMessage } from '../tickets.api';
import { az } from '../../../i18n/az';

export const TicketDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const [replyMessage, setReplyMessage] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { data: ticket, isLoading, isError } = useQuery({
    queryKey: ['ticket', id],
    queryFn: () => ticketsApi.getTicketById(id || ''),
    enabled: Boolean(id),
  });

  const sendMutation = useMutation({
    mutationFn: (msg: string) => ticketsApi.sendMessage(id || '', msg),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', id] });
      setReplyMessage('');
      setErrorMsg(null);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.message || 'Mesaj göndərilərkən xəta baş verdi.');
    },
  });

  const statusMutation = useMutation({
    mutationFn: (newStatus: string) => ticketsApi.updateStatus(id || '', newStatus),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', id] });
    },
  });

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyMessage.trim()) {
      setErrorMsg('Bu xana mütləq doldurulmalıdır');
      return;
    }
    sendMutation.mutate(replyMessage.trim());
  };

  if (isLoading) {
    return (
      <div className="py-24 flex justify-center text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (isError || !ticket) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-xl font-bold text-slate-900">Bilet tapılmadı</h2>
        <Link
          to="/tickets"
          className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-xl text-xs font-bold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Dəstək Mərkəzinə qayıt</span>
        </Link>
      </div>
    );
  }

  const isClosed = ticket.status === 'CLOSED';

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-6">
      {/* Top Navigation */}
      <div>
        <Link
          to="/tickets"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Bütün biletlərə qayıt</span>
        </Link>
      </div>

      {/* Ticket Header Card */}
      <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-brand-600 text-sm">{ticket.ticketNumber}</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
              {az.tickets.categories[ticket.category] || ticket.category}
            </span>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
              ticket.status === 'OPEN'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : ticket.status === 'IN_PROGRESS'
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : 'bg-slate-100 text-slate-600'
            }`}>
              {az.status[ticket.status] || ticket.status}
            </span>
          </div>

          {!isClosed && (
            <button
              type="button"
              onClick={() => statusMutation.mutate('CLOSED')}
              disabled={statusMutation.isPending}
              className="px-3 py-1 text-xs font-semibold text-slate-500 hover:text-rose-600 border border-slate-200 hover:border-rose-200 rounded-lg transition-colors flex items-center gap-1"
            >
              <Lock className="w-3 h-3" />
              <span>{az.tickets.closeTicket}</span>
            </button>
          )}
        </div>

        <h1 className="text-xl font-bold text-slate-900">{ticket.subject}</h1>
      </div>

      {/* Thread Conversation */}
      <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-6">
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          {az.tickets.threadTitle}
        </h2>

        <div className="space-y-4">
          {ticket.messages?.map((msg: TicketMessage, idx: number) => {
            const isAdmin = msg.senderRole === 'ADMIN';

            return (
              <div
                key={idx}
                className={`p-4 rounded-2xl border text-xs leading-relaxed space-y-2 ${
                  isAdmin
                    ? 'bg-brand-50/60 border-brand-200 text-brand-950 ml-4 sm:ml-8'
                    : 'bg-slate-50 border-slate-200 text-slate-800 mr-4 sm:mr-8'
                }`}
              >
                <div className="flex items-center justify-between gap-2 pb-1 border-b border-slate-200/40">
                  <div className="flex items-center gap-2">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${
                      isAdmin ? 'bg-brand-600 text-white' : 'bg-slate-300 text-slate-700'
                    }`}>
                      {isAdmin ? <Shield className="w-3 h-3" /> : <User className="w-3 h-3" />}
                    </div>
                    <span className="font-bold text-slate-900">
                      {msg.senderName || (isAdmin ? 'Dəstək Xidməti' : 'İstifadəçi')}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-white border border-slate-200 text-slate-500">
                      {isAdmin ? az.auth.roles.ADMIN : az.auth.roles.USER}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" />
                    {new Date(msg.createdAt).toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit' })},{' '}
                    {new Date(msg.createdAt).toLocaleDateString('az-AZ')}
                  </span>
                </div>
                <p className="whitespace-pre-line text-slate-700">{msg.message}</p>
              </div>
            );
          })}
        </div>

        {/* Global Error Banner */}
        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Reply Form */}
        {isClosed ? (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-500 font-medium">
            {az.tickets.closedNotice}
          </div>
        ) : (
          <form onSubmit={handleSend} className="space-y-3 pt-4 border-t border-slate-100">
            <textarea
              rows={3}
              value={replyMessage}
              onChange={(e) => setReplyMessage(e.target.value)}
              placeholder={az.tickets.replyPlaceholder}
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              required
            />
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={sendMutation.isPending}
                className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-2"
              >
                {sendMutation.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                <span>{az.tickets.sendReply}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
