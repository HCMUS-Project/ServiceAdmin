import { Inject, Injectable } from '@nestjs/common';
import Logger, { LoggerKey } from 'src/core/logger/interfaces/logger.interface';
import { Model } from 'mongoose';
import { Tenant } from 'src/models/user/interface/user.interface';
import { GrpcUnauthenticatedException } from 'nestjs-grpc-exceptions';
import * as argon from 'argon2';
import { Jwt } from 'src/util/jwt/jwt';
import { ISignInRequest, ISignInResponse } from './interface/sign_in.interface';

@Injectable()
export class SignInService {
    constructor(
        @Inject(LoggerKey) private logger: Logger,
        @Inject('TENANT_MODEL') private readonly User: Model<Tenant>,
        private readonly jwtService: Jwt,
    ) {}

    async signIn(data: ISignInRequest): Promise<ISignInResponse> {
        try {
            // Check if user already exists and is active
            const checkUser = await this.User.findOne({
                email: data.email,
                domain: data.domain,
            });

            if (!checkUser) throw new GrpcUnauthenticatedException('TENANT_NOT_FOUND');
            if (!checkUser.is_active) throw new GrpcUnauthenticatedException('TENANT_NOT_ACTIVED');
            if (!checkUser.is_verified) throw new GrpcUnauthenticatedException('TENANT_NOT_VERIFIED');
            // Check password
            const isPasswordMatch = await argon.verify(checkUser.password, data.password);
            if (!isPasswordMatch) {
                this.logger.error('Invalid password for user: ' + checkUser.email);
                throw new GrpcUnauthenticatedException('INVALID_PASSWORD');
            }

            // Generate access token and refresh token
            const accessToken = await this.jwtService.createAccessToken(
                checkUser.email,
                checkUser.domain,
                checkUser.role,
            );
            const refreshToken = await this.jwtService.createRefreshToken(
                checkUser.email,
                checkUser.domain,
                checkUser.role,
            );

            // Save token to cache
            this.jwtService.saveToken(checkUser.email, checkUser.domain, accessToken, refreshToken);

            return { accessToken, refreshToken };
        } catch (error) {
            throw error;
        }
    }
}
