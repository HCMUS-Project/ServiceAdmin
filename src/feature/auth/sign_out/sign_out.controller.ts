import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { ISignOutRequest, ISignOutResponse } from './interface/sign_out.interface';
import { SignOutService } from './sign_out.service';

@Controller()
export class SignOutController {
    constructor(private readonly signOutService: SignOutService) {}

    @GrpcMethod('SignOutService', 'SignOut')
    async signOut(data: ISignOutRequest): Promise<ISignOutResponse> {
        return await this.signOutService.signOut(data.user);
    }
}
