import { Inject, Injectable } from '@nestjs/common';
import Logger, { LoggerKey } from 'src/core/logger/interfaces/logger.interface';
import { Model } from 'mongoose';
import { Tenant } from 'src/models/user/interface/user.interface';
import { GrpcUnauthenticatedException } from 'nestjs-grpc-exceptions';
import { generateOtp } from 'src/common/otp/otp';
import { MailerService } from '@nestjs-modules/mailer';
import { CACHE_MANAGER, CacheStore } from '@nestjs/cache-manager';
import {
    ISendMailRequest,
    ISendMailResponse,
    IVerifyAccountRequest,
    IVerifyAccountResponse,
} from './interface/verify_account.interface';

@Injectable()
export class VerifyAccountService {
    constructor(
        private readonly mailerService: MailerService,
        @Inject(LoggerKey) private logger: Logger,
        @Inject('TENANT_MODEL') private readonly User: Model<Tenant>,
        @Inject(CACHE_MANAGER) private cacheManager: CacheStore,
    ) {}

    async verifyAccount(data: IVerifyAccountRequest): Promise<IVerifyAccountResponse> {
        try {
            // Check if the user exists
            let user = await this.User.findOne({
                email: data.email,
                domain: data.domain,
            });
            if (!user) {
                throw new GrpcUnauthenticatedException('TENANT_NOT_FOUND');
            }
            if (user.is_active) {
                throw new GrpcUnauthenticatedException('TENANT_ALREADY_VERIFIED');
            }

            // Check OTP
            const otp = await this.cacheManager.get(`otp:${data.email}/${data.domain}`);

            if (!otp) throw new GrpcUnauthenticatedException('OTP_EXPIRED');
            if (otp !== data.otp) throw new GrpcUnauthenticatedException('OTP_INVALID');

            // Update user
            await this.User.updateOne(
                {
                    email: data.email,
                    domain: data.domain,
                },
                {
                    is_active: true,
                },
            );

            return { result: 'success' };
        } catch (error) {
            throw error;
        }
    }

    async sendMailOtp(data: ISendMailRequest): Promise<ISendMailResponse> {
        try {
            // Check if the user exists
            let user = await this.User.findOne({
                email: data.email,
                domain: data.domain,
            });
            if (!user) {
                throw new GrpcUnauthenticatedException('TENANT_NOT_FOUND');
            }
            if (user.is_active) {
                throw new GrpcUnauthenticatedException('TENANT_ALREADY_VERIFIED');
            }

            // Generate OTP
            const otp = generateOtp(6);
            this.cacheManager.set(`otp:${data.email}/${data.domain}`, otp, { ttl: 300 });

            // Send OTP to user
            await this.mailerService.sendMail({
                to: data.email,
                subject: 'OTP verify account',
                text: `Your OTP is: ${otp}`,
            });

            return { result: 'success' };
        } catch (error) {
            throw error;
        }
    }
}
