import type { Transaksi } from '../../types/finkas';
/**
 * @module handlers/transaction-shared
 * Shared helpers and state integration for cash transactions.
 */

import { getState, addTransaction, saveCache } from "finkas/core/state";
import { generateTempId, requestAppRefresh } from "finkas/core/mutation";
import {
  renderDashboard,
  renderTableTransaksi,
  renderTableRekap,
  renderChart,
  populateTahunRekap
} from "../stores/workspace-sync";

export const refreshAppData = async () => {
  requestAppRefresh();
};

export const tempTransactionId = () => generateTempId('TRX');

/**
 * Add confirmed server transaction row to state and persist cache, or trigger
 * full refresh if row already exists or was not returned.
 */
export const integrateServerTransaction = (serverRow: Transaksi | null) => {
  if (!serverRow) {
    refreshAppData();
    return;
  }
  const alreadyExists = (getState().transaksi || []).some((t) => t.ID_Transaksi === serverRow.ID_Transaksi);
  if (!alreadyExists) {
    addTransaction(serverRow);
    saveCache();
  } else {
    refreshAppData();
  }
};

/**
 * Re-render every major UI view affected by a ledger change.
 */
export const rerenderAfterLedgerChange = () => {
  populateTahunRekap();
  renderDashboard();
  renderTableTransaksi();
  renderTableRekap();
  renderChart();
};
