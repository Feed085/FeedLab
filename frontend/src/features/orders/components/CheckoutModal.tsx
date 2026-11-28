import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  CreditCard,
  ShieldCheck,
  CheckCircle,
  Download,
  AlertCircle,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { ordersApi } from '../orders.api';
import { downloadsApi } from '../../downloads/downloads.api';
import { az } from '../../../i18n/az';
import { formatAznPrice } from '../../../i18n/currency';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: {
    _id?: string;
    id?: string;
    title: string;
    slug: string;
    price: number;
    currency?: string;
    publicFiles?: any[];
  };
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  project,
}) => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successOrder, setSuccessOrder] = useState<any | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const projectId = project._id || project.id || '';
  const price = Number(project.price) || 0;
  const isFree = price === 0;

  const authorShare = Math.round(price * 0.8 * 100) / 100;
  const platformFee = Math.round(price * 0.2 * 100) / 100;

  const handleCheckoutAndPay = async () => {
    if (!isAuthenticated) {
      navigate(`/login?redirect=/projects/${project.slug}`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (isFree) {
        const order = await ordersApi.claimFree(projectId);
        setSuccessOrder(order);
      } else {
        // Step 1: Create pending order
        const createdOrder = await ordersApi.checkout(projectId, 'CARD');
        // Step 2: Confirm / Simulate payment
        const confirmed = await ordersApi.simulatePayment(createdOrder._id, 'SUCCESS');
        setSuccessOrder(confirmed.order || createdOrder);
      }
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        'Ödəniş zamanı xəta baş verdi. Zəhmət olmasa yenidən cəhd edin.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    const fileId = project.publicFiles?.[0]?.fileId || 'main';
    const fileName = project.publicFiles?.[0]?.originalName || `${project.slug}-files.zip`;
    try {
      await downloadsApi.downloadFile(projectId, fileId, fileName);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Fayl yüklənərkən xəta baş verdi.');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="checkout-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-brand-600" />
            <h3 id="checkout-modal-title" className="font-bold text-slate-800 text-base">
              {az.checkout.title}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
            aria-label={az.common.close}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          {successOrder ? (
            <div className="text-center space-y-4 py-4">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xl font-bold text-slate-900">{az.checkout.successTitle}</h4>
                <p className="text-sm text-slate-600 max-w-sm mx-auto">{az.checkout.successDesc}</p>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={handleDownload}
                  className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 shadow-sm transition-all"
                >
                  <Download className="w-4 h-4" />
                  <span>{az.orders.download}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    navigate('/orders/my');
                  }}
                  className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-sm flex items-center justify-center gap-2 transition-all"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>{az.checkout.goToOrders}</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Project Summary Card */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-3">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {az.checkout.summary}
                </div>
                <div className="flex items-start justify-between gap-4">
                  <span className="font-bold text-slate-900 text-sm">{project.title}</span>
                  <span className="font-black text-brand-600 text-base flex-shrink-0">
                    {formatAznPrice(price)}
                  </span>
                </div>

                {!isFree && (
                  <div className="pt-2 border-t border-slate-200/60 space-y-1.5 text-xs text-slate-500">
                    <div className="flex justify-between">
                      <span>{az.checkout.authorShare}</span>
                      <span className="font-medium text-slate-700">{formatAznPrice(authorShare)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{az.checkout.platformFee}</span>
                      <span className="font-medium text-slate-700">{formatAznPrice(platformFee)}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Payment Method Details */}
              <div className="space-y-3">
                <div className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  {az.checkout.paymentMethod}
                </div>
                {isFree ? (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800">
                    {az.checkout.freeClaimNotice}
                  </div>
                ) : (
                  <div className="p-3.5 bg-slate-50 border border-brand-200 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-brand-50 border border-brand-100 flex items-center justify-center text-brand-600">
                        <CreditCard className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-800 text-xs">{az.checkout.cardPayment}</div>
                        <div className="text-[11px] text-slate-500">
                          Kapital Bank / Pasha Bank Virtual Ödəniş Şlüzü
                        </div>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      Aktiv
                    </span>
                  </div>
                )}
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-xs text-rose-700">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Terms and License Agreement */}
              <div className="flex items-start gap-2 text-[11px] text-slate-500 leading-relaxed">
                <ShieldCheck className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                <span>{az.checkout.licenseAgreement}</span>
              </div>

              {/* Action Button */}
              <button
                type="button"
                disabled={loading}
                onClick={handleCheckoutAndPay}
                className="w-full py-3.5 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 text-white font-bold rounded-xl text-sm shadow-sm transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{az.checkout.processing}</span>
                  </>
                ) : (
                  <span>{isFree ? az.checkout.claimFree : az.checkout.confirmPay}</span>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
