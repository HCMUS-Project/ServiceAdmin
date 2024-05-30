import { Module } from '@nestjs/common';
import { SignOutController } from './sign_out.controller';
import { SignOutService } from './sign_out.service';

@Module({
    controllers: [SignOutController],
    providers: [SignOutService],
})
export class SignOutModule {}
