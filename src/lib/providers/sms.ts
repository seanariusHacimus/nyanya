/**
 * SMS provider abstraction (plan §13). Mock-first: a fixed dev code stands in
 * for real Eskiz.uz / Play Mobile delivery. Swap the implementation by env.
 */
export interface SmsProvider {
  sendOtp(phone: string, code: string): Promise<void>;
}

export const DEV_OTP = "123456";

class MockSmsProvider implements SmsProvider {
  async sendOtp(phone: string, code: string) {
    console.log(`[mock-sms] OTP for ${phone}: ${code}`);
  }
}

function resolveProvider(): SmsProvider {
  switch (process.env.SMS_PROVIDER) {
    // case "eskiz": return new EskizSmsProvider();
    // case "playmobile": return new PlayMobileSmsProvider();
    default:
      return new MockSmsProvider();
  }
}

export const smsProvider = resolveProvider();
