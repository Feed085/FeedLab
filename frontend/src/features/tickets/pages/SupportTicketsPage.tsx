import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  LifeBuoy,
  Plus,
  MessageSquare,
  Clock,
  AlertCircle,
  Loader2,
  X,
  ChevronRight,
} from 'lucide-react';
import { ticketsApi, TicketItem } from '../tickets.api';
import { az } from '../../../i18n/az';

export const SupportTicketsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState<'TECHNICAL' | 'BILLING' | 'GENERAL' | 'ORDER' | 'REFUND'>('TECHNICAL');
  const [priority, setPriority] = useState('MEDIUM');
  const [description, setDescription] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['tickets'],
    queryFn: () => ticketsApi.getUserTickets(1, 50),
  });

  const tickets = data?.data || data?.tickets || [];

  const createTicketMutation = useMutation({
    mutationFn: (newTicket: {
      subject: string;
      category: string;
      description: string;
      priority: string;
    }) => ticketsApi.createTicket(newTicket),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      setShowModal(false);
      setSubject('');
      setDescription('');
      setErrorMsg(null);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.message || 'Bilet yaradılarkən xəta baş verdi.');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) {
      setErrorMsg('Bu xana mütləq doldurulmalıdır');
      return;
    }
    createTicketMutation.mutate({
      subject: subject.trim(),
      category,
      priority,
      description: description.trim(),
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            {az.status.OPEN}
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
            {az.status.IN_PROGRESS}
          </span>
        );
      case 'RESOLVED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
            {az.status.RESOLVED}
          </span>
        );
      case 'CLOSED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600">
            {az.status.CLOSED}
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <LifeBuoy className="w-7 h-7 text-brand-600" />
            <span>{az.tickets.title}</span>
          </h1>
          <p className="text-sm text-slate-500">{az.tickets.subtitle}</p>
        </div>

        <button
          type="button"
          onClick={() => {
            setShowModal(true);
            setErrorMsg(null);
          }}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl text-xs shadow-sm transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>{az.tickets.newTicket}</span>
        </button>
      </div>

      {/* Tickets List */}
      {isLoading ? (
        <div className="py-20 flex justify-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      ) : tickets.length === 0 ? (
        <div className="py-16 text-center bg-white border border-dashed border-slate-200 rounded-3xl p-8 space-y-4 shadow-sm">
          <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto">
            <LifeBuoy className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-slate-800 text-base">{az.tickets.empty}</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Hər hansı texniki çətinlik və ya sualınız olduqda dəstək komandamız sizə kömək etməyə hazırdır.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map((t: TicketItem) => (
            <Link
              key={t._id}
              to={`/tickets/${t._id}`}
              className="block bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:border-brand-300 hover:shadow-md transition-all"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-brand-600">{t.ticketNumber}</span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                      {az.tickets.categories[t.category] || t.category}
                    </span>
                    {getStatusBadge(t.status)}
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm group-hover:text-brand-600">
                    {t.subject}
                  </h3>
                </div>

                <div className="flex items-center gap-4 text-xs text-slate-400 self-end sm:self-auto">
                  <span className="flex items-center gap-1">
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>{t.messages?.length || 0}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{new Date(t.createdAt).toLocaleDateString('az-AZ')}</span>
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-300" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* New Ticket Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-brand-600" />
                <h3 className="font-bold text-slate-800 text-sm">{az.tickets.newTicket}</h3>
              </div>
              <button
                type="button"
                aria-label={az.common.close}
                onClick={() => setShowModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {errorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-700">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">{az.tickets.subject}</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder={az.tickets.subjectPlaceholder}
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">{az.tickets.category}</label>
                  <select
                    value={category}
                    onChange={(e: any) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-500"
                  >
                    <option value="TECHNICAL">{az.tickets.categories.TECHNICAL}</option>
                    <option value="BILLING">{az.tickets.categories.BILLING}</option>
                    <option value="GENERAL">{az.tickets.categories.GENERAL}</option>
                    <option value="ORDER">{az.tickets.categories.ORDER}</option>
                    <option value="REFUND">{az.tickets.categories.REFUND}</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">{az.tickets.priority}</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-500"
                  >
                    <option value="LOW">{az.tickets.priorities.LOW}</option>
                    <option value="MEDIUM">{az.tickets.priorities.MEDIUM}</option>
                    <option value="HIGH">{az.tickets.priorities.HIGH}</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">{az.tickets.description}</label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={az.tickets.descriptionPlaceholder}
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-500"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  İmtina
                </button>
                <button
                  type="submit"
                  disabled={createTicketMutation.isPending}
                  className="px-5 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5"
                >
                  {createTicketMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{az.tickets.submit}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
