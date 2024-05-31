import { Inject, Injectable } from '@nestjs/common';
import Logger, { LoggerKey } from 'src/core/logger/interfaces/logger.interface';
import { Model } from 'mongoose';
import { Tenant } from 'src/models/user/interface/user.interface';
import { GrpcUnauthenticatedException } from 'nestjs-grpc-exceptions';
import * as argon from 'argon2';
import { Jwt } from 'src/util/jwt/jwt';
import { IGetTenantRequest, IGetTenantResponse, ISetTenantStageRequest, ISetTenantStageResponse, IVerifyRequest, IVerifyResponse, IUpdateTenantProfileRequest, IUpdateTenantProfileResponse } from './interface/tenant.interface';
import { TenantProfile } from 'src/models/user/interface/profile.interface';

@Injectable()
export class TenantService {
    constructor(
        @Inject(LoggerKey) private logger: Logger,
        @Inject('TENANT_MODEL') private readonly User: Model<Tenant>,
        @Inject('TENANTPROFILE_MODEL') private readonly Profile: Model<TenantProfile>,
        private readonly jwtService: Jwt,
    ) {}

    async getTenant(data: IGetTenantRequest): Promise<IGetTenantResponse> {
        try {
            let tenantList = []
            // Check if user already exists and is active
            if (data.type === undefined ) {
                console.log('undefined')
                tenantList = await this.User.find();
            }
            else {
                tenantList = await this.User.find({
                    is_active: data.type,
                });
            }

            return {
                tenant: tenantList.map(tenant => ({
                    email: tenant.email,
                    username: tenant.username,
                    role: tenant.role,
                    domain: tenant.domain,
                    isDeleted: tenant.isDeleted,
                    isActive: tenant.is_active,
                    isVerified: tenant.is_verified,
                    isRejected: tenant.is_rejected,
                    createdAt: tenant.created_at,
            })),
            };
        } catch (error) {
            throw error;
        }
    }

    async updateTenantProfile(data: IUpdateTenantProfileRequest): Promise<IUpdateTenantProfileResponse> {
        try {
            const tenantExist = await this.Profile.findOne({
                domain: data.user.domain,
                email: data.user.email,
            });
            if (!tenantExist) {
                throw new GrpcUnauthenticatedException('TENANT_NOT_FOUND');
            }
            if (!tenantExist.is_verify) {
                throw new GrpcUnauthenticatedException('TENANT_NOT_VERIFIED');
            }

            const updateTenant = await this.Profile.updateOne({ domain: data.user.domain, email: data.user.email }, data);

            if (updateTenant.modifiedCount === 0) {
                throw new GrpcUnauthenticatedException('TENANT_NOT_UPDATED');
            }

            const updatedTenantProfile = await this.Profile.findOne({
                domain: data.user.domain,
                email: data.user.email,
            });

            return {
                tenantprofile: {
                    ...updateTenant,
                    username: updatedTenantProfile.username,
                    email: updatedTenantProfile.email,
                    phone: updatedTenantProfile.phone,
                    gender: updatedTenantProfile.gender,
                    address: updatedTenantProfile.address,
                    age: updatedTenantProfile.age,
                    avatar: updatedTenantProfile.avatar,
                    name: updatedTenantProfile.name,
                    stage: updatedTenantProfile.stage,
                    isVerify: String(updatedTenantProfile.is_verify),
                    createdAt: String(updatedTenantProfile.createAt),
                },
            };
        }   
        catch (error) {
            throw error;
        }
    }

    async verifyTenant(data: IVerifyRequest): Promise<IVerifyResponse> {
        try {
            const tenantExist = await this.User.findOne({
                domain: data.domain,
                email: data.email,
            });
            if (!tenantExist) {
                throw new GrpcUnauthenticatedException('TENANT_NOT_FOUND');
            }

            if (!tenantExist.is_active) {
                throw new GrpcUnauthenticatedException('TENANT_NOT_ACTIVED');
            }

            const updateTenant = await this.User.updateOne({ domain: data.domain, email: data.email }, { is_verified: true });
            const updatedTenantProfile = await this.Profile.findOne({ domain: data.domain, email: data.email }, { is_verify: true });
            
            if (updateTenant.modifiedCount === 0) {
                throw new GrpcUnauthenticatedException('TENANT_NOT_VERIFIED');
            }
            const updatedTenant = await this.User.findOne({ domain: data.domain, email: data.email });

            return {
                tenant: {
                    ...updatedTenant,
                    email: updatedTenant.email,
                    username: updatedTenant.username,
                    role: String(updatedTenant.role),
                    domain: updatedTenant.domain,
                    isDeleted: String(updatedTenant.is_deleted),
                    isActive: String(updatedTenant.is_active),
                    isVerified: String(updatedTenant.is_verified),
                    isRejected: String(updatedTenant.is_rejected),
                    createdAt: String(updatedTenant.created_at),
            },
        };

        } catch (error) {
            throw error;
        }
    }

    async setTenantStage(data: ISetTenantStageRequest): Promise<ISetTenantStageResponse> {
        try{
            const tenantExist = await this.Profile.findOne({
                domain: data.domain,
                email: data.email,
            });
            if (!tenantExist) {
                throw new GrpcUnauthenticatedException('TENANT_NOT_FOUND');
            }

            const updateTenant = await this.Profile.updateOne({ domain: data.domain, email: data.email }, { stage: data.stage });

            if (updateTenant.modifiedCount === 0) {
                throw new GrpcUnauthenticatedException('TENANT_NOT_UPDATED');
            }

            const updatedTenantProfile = await this.Profile.findOne({
                domain: data.domain,
                email: data.email,
            });

            return {
                tenantprofile: {
                    ...updateTenant,
                    username: updatedTenantProfile.username,
                    email: updatedTenantProfile.email,
                    phone: updatedTenantProfile.phone,
                    gender: updatedTenantProfile.gender,
                    address: updatedTenantProfile.address,
                    age: updatedTenantProfile.age,
                    avatar: updatedTenantProfile.avatar,
                    name: updatedTenantProfile.name,
                    stage: updatedTenantProfile.stage,
                    isVerify: String(updatedTenantProfile.is_verify),
                    createdAt: String(updatedTenantProfile.createAt),
                },
            };
        } catch (error) {
            throw error;
        }
    }
}
