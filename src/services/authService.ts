export type LoginPayload = { identifier: string; password: string };
export type RegisterPayload = { name: string; email: string; phone: string; password: string };

const wait = (duration = 700) => new Promise<void>((resolve) => window.setTimeout(resolve, duration));

// Keep the network boundary in one place so the mock can be replaced by the real API.
export const authService = {
  async login(_payload: LoginPayload) { await wait(); return { ok: true }; },
  async register(_payload: RegisterPayload) { await wait(); return { ok: true }; },
  async verifyOtp(_identifier: string, _otp: string) { await wait(650); return { ok: true }; },
  async resendOtp(_identifier: string) { await wait(450); return { ok: true }; },
  async resetPassword(_identifier: string, _password: string) { await wait(); return { ok: true }; },
};