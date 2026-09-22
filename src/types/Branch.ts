export interface Branch {
  id: string;
  name: string;
  address: string;
  /** IANA zone. Applied to every date/time the app renders — see lib/format.ts. */
  timezone: string;
  /** ISO 4217 code. Drives currency formatting — see lib/format.ts. */
  currency: string;
}
