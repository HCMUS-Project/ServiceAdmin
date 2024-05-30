import { Inject, Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { Tenant } from 'src/models/user/interface/user.interface';
import { TenantProfile } from 'src/models/user/interface/profile.interface';
import { IGetProfileResponse, IUpdateProfileResponse } from './interface/profile.interface';
import { GrpcInternalException, GrpcUnauthenticatedException } from 'nestjs-grpc-exceptions';

@Injectable()
export class ProfileService {
    constructor(
        @Inject('TENANT_MODEL') private readonly User: Model<Tenant>,
        @Inject('TENANTPROFILE_MODEL') private readonly Profile: Model<TenantProfile>,
    ) {}

    async getProfile(email: string, domain: string): Promise<IGetProfileResponse> {
        try {
            // check if user exists
            const user = await this.User.findOne({ email, domain, is_deleted: false }).populate(
                'profile_id',
            );

            if (!user) throw new GrpcUnauthenticatedException('TENANT_NOT_FOUND');
            if (!user.is_active) throw new GrpcUnauthenticatedException('TENANT_NOT_ACTIVE');

            const { role, profile_id } = user;
            if (typeof profile_id !== 'string') {
                const { age, phone, address, gender, name, username } = profile_id;
                return {
                    email,
                    domain,
                    role: role,
                    age,
                    phone,
                    address,
                    gender,
                    name,
                    username
                };
            }
            throw new GrpcInternalException('INTERNAL_ERROR');
        } catch (error) {
            throw error;
        }
    }

    async updateProfile(
        email: string,
        domain: string,
        data: object,
    ): Promise<IUpdateProfileResponse> {
        try {
            // check if user exists
            const user = await this.User.findOne({ email, domain, is_deleted: false });

            if (!user) throw new GrpcUnauthenticatedException('TENANT_NOT_FOUND');
            if (!user.is_active) throw new GrpcUnauthenticatedException('TENANT_NOT_ACTIVE');

            // Check if data is an object with at least one field
            if (typeof data !== 'object' || Object.keys(data).length === 0) {
                return { result: 'no valid data' };
            }

            // update profile
            const updateResult = await this.Profile.updateOne({ _id: user.profile_id }, data);

            if (updateResult.modifiedCount === 0) {
                throw new GrpcInternalException('UPDATE_PROFILE_FAILED');
            } else {
                // update user
                const updateUser = await this.User.updateOne({ _id: user._id }, {username: data['username']});

            if (updateUser.modifiedCount === 0) {
                throw new GrpcInternalException('UPDATE_USERNAME_USER_FAILED');
            }}
            return { result: 'success' };
        } catch (error) {
            throw error;
        }
    }
}
