import crypto from 'node:crypto';

const DEFAULT_SALT = 'mazhaveyil_default_salt_2026';
const MASKING_THRESHOLD = 5;

/**
 * Hash a roof_id with the server-side salt to prevent raw roof/house mapping
 */
export function hashHousehold(roofId, salt = process.env.HOUSEHOLD_SALT || DEFAULT_SALT) {
  if (!roofId) {
    throw new Error('roofId is required for household hash');
  }
  return crypto.createHash('sha256').update(String(roofId) + String(salt)).digest('hex');
}

/**
 * Mask consumer number, retaining only the last 4 digits
 * e.g. "1155020004821" -> "XXXXXX4821"
 */
export function maskConsumerNumber(consumerNo) {
  if (!consumerNo) return null;
  const str = String(consumerNo).trim();
  if (str.length <= 4) return 'XXXX';
  const last4 = str.slice(-4);
  return 'X'.repeat(Math.max(6, str.length - 4)) + last4;
}

/**
 * Apply small-number masking for ward counts.
 * If count is below threshold (e.g. 5), returns null or masked label
 */
export function applySmallNumberMasking(count, threshold = MASKING_THRESHOLD) {
  if (count < threshold) {
    return {
      count: null,
      display: `< ${threshold}`,
      isMasked: true
    };
  }
  return {
    count,
    display: String(count),
    isMasked: false
  };
}
