import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { SignInService } from './sign_in.service';
import { ISignInRequest, ISignInResponse } from './interface/sign_in.interface';

@Controller()
export class SignInController {
    constructor(private readonly signInService: SignInService) {}

    @GrpcMethod('SignInService', 'SignIn')
    async signIn(data: ISignInRequest): Promise<ISignInResponse> {
        return await this.signInService.signIn(data);
    }
}
