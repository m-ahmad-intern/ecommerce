import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter;

  constructor() {
    // Initialize email transporter with real or test credentials
    this.initializeTransporter();
  }

  private async initializeTransporter() {
    try {
      // Check if we have real email credentials in environment
      const emailUser = process.env.EMAIL_USER;
      const emailPass = process.env.EMAIL_PASS;
      const emailService = process.env.EMAIL_SERVICE || 'gmail';

      if (emailUser && emailPass) {
        // Use real email service (Gmail, Outlook, etc.)
        this.transporter = nodemailer.createTransport({
          service: emailService,
          auth: {
            user: emailUser,
            pass: emailPass,
          },
        });
        console.log(`Email service initialized with ${emailService}`);
        console.log(`Using email: ${emailUser}`);
      } else {
        // Fallback to test account for development
        console.log('No email credentials found, using test account...');
        await this.createTestAccount();
      }
    } catch (error) {
      console.error('Failed to initialize email service:', error);
      // Fallback to test account
      await this.createTestAccount();
    }
  }

  private async createTestAccount() {
    try {
      // Create test account for development
      const testAccount = await nodemailer.createTestAccount();

      this.transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });

      console.log('Email service initialized with test account');
      console.log(`Test email user: ${testAccount.user}`);
    } catch (error) {
      console.error('Failed to create email test account:', error);
    }
  }

  async sendOTP(
    email: string,
    otp: string,
    type: 'verification' | 'password-reset' = 'verification',
  ): Promise<void> {
    try {
      const subject =
        type === 'verification'
          ? 'Verify Your Email - E-Commerce Store'
          : 'Password Reset - E-Commerce Store';

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">${type === 'verification' ? 'Email Verification' : 'Password Reset'}</h2>
          <p>Hello,</p>
          <p>${
            type === 'verification'
              ? 'Thank you for registering with our E-Commerce Store. Please use the following OTP to verify your email address:'
              : 'You have requested to reset your password. Please use the following OTP:'
          }</p>
          
          <div style="background-color: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0;">
            <h1 style="color: #007bff; font-size: 32px; margin: 0; letter-spacing: 5px;">${otp}</h1>
          </div>
          
          <p><strong>This OTP will expire in 10 minutes.</strong></p>
          <p>If you didn't request this ${type === 'verification' ? 'verification' : 'password reset'}, please ignore this email.</p>
          
          <hr style="margin: 30px 0;">
          <p style="color: #666; font-size: 12px;">
            This is an automated email from E-Commerce Store. Please do not reply to this email.
          </p>
        </div>
      `;

      // Determine the "from" email based on service type
      const fromEmail = process.env.EMAIL_USER 
        ? `"E-Commerce Store" <${process.env.EMAIL_USER}>`
        : '"E-Commerce Store" <noreply@ecommerce.com>';

      const info = await this.transporter.sendMail({
        from: fromEmail,
        to: email,
        subject: subject,
        html: html,
      });

      console.log('Email sent successfully');
      
      // Only show preview URL for test emails
      if (!process.env.EMAIL_USER) {
        console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
      } else {
        console.log(`Email sent to: ${email}`);
      }
    } catch (error) {
      console.error('Failed to send email:', error);
      throw new Error('Failed to send verification email');
    }
  }

  generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}
