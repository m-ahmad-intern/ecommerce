import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { User, UserDocument } from '../../schemas/user.schema';
import { EmailService } from './email.service';
import {
  RegisterDto,
  LoginDto,
  VerifyEmailDto,
  ResendOtpDto,
  UpdateProfileDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private jwtService: JwtService,
    private emailService: EmailService,
  ) {}

  async register(registerDto: RegisterDto) {
    const { email, password, firstName, lastName } = registerDto;

    // Check if user already exists
    const existingUser = await this.userModel.findOne({ email });
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Generate OTP
    const otp = this.emailService.generateOTP();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Create user
    const user = new this.userModel({
      email,
      password: hashedPassword,
      firstName,
      lastName,
      isActive: true, // Explicitly set new users as active
      emailVerificationOTP: otp,
      otpExpiresAt,
    });

    await user.save();

    // Send verification email
    await this.emailService.sendOTP(email, otp, 'verification');

    return {
      message:
        'User registered successfully. Please check your email for verification code.',
      email,
    };
  }

  async verifyEmail(verifyEmailDto: VerifyEmailDto) {
    const { email, otp } = verifyEmailDto;

    const user = await this.userModel.findOne({ email });
    if (!user) {
      throw new UnauthorizedException('Invalid email or OTP');
    }

    if (user.isEmailVerified) {
      throw new BadRequestException('Email already verified');
    }

    if (!user.emailVerificationOTP || user.emailVerificationOTP !== otp) {
      throw new UnauthorizedException('Invalid OTP');
    }

    if (user.otpExpiresAt && user.otpExpiresAt < new Date()) {
      throw new UnauthorizedException('OTP has expired');
    }

    // Update user
    user.isEmailVerified = true;
    user.emailVerificationOTP = undefined;
    user.otpExpiresAt = undefined;
    await user.save();

    return {
      message: 'Email verified successfully. You can now login.',
    };
  }

  async resendOtp(resendOtpDto: ResendOtpDto) {
    const { email } = resendOtpDto;

    const user = await this.userModel.findOne({ email });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (user.isEmailVerified) {
      throw new BadRequestException('Email already verified');
    }

    // Generate new OTP
    const otp = this.emailService.generateOTP();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    user.emailVerificationOTP = otp;
    user.otpExpiresAt = otpExpiresAt;
    await user.save();

    // Send verification email
    await this.emailService.sendOTP(email, otp, 'verification');

    return {
      message: 'New verification code sent to your email.',
    };
  }

  async checkEmailStatus(email: string) {
    const user = await this.userModel.findOne({ email });
    
    if (!user) {
      return {
        exists: false,
        isVerified: false,
      };
    }

    return {
      exists: true,
      isVerified: user.isEmailVerified,
    };
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    // Find user
    const user = await this.userModel.findOne({ email });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if email is verified
    if (!user.isEmailVerified) {
      throw new UnauthorizedException('Please verify your email first');
    }

    // Check if account is active (not suspended)
    if (!user.isActive) {
      throw new UnauthorizedException('Your account has been suspended. Please contact support.');
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate JWT token
    const payload = { userId: user._id, email: user.email, role: user.role };
    const token = this.jwtService.sign(payload);

    return {
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    };
  }

  async getProfile(userId: string) {
    const user = await this.userModel
      .findById(userId)
      .select('-password -emailVerificationOTP -passwordResetOTP');
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }

  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto) {
    const user = await this.userModel
      .findByIdAndUpdate(userId, updateProfileDto, {
        new: true,
        runValidators: true,
      })
      .select('-password -emailVerificationOTP -passwordResetOTP');

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      message: 'Profile updated successfully',
      user,
    };
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const { email } = forgotPasswordDto;

    const user = await this.userModel.findOne({ email });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (!user.isEmailVerified) {
      throw new UnauthorizedException('Please verify your email first');
    }

    // Generate OTP for password reset
    const otp = this.emailService.generateOTP();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    user.passwordResetOTP = otp;
    user.passwordResetExpiresAt = otpExpiresAt;
    await user.save();

    // Send reset email
    await this.emailService.sendOTP(email, otp, 'password-reset');

    return {
      message: 'Password reset code sent to your email.',
    };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const { email, otp, newPassword } = resetPasswordDto;

    const user = await this.userModel.findOne({ email });
    if (!user) {
      throw new UnauthorizedException('Invalid email or OTP');
    }

    if (!user.passwordResetOTP || user.passwordResetOTP !== otp) {
      throw new UnauthorizedException('Invalid OTP');
    }

    if (
      user.passwordResetExpiresAt &&
      user.passwordResetExpiresAt < new Date()
    ) {
      throw new UnauthorizedException('OTP has expired');
    }

    // Hash new password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update user
    user.password = hashedPassword;
    user.passwordResetOTP = undefined;
    user.passwordResetExpiresAt = undefined;
    await user.save();

    return {
      message:
        'Password reset successfully. You can now login with your new password.',
    };
  }
}
