import { CACHE_MANAGER, CacheStore } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { IUserToken } from 'src/common/interfaces/user_token.interface';
import { ISignOutResponse } from './interface/sign_out.interface';
import { GrpcUnauthenticatedException } from 'nestjs-grpc-exceptions';

@Injectable()
export class SignOutService {
    constructor(@Inject(CACHE_MANAGER) private cacheManager: CacheStore) {}

    async signOut(user: IUserToken): Promise<ISignOutResponse> {
        try {
            // Get access token and refresh token
            var refreshToken = await this.cacheManager.get(
                `access_token:${user.email}/${user.domain}/${user.accessToken}`,
            );
            if (!refreshToken) {
                throw new GrpcUnauthenticatedException('INVALID_ACCESS_TOKEN');
            }

            // Delete token from cache
            this.cacheManager.del(`access_token:${user.email}/${user.domain}/${user.accessToken}`);
            this.cacheManager.del(`refresh_token:${user.email}/${user.domain}/${refreshToken}`);

            return { result: 'success' };
        } catch (error) {
            throw error;
        }
    }
}
