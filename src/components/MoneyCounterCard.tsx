import React, { useState } from 'react';
import { Wallet, ArrowUpRight, CheckCircle2, ChevronDown, ChevronUp, PlusCircle } from 'lucide-react';
import { AppRole, LedgerTransaction } from '../types/appTypes';
import { calculateRoleEarnings } from '../utils/appLogic';

interface MoneyCounterCardProps {
  role: AppRole;
  ledger: LedgerTransaction[];
  upiId?: string;
  onSimulateBonusPayout?: () => void;
}

export const MoneyCounterCard: React.FC<MoneyCounterCardProps> = ({
  role,
  ledger,
  upiId = 'verified.partner@okicici',
  onSimulateBonusPayout,
}) => {
  const [showLedger, setShowLedger] = useState(true);
  const [payoutRequested, setPayoutRequested] = useState(false);

  const { totalEarningsINR, completedCount, roleTransactions } =
    calculateRoleEarnings(ledger, role);

  const roleTitle =
    role === 'delivery'
      ? 'Delivery & Measurement Money Counter'
      : 'Tailor Atelier Money Counter';

  const roleSubtitle =
    role === 'delivery'
      ? 'Shared payout ledger · Measurement-only visits & cloth logistics'
      : 'Shared payout ledger · Stitching & alteration settlements';

  const handleInstantWithdraw = () => {
    setPayoutRequested(true);
    setTimeout(() => setPayoutRequested(false), 3000);
  };

  return (
    <section
      aria-label={roleTitle}
      className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6"
    >
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>Shared Earnings Architecture</span>
            <span aria-hidden="true">·</span>
            <span>UPI Auto-Settlement ({upiId})</span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 mt-1 flex items-center gap-2">
            <Wallet className="w-5 h-5 text-indigo-600 shrink-0" />
            <span>{roleTitle}</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">{roleSubtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-6">
          <div>
            <div className="text-xs text-slate-500">Completed Payout Balance</div>
            <div
              data-testid={`money-counter-total-${role}`}
              className="text-2xl sm:text-3xl font-bold text-slate-900 font-mono tabular-nums tracking-tight"
            >
              INR {totalEarningsINR.toLocaleString('en-IN')}
            </div>
          </div>

          <div className="border-l border-slate-200 pl-5">
            <div className="text-xs text-slate-500">Settled Tasks</div>
            <div
              data-testid={`money-counter-count-${role}`}
              className="text-xl font-bold text-slate-900 font-mono tabular-nums"
            >
              {completedCount}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleInstantWithdraw}
              className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>{payoutRequested ? 'Settled to Bank ✓' : 'Withdraw to UPI'}</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
            {onSimulateBonusPayout && (
              <button
                type="button"
                onClick={onSimulateBonusPayout}
                className="px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5 text-indigo-600" />
                <span>Log Sample Payout</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Expandable Ledger History */}
      <div className="pt-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-slate-700">
            Recent Completed Payout Ledger ({roleTransactions.length})
          </span>
          <button
            type="button"
            onClick={() => setShowLedger((prev) => !prev)}
            className="text-xs font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
          >
            <span>{showLedger ? 'Hide Ledger' : 'Show Ledger'}</span>
            {showLedger ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        {showLedger && (
          <div className="divide-y divide-slate-100">
            {roleTransactions.length === 0 ? (
              <div className="py-6 text-center text-sm text-slate-500">
                No completed payouts recorded yet. Complete a task or order to credit your Money Counter.
              </div>
            ) : (
              roleTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="py-2.5 flex items-center justify-between gap-4 text-sm"
                >
                  <div className="min-w-0">
                    <div className="font-medium text-slate-900 truncate">
                      {tx.description}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                      <span className="font-mono tabular-nums">Order #{tx.orderNumber}</span>
                      <span aria-hidden="true">·</span>
                      <span>{tx.categoryLabel}</span>
                      <span aria-hidden="true">·</span>
                      <span>{tx.timestamp}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">{tx.status}</span>
                    </span>
                    <span className="font-mono tabular-nums font-semibold text-slate-900">
                      +INR {tx.amountINR.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </section>
  );
};
