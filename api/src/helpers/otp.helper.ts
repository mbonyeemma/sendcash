import crypto from 'crypto';
import { setItem, getItem } from './connectRedis';

export class OTPHelper {
  private static OTP_EXPIRY = 5 * 60; // 5 minutes in seconds

  static async generateOTP(email: string): Promise<string> {
    const otp = crypto.randomInt(100000, 999999).toString();
    await setItem(`otp_${email}`, otp, OTPHelper.OTP_EXPIRY);
    return otp;
  }

  static async verifyOTP(email: string, otp: string): Promise<boolean> {
    const storedOTP = await getItem(`otp_${email}`);
    return storedOTP === otp;
  }

  static async sendOTP(email: string, firstName: string): Promise<void> {
    const otp = await this.generateOTP(email);
    // Use your existing email helper to send the OTP
    // Example: await sendEmail('OTP_VERIFICATION', email, firstName, otp);
  }
} 