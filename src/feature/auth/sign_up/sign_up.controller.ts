import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { SignUpService } from './sign_up.service';
import { ISignUpRequest, ISignUpResponse } from './interface/sign_up.interface';

@Controller()
export class SignUpController {
    constructor(private readonly signUpService: SignUpService) {}

    @GrpcMethod('SignUpService', 'SignUp')
    async signUp(data: ISignUpRequest): Promise<ISignUpResponse> {
        return await this.signUpService.signUp(data);
    }
}
