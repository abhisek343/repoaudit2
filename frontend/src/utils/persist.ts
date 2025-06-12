import { set as idbSet, get as idbGet } from 'idb-keyval';
import type { AnalysisResult } from '../types';

function isQuotaExceeded(err: unknown) {
  return (
    err instanceof DOMException &&
    (err.code === 22 ||
      err.code === 1014 ||
      err.name === 'QuotaExceededError' ||
      err.name === 'NS_ERROR_DOM_QUOTA_REACHED')
  );
}

/**
 * Persist the report: try localStorage first (quick), fall back to IndexedDB
 * when it is too big.
 */
export async function persistReport(
  key: string,
  report: Partial<AnalysisResult>
) {
  const payload = JSON.stringify(report);
  try {
    localStorage.setItem(key, payload);
  } catch (err) {
    if (isQuotaExceeded(err)) {
      // Fallback – no size limit worth worrying about.
      await idbSet(key, payload);
    } else {
      throw err;
    }
  }
}

export async function loadReport(key: string) {
  const fromLS = localStorage.getItem(key);
  if (fromLS) return JSON.parse(fromLS);

  const fromIDB = await idbGet(key);
  return fromIDB ? JSON.parse(fromIDB as string) : null;
}
