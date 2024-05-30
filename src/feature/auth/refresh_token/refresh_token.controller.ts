import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { RefreshTokenService } from './refresh_token.service';
import { IRefreshTokenRequest, IRefreshTokenResponse } from './interface/refresh_token.interface';

@Controller()
export class RefreshTokenController {
    constructor(private readonly refreshTokenService: RefreshTokenService) {}

    @GrpcMethod('RefreshTokenService', 'RefreshToken')
    async refreshToken(data: IRefreshTokenRequest): Promise<IRefreshTokenResponse> {
        // console.log(data)
        return await this.refreshTokenService.refreshToken(data.user, data.refreshToken);
    }
}
