import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  ShoppingBag,
  Download,
  Star,
  RotateCcw,
  Calendar,
  AlertCircle,
  Loader2,
  ExternalLink,
  X,
} from 'lucide-react';
import { ordersApi, OrderItem } from '../orders.api';
import { downloadsApi } from '../../downloads/downloads.api';
import { az } from '../../../i18n/az';
import { formatAznPrice } from '../../../i18n/currency';

export const MyOrdersPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  // Refund Modal State
  const [refundModalOrder, setRefundModalOrder] = useState<OrderItem | null>(null);
  const [refundReason, setRefundReason] = useState('');
  const [refundDetails, setRefundDetails] = useState('');
  const [refundError, setRefundError] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['my-orders'],
    queryFn: () => ordersApi.getMyOrders(1, 50),
  });

  const orders = data?.data || data?.orders || [];

  const refundMutation = useMutation({
    mutationFn: ({ orderId, reason, details }: { orderId: string; reason: string; details: string }) =>
      ordersApi.requestRefund(orderId, reason, details),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-orders'] });
      setRefundModalOrder(null);
      setRefundReason('');
      setRefundDetails('');
      setRefundError(null);
    },
    onError: (err: any) => {
      setRefundError(err.response?.data?.message || 'Geri qaytarma müraciəti göndərilərkən xəta baş verdi.');
    },
  });

  const handleDownload = async (order: OrderItem) => {
    const project = order.projectId;
    if (!project) return;

    const projectId = project._id || project.id || '';
    const file = project.publicFiles?.[0];
    const fileId = file?.fileId || 'main-asset';
    const fileName = file?.originalName || `${project.slug || 'project'}-assets.zip`;

    setDownloadingId(order._id);
    setDownloadError(null);

    try {
      await downloadsApi.downloadFile(projectId, fileId, fileName);
    } catch (err: any) {
      setDownloadError(err.response?.data?.message || 'Fayl yüklənərkən xəta baş verdi.');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleRefundSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!refundReason.trim()) {
      setRefundError('Bu xana mütləq doldurulmalıdır');
      return;
    }
    if (!refundModalOrder) return;

    refundMutation.mutate({
      orderId: refundModalOrder._id,
      reason: refundReason.trim(),
      details: refundDetails.trim(),
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID':
        return (
          <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            {az.status.PAID}
          </span>
        );
      case 'PENDING':
        return (
          <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-amber-50 text-amber-700 border border-amber-200">
            {az.status.PENDING}
          </span>
        );
      case 'REFUND_REQUESTED':
        return (
          <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-blue-50 text-blue-700 border border-blue-200">
            {az.status.REFUND_REQUESTED}
          </span>
        );
      case 'REFUNDED':
        return (
          <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-purple-50 text-purple-700 border border-purple-200">
            {az.status.REFUNDED}
          </span>
        );
      case 'FAILED':
        return (
          <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-rose-50 text-rose-700 border border-rose-200">
            {az.status.FAILED}
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-slate-100 text-slate-700">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Page Header */}
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
          <ShoppingBag className="w-7 h-7 text-brand-600" />
          <span>{az.orders.title}</span>
        </h1>
        <p className="text-sm text-slate-500">{az.orders.subtitle}</p>
      </div>

      {/* Global Query Error Banner */}
      {isError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-xs text-rose-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{az.errors.generic}</span>
        </div>
      )}

      {/* Global Download Error Banner */}
      {downloadError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-xs text-rose-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{downloadError}</span>
        </div>
      )}

      {/* Orders List */}
      {isLoading ? (
        <div className="py-20 flex justify-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      ) : orders.length === 0 ? (
        <div className="py-16 text-center bg-white border border-dashed border-slate-200 rounded-3xl p-8 space-y-4 shadow-sm">
          <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto">
            <ShoppingBag className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-slate-800 text-base">{az.orders.empty}</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Feed Lab kataloqunda minlərlə təsdiqlənmiş mühəndislik layihəsi mövcuddur.
            </p>
          </div>
          <Link
            to="/catalog"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl text-xs shadow-sm transition-all"
          >
            <span>{az.orders.exploreCatalog}</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order: OrderItem) => {
            const project = order.projectId || {};
            const isPaid = order.status === 'PAID';
            const isDownloading = downloadingId === order._id;

            return (
              <div
                key={order._id}
                className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:border-slate-300 transition-all space-y-4"
              >
                {/* Order Top Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 text-xs">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-slate-900">{order.orderNumber}</span>
                    <span className="text-slate-400">•</span>
                    <span className="flex items-center gap-1 text-slate-500">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {new Date(order.createdAt).toLocaleDateString('az-AZ')}
                    </span>
                  </div>
                  <div>{getStatusBadge(order.status)}</div>
                </div>

                {/* Order Details Body */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex-shrink-0 flex items-center justify-center">
                      {project.thumbnailUrl ? (
                        <img
                          src={project.thumbnailUrl}
                          alt={project.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <ShoppingBag className="w-6 h-6 text-slate-400" />
                      )}
                    </div>
                    <div className="space-y-1">
                      <Link
                        to={`/projects/${project.slug || project._id}`}
                        className="font-bold text-slate-900 hover:text-brand-600 text-sm transition-colors"
                      >
                        {project.title || 'Layihə'}
                      </Link>
                      <div className="text-xs font-black text-brand-600">
                        {formatAznPrice(order.price ?? order.amount ?? 0)}
                      </div>
                    </div>
                  </div>

                  {/* Order Actions */}
                  <div className="flex flex-wrap items-center gap-2 pt-2 sm:pt-0">
                    {isPaid && (
                      <>
                        <button
                          type="button"
                          disabled={isDownloading}
                          onClick={() => handleDownload(order)}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all"
                        >
                          {isDownloading ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Download className="w-3.5 h-3.5" />
                          )}
                          <span>{az.orders.download}</span>
                        </button>

                        <Link
                          to={`/projects/${project.slug || project._id}`}
                          className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs flex items-center gap-1.5 transition-colors"
                        >
                          <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                          <span>{az.orders.writeReview}</span>
                        </Link>

                        <button
                          type="button"
                          onClick={() => {
                            setRefundModalOrder(order);
                            setRefundError(null);
                          }}
                          className="px-3.5 py-2 bg-slate-50 hover:bg-rose-50 text-slate-600 hover:text-rose-700 font-semibold rounded-xl text-xs flex items-center gap-1.5 border border-slate-200 hover:border-rose-200 transition-colors"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>{az.orders.requestRefund}</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Refund Request Modal */}
      {refundModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-rose-600" />
                <h3 className="font-bold text-slate-800 text-sm">
                  {az.orders.requestRefund}: {refundModalOrder.orderNumber}
                </h3>
              </div>
              <button
                type="button"
                aria-label={az.common.close}
                onClick={() => setRefundModalOrder(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRefundSubmit} className="p-6 space-y-4">
              {refundError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-700">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{refundError}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Geri Qaytarma Səbəbi</label>
                <input
                  type="text"
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  placeholder="Məsələn: Fayllar açılmır, təsvirə uyğun deyil..."
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-500"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Ətraflı İzah (İstəyə bağlı)</label>
                <textarea
                  rows={3}
                  value={refundDetails}
                  onChange={(e) => setRefundDetails(e.target.value)}
                  placeholder="Qarşılaşdığınız problemi ətraflı qeyd edin..."
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRefundModalOrder(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  İmtina
                </button>
                <button
                  type="submit"
                  disabled={refundMutation.isPending}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5"
                >
                  {refundMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Göndər</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
