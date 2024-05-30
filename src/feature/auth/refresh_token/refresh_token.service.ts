import { CACHE_MANAGER, CacheStore } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { GrpcUnauthenticatedException } from 'nestjs-grpc-exceptions';
import { Jwt } from 'src/util/jwt/jwt';
import { IRefreshTokenResponse } from './interface/refresh_token.interface';
import { IUserToken } from 'src/common/interfaces/user_token.interface';
import { Role } from 'src/common/enums/role.enum';
import {getEnumKeyByEnumValue} from 'src/util/convert_enum/get_key_enum';

@Injectable()
export class RefreshTokenService {
    constructor(
        @Inject(CACHE_MANAGER) private cacheManager: CacheStore,
        private readonly jwtService: Jwt,
    ) {}

    getRoleFromString(roleString: string): Role {
        switch (roleString) {
            case "USER":
                return Role.USER;
            case "ADMIN":
                return Role.ADMIN;
            case "TENANT":
                return Role.TENANT;
            default:
                throw new Error(`Invalid role: ${roleString}`);
        }
    }

    async refreshToken(user: IUserToken, refreshToken: string): Promise<IRefreshTokenResponse> {
        try {
            // check if the refresh token is valid
            // console.log(user);
            // console.log(refreshToken);

            // Convert user.role from string to Role enum
            let role: Role = this.getRoleFromString(String(user.role));

            // console.log(role)
            let refreshTokenCache = await this.cacheManager.get(
                `refresh_token:${user.email}/${user.domain}/${refreshToken}`,
            );

            if (!refreshTokenCache) {
                throw new GrpcUnauthenticatedException('INVALID_REFRESH_TOKEN');
            }

            // check decode the refresh token
            let payloadRefreshToken = await this.jwtService.verifyToken(refreshToken, false);
            if (!payloadRefreshToken) {
                throw new GrpcUnauthenticatedException('REFRESH_TOKEN_EXPIRED');
            }

            // Delete old token
            this.jwtService.deleteToken(user.email, user.domain, user.accessToken, refreshToken)

            // Generate access token and refresh token
            const accessTokenNew = await this.jwtService.createAccessToken(
                user.email,
                user.domain,
                role
            );

            const refreshTokenNew = await this.jwtService.createRefreshToken(
                user.email,
                user.domain,
                role
            );

            // Save token to cache and delete old token
            this.jwtService.saveToken(user.email, user.domain, accessTokenNew, refreshTokenNew);

            return {
                accessToken: accessTokenNew,
                refreshToken: refreshTokenNew,
            };
        } catch (error) {
            throw error;
        }
    }
}
