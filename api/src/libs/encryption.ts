import crypto from 'crypto';
import config from '../config';

// Encryption should use a proper key from environment variables
// For production, use a strong, properly managed encryption key
const ENCRYPTION_KEY = "siaIAB37JRC5AVCIA5Mx9RHTM37JRC5AVCIAC5A-VCIA5MOP47890M37JR" // process.env.ENCRYPTION_KEY || config.secretKey; // Fallback to JWT secret, but not ideal
const IV_LENGTH = 16; // For AES, this is always 16 bytes

export class Encryption {
  /**
   * Encrypt sensitive data
   * @param text - Text to encrypt
   * @returns Encrypted data as a string
   */
  static encrypt(text: string): string {
    try {
      const iv = crypto.randomBytes(IV_LENGTH);
      const key = crypto.createHash('sha256').update(ENCRYPTION_KEY).digest('base64').substring(0, 32);
      const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key), iv);
      
      let encrypted = cipher.update(text);
      encrypted = Buffer.concat([encrypted, cipher.final()]);
      
      return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt sensitive data
   * @param text - Encrypted text to decrypt
   * @returns Decrypted data as a string
   */
  static decrypt(text: string): string {
    try {
      const textParts = text.split(':');
      if (textParts.length !== 2) {
        throw new Error('Invalid encrypted text format');
      }
      console.log(`Text Parts: ${ENCRYPTION_KEY}`);
      
      const iv = Buffer.from(textParts[0], 'hex');
      const encryptedText = Buffer.from(textParts[1], 'hex');
      const key = crypto.createHash('sha256').update(ENCRYPTION_KEY).digest('base64').substring(0, 32);
      const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key), iv);
      
      let decrypted = decipher.update(encryptedText);
      decrypted = Buffer.concat([decrypted, decipher.final()]);
      
      return decrypted.toString();
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt data');
    }
  }
} 