/**
 * Sharing a company reuses the Mini App's deep link: `t.me/TrueGis_bot/start?startapp=<payload>`,
 * where the payload is the base64url of `{ webAppId, path }` (`app/utils/startParam.ts`).
 */
const BOT_LINK = 'https://t.me/TrueGis_bot/start?startapp=';

const BASE64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** Hermes has no `btoa`, and the payload is plain ASCII JSON, so a small encoder is enough. */
function base64(input: string): string {
  let output = '';

  for (let index = 0; index < input.length; index += 3) {
    const chunk =
      (input.charCodeAt(index) << 16) |
      ((index + 1 < input.length ? input.charCodeAt(index + 1) : 0) << 8) |
      (index + 2 < input.length ? input.charCodeAt(index + 2) : 0);

    output +=
      BASE64_ALPHABET[(chunk >> 18) & 63] +
      BASE64_ALPHABET[(chunk >> 12) & 63] +
      (index + 1 < input.length ? BASE64_ALPHABET[(chunk >> 6) & 63] : '=') +
      (index + 2 < input.length ? BASE64_ALPHABET[chunk & 63] : '=');
  }

  return output;
}

export function companyStartParam(companyId: string, path = '/'): string {
  return base64(JSON.stringify({ webAppId: companyId, path }))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

export function companyShareLink(companyId: string, path = '/'): string {
  return `${BOT_LINK}${companyStartParam(companyId, path)}`;
}
