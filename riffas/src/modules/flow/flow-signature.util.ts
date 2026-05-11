// src/modules/flow/flow-signature.util.ts
import * as crypto from 'crypto';

export function buildFlowSignature(
  params: Record<string, string | number>,
  secretKey: string,
): string {
  const sortedKeys = Object.keys(params).sort();
  const baseString = sortedKeys
    .map((key) => `${key}${params[key]}`)
    .join('');

  return crypto
    .createHmac('sha256', secretKey)
    .update(baseString)
    .digest('hex');
}
