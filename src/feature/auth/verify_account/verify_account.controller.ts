import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { VerifyAccountService } from './verify_account.service';
import {
    ISendMailRequest,
    ISendMailResponse,
    IVerifyAccountRequest,
    IVerifyAccountResponse,
} from './interface/verify_account.interface';

@Controller()
export class VerifyAccountController {
    constructor(private readonly verifyAccountService: VerifyAccountService) {}

    @GrpcMethod('VerifyAccountService', 'VerifyAccount')
    async verifyAccount(data: IVerifyAccountRequest): Promise<IVerifyAccountResponse> {
        return await this.verifyAccountService.verifyAccount(data);
    }

    @GrpcMethod('VerifyAccountService', 'SendMailOtp')
    async sendMailOtp(data: ISendMailRequest): Promise<ISendMailResponse> {
        return await this.verifyAccountService.sendMailOtp(data);
    }
}
