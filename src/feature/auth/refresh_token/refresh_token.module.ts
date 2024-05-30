import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { Jwt } from 'src/util/jwt/jwt';
import { RefreshTokenController } from './refresh_token.controller';
import { RefreshTokenService } from './refresh_token.service';

@Module({
    imports: [
        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => ({
                secret: configService.get<string>('JWT_SECRET'),
            }),
        }),
    ],
    controllers: [RefreshTokenController],
    providers: [Jwt, RefreshTokenService],
})
export class RefreshTokenModule {}
