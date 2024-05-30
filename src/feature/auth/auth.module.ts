import { Module } from '@nestjs/common';
import { SignUpModule } from './sign_up/sign_up.module';
import { VerifyAccountModule } from './verify_account/verify_account.module';
import { SignInModule } from './sign_in/sign_in.module';
import { RefreshTokenModule } from './refresh_token/refresh_token.module';
import { SignOutModule } from './sign_out/sign_out.module';
import { ProfileModule } from './profile/profile.module';

@Module({
    imports: [
        SignUpModule,
        VerifyAccountModule,
        SignInModule,
        RefreshTokenModule,
        SignOutModule,
        ProfileModule,
    ],
})
export class AuthModule {}
