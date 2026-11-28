import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  RotateCcw,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  X,
} from 'lucide-react';
import { adminRefundsApi, RefundItem } from '../admin-refunds.api';
import { az } from '../../../i18n/az';
import { formatAznPrice } from '../../../i18n/currency';

export const AdminRefundsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeModal, setActiveModal] = useState<{
    refund: RefundItem;
    action: 'APPROVE' | 'REJECT';
  } | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-refunds'],
    queryFn: () => adminRefundsApi.getAdminRefunds(),
  });

  const refunds = data?.refunds || data?.data || [];

  const decideMutation = useMutation({
    mutationFn: ({ refundId, action, notes }: { refundId: string; action: 'APPROVE' | 'REJECT'; notes?: string }) =>
      adminRefundsApi.decideRefund(refundId, action, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-refunds'] });
      setActiveModal(null);
      setAdminNotes('');
      setErrorMsg(null);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.message || 'Qərar verilərkən xəta baş verdi.');
    },
  });

  const handleDecision = () => {
    if (!activeModal) return;
    decideMutation.mutate({
      refundId: activeModal.refund._id,
      action: activeModal.action,
      notes: adminNotes.trim() || undefined,
    });
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <RotateCcw className="w-6 h-6 text-brand-600" />
          <span>{az.admin.refunds.title}</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Alıcıların təqdim etdiyi geri qaytarma müraciətlərini araşdırın və təsdiq/imtina qərarı verin.
        </p>
      </div>

      {/* Global Error Banner */}
      {errorMsg && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Table Card */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-20 flex justify-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : refunds.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-400">
            {az.admin.refunds.empty}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3.5 px-4">{az.admin.refunds.colOrder}</th>
                  <th className="py-3.5 px-4">{az.admin.refunds.colBuyer}</th>
                  <th className="py-3.5 px-4">{az.admin.refunds.colProject}</th>
                  <th className="py-3.5 px-4">{az.admin.refunds.colAmount}</th>
                  <th className="py-3.5 px-4">{az.admin.refunds.colReason}</th>
                  <th className="py-3.5 px-4">{az.admin.refunds.colStatus}</th>
                  <th className="py-3.5 px-4 text-right">{az.admin.refunds.colActions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {refunds.map((ref: RefundItem) => {
                  const isPending = ref.status === 'PENDING';
                  const buyerName = ref.buyerId?.fullName || 'Alıcı';
                  const buyerEmail = ref.buyerId?.email || '';
                  const projectTitle = ref.projectId?.title || 'Layihə';
                  const orderNumber = ref.orderId?.orderNumber || 'ORD-N/A';

                  return (
                    <tr key={ref._id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-800">{orderNumber}</td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">{buyerName}</div>
                        <div className="text-[10px] text-slate-400">{buyerEmail}</div>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-700 max-w-xs truncate">
                        {projectTitle}
                      </td>
                      <td className="py-3.5 px-4 font-extrabold text-brand-600">
                        {formatAznPrice(ref.refundAmount)}
                      </td>
                      <td className="py-3.5 px-4 max-w-sm">
                        <div className="font-semibold text-slate-800">{ref.reason}</div>
                        {ref.details && (
                          <div className="text-[11px] text-slate-500 truncate">{ref.details}</div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            ref.status === 'APPROVED'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : ref.status === 'REJECTED'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {ref.status === 'APPROVED'
                            ? 'Təsdiqləndi'
                            : ref.status === 'REJECTED'
                            ? 'İmtina edildi'
                            : 'Gözləyir'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {isPending && (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setActiveModal({ refund: ref, action: 'APPROVE' })}
                              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[11px] transition-colors"
                            >
                              {az.admin.refunds.approve}
                            </button>
                            <button
                              type="button"
                              onClick={() => setActiveModal({ refund: ref, action: 'REJECT' })}
                              className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-[11px] transition-colors"
                            >
                              {az.admin.refunds.reject}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Decision Confirmation Modal */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2">
                {activeModal.action === 'APPROVE' ? (
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                ) : (
                  <XCircle className="w-5 h-5 text-rose-600" />
                )}
                <h3 className="font-bold text-slate-800 text-sm">
                  {activeModal.action === 'APPROVE'
                    ? az.admin.refunds.approveModalTitle
                    : az.admin.refunds.rejectModalTitle}
                </h3>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                {activeModal.action === 'APPROVE'
                  ? az.admin.refunds.approveModalDesc
                  : az.admin.refunds.rejectModalDesc}
              </p>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  {az.admin.refunds.adminNotesPlaceholder}
                </label>
                <textarea
                  rows={3}
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Qərar barədə izahat..."
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  İmtina
                </button>
                <button
                  type="button"
                  disabled={decideMutation.isPending}
                  onClick={handleDecision}
                  className={`px-5 py-2 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5 ${
                    activeModal.action === 'APPROVE'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {decideMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Təsdiqlə</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
