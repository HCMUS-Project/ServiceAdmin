import { Inject, Injectable } from '@nestjs/common';
import Logger, { LoggerKey } from 'src/core/logger/interfaces/logger.interface';
import { Model, Types } from 'mongoose';
import { Tenant } from 'src/models/user/interface/user.interface';
import { GrpcUnauthenticatedException } from 'nestjs-grpc-exceptions';
import * as argon from 'argon2';
import { Jwt } from 'src/util/jwt/jwt';
import {
    IFullTenantProfileResponse,
    IGetTenantRequest,
    IGetTenantResponse,
    ISetTenantDomainRequest,
    ISetTenantStageRequest,
    ISetTenantStageResponse,
    IVerifyRequest,
    IVerifyResponse,
} from './interface/tenant.interface';
import { TenantProfile } from 'src/models/user/interface/profile.interface';
import { GetTenantResponse } from 'src/proto_build/admin/tenant_pb';

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
            // const matchStage = data.type !== undefined ? { is_active: data.type } : {};

            const propertiesData = ['isActive', 'isVerified', 'isRejected'];
            const propertiesMatch = ['is_active', 'is_verified', 'is_rejected'];
            let matchStage = {};

            propertiesData.forEach((property, index) => {
                if (data[property] !== undefined) {
                    matchStage[propertiesMatch[index]] = data[property];
                }
            });
            // console.log(data, matchStage)
            const tenantList = await this.User.aggregate([
                {
                    $addFields: {
                        convertedObjectId: { $toObjectId: '$profile_id' },
                    },
                },
                {
                    $lookup: {
                        from: 'tenantprofiles', // name of the other collection
                        localField: 'convertedObjectId', // use the converted ObjectId
                        foreignField: '_id', // name of the tenantProfile field
                        as: 'tenant_profile', // output array field
                    },
                },
                {
                    $match: matchStage,
                },
                {
                    $unwind: '$tenant_profile', // unwind the result
                },
                {
                    $project: {
                        // select fields to return
                        tenant: '$$ROOT',
                        tenant_profile: 1,
                    },
                },
            ]);

            // console.log(tenantList);

            return {
                tenant: tenantList.map(tenantElement => ({
                    tenant: {
                        email: tenantElement.tenant.email,
                        username: tenantElement.tenant.username,
                        role: String(tenantElement.tenant.role),
                        domain: tenantElement.tenant.domain,
                        isDeleted: tenantElement.tenant.is_deleted,
                        isActive: tenantElement.tenant.is_active,
                        isVerified: tenantElement.tenant.is_verified,
                        isRejected: tenantElement.tenant.is_rejected,
                        createdAt: String(tenantElement.tenant.createdAt),
                    },
                    tenantProfile: {
                        username: tenantElement.tenant_profile.username,
                        email: tenantElement.tenant_profile.email,
                        phone: tenantElement.tenant_profile.phone,
                        gender: tenantElement.tenant_profile.gender,
                        address: tenantElement.tenant_profile.address,
                        age: tenantElement.tenant_profile.age,
                        avatar: tenantElement.tenant_profile.avatar,
                        name: tenantElement.tenant_profile.name,
                        stage: tenantElement.tenant_profile.stage,
                        isVerify: tenantElement.tenant_profile.is_verify,
                        createdAt: String(tenantElement.tenant_profile.createdAt),
                        companyName: tenantElement.tenant_profile.companyName,
                        companyAddress: tenantElement.tenant_profile.companyAddress,
                        description: tenantElement.tenant_profile.description,
                        domain: tenantElement.tenant_profile.domain,
                    },
                })),
            } as IGetTenantResponse;
        } catch (error) {
            throw error;
        }
    }

    async verifyTenant(data: IVerifyRequest): Promise<IVerifyResponse> {
        try {
            const tenantExist = await this.User.findOne({
                email: data.email,
            });
            if (!tenantExist) {
                throw new GrpcUnauthenticatedException('TENANT_NOT_FOUND');
            }

            if (!tenantExist.is_active) {
                throw new GrpcUnauthenticatedException('TENANT_NOT_ACTIVED');
            }

            if (tenantExist.is_verified) {
                throw new GrpcUnauthenticatedException('TENANT_ALREADY_VERIFIED');
            }
            let updateTenant = null;
            let updatedTenantProfile = null;
            if (data.isVerify === true) {
                updateTenant = await this.User.updateOne(
                    { email: data.email },
                    { is_verified: true },
                );
                updatedTenantProfile = await this.Profile.updateOne(
                    { email: data.email },
                    { is_verify: true },
                );
            } else {
                updateTenant = await this.User.updateOne(
                    { email: data.email },
                    { is_rejected: true },
                );
            }

            // const updatedTenantProfile = await this.tenantElement.findOne({ domain: data.domain, email: data.email });

            if (updateTenant.modifiedCount === 0) {
                throw new GrpcUnauthenticatedException('TENANT_NOT_VERIFIED');
            }
            const updatedTenant = await this.User.findOne({
                email: data.email,
            });

            return {
                tenant: {
                    ...updatedTenant,
                    email: updatedTenant.email,
                    username: updatedTenant.username,
                    role: String(updatedTenant.role),
                    domain: updatedTenant.domain,
                    isDeleted: updatedTenant.is_deleted,
                    isActive: updatedTenant.is_active,
                    isVerified: updatedTenant.is_verified,
                    isRejected: updatedTenant.is_rejected,
                    createdAt: String(updatedTenant.created_at),
                },
            };
        } catch (error) {
            throw error;
        }
    }

    async setTenantStage(data: ISetTenantStageRequest): Promise<ISetTenantStageResponse> {
        try {
            const tenantExist = await this.Profile.findOne({
                email: data.email,
            });
            if (!tenantExist) {
                throw new GrpcUnauthenticatedException('TENANT_NOT_FOUND');
            }

            const updateTenant = await this.Profile.updateOne(
                { email: data.email },
                { stage: data.stage },
            );

            if (updateTenant.modifiedCount === 0) {
                throw new GrpcUnauthenticatedException('TENANT_NOT_UPDATED');
            }

            const updatedTenantProfile = await this.Profile.findOne({
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
                    isVerify: updatedTenantProfile.is_verify,
                    createdAt: String(updatedTenantProfile.createdAt),
                    companyName: updatedTenantProfile.companyName,
                    companyAddress: updatedTenantProfile.companyAddress,
                    description: updatedTenantProfile.description,
                    domain: updatedTenantProfile.domain
                },
            };
        } catch (error) {
            throw error;
        }
    }

    async setTenantDomain(data: ISetTenantDomainRequest): Promise<IFullTenantProfileResponse> {
        try {
            const tenantExist = await this.User.findOne({
                email: data.email,
            });

            const profileExist = await this.Profile.findOne({
                email: data.email,
            });
            if (!tenantExist) {
                throw new GrpcUnauthenticatedException('TENANT_NOT_FOUND');
            }

            if (!tenantExist.is_active) {
                throw new GrpcUnauthenticatedException('TENANT_NOT_ACTIVATED');
            }

            if (!tenantExist.is_verified) {
                throw new GrpcUnauthenticatedException('TENANT_NOT_VERIFIED');
            }
            if (!profileExist) {
                throw new GrpcUnauthenticatedException('TENANT_PROFILE_NOT_FOUND');
            }

            const updateTenant = await this.User.updateOne(
                { email: data.email },
                { domain: data.domain },
            );

            if (updateTenant.modifiedCount === 0) {
                throw new GrpcUnauthenticatedException('TENANT_NOT_UPDATED');
            }

            const updateTenantProfile = await this.Profile.updateOne(
                { email: data.email },
                { domain: data.domain },
            );

            if (updateTenantProfile.modifiedCount === 0) {
                throw new GrpcUnauthenticatedException('TENANT_PROFILE_NOT_UPDATED');
            }

            const Tenant = await this.User.findOne({
                email: data.email,
            });

            const Profile = await this.Profile.findOne({
                email: data.email,
            });

            return {
                tenant: {
                    email: Tenant.email,
                    username: Tenant.username,
                    role: String(Tenant.role),
                    domain: Tenant.domain,
                    isDeleted: Tenant.is_deleted,
                    isActive: Tenant.is_active,
                    isVerified: Tenant.is_verified,
                    isRejected: Tenant.is_rejected,
                    createdAt: String(Tenant.created_at),
                },
                tenantProfile: {
                    username: Profile.username,
                    email: Profile.email,
                    phone: Profile.phone,
                    gender: Profile.gender,
                    address: Profile.address,
                    age: Profile.age,
                    avatar: Profile.avatar,
                    name: Profile.name,
                    stage: Profile.stage,
                    isVerify: Profile.is_verify,
                    createdAt: String(Profile.createdAt),
                    companyName: Profile.companyName,
                    companyAddress: Profile.companyAddress,
                    description: Profile.description,
                    domain: Profile.domain
                },
            };
        } catch (error) {
            throw error;
        }
    }
}
