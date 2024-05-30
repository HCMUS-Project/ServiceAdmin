import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { ProfileService } from './profile.service';
import {
    IGetProfileRequest,
    IGetProfileResponse,
    IUpdateProfileRequest,
    IUpdateProfileResponse,
} from './interface/profile.interface';

@Controller()
export class ProfileController {
    constructor(private readonly profileService: ProfileService) {}

    @GrpcMethod('ProfileService', 'GetProfile')
    async getProfile(data: IGetProfileRequest): Promise<IGetProfileResponse> {
        return await this.profileService.getProfile(data.user.email, data.user.domain);
    }

    @GrpcMethod('ProfileService', 'UpdateProfile')
    async updateProfile(data: IUpdateProfileRequest): Promise<IUpdateProfileResponse> {
        const { user, ...dataUpdate } = data;
        return await this.profileService.updateProfile(user.email, user.domain, dataUpdate);
    }
}
