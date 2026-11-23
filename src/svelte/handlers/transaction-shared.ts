import type { Transaksi } from '../../types/finkas';
/**
 * @module handlers/transaction-shared
 * Shared helpers and state integration for cash transactions.
 */

import { getState, addTransaction, saveCache } from "../../core/state.js";
import { generateTempId, requestAppRefresh } from "../../core/mutation.js";
import {
  renderDashboard,
  renderTableTransaksi,
  renderTableRekap,
  renderChart,
  populateTahunRekap
} from "../render/index";

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
