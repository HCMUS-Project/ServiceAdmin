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
import { CreateTenantAdminService } from 'src/feature/externalServices/tenant/createTenant/createTenant.service';
import { CreateTenantProfileAdminService } from 'src/feature/externalServices/tenant/createTenantProfile/createTenantProfile.service';
import { ICreateTenantProfileRequest } from 'src/feature/externalServices/tenant/createTenantProfile/createTenantProfile.interface';
import {
    ICreateTenantRequest,
    IFindTenantByDomainRequest,
} from 'src/feature/externalServices/tenant/createTenant/createTenant.interface';

@Injectable()
export class TenantService {
    constructor(
        @Inject(LoggerKey) private logger: Logger,
        @Inject('TENANT_MODEL') private readonly User: Model<Tenant>,
        @Inject('TENANTPROFILE_MODEL') private readonly Profile: Model<TenantProfile>,
        private readonly jwtService: Jwt,
        private createTenantAdminService: CreateTenantAdminService,
        private createTenantProfileAdminService: CreateTenantProfileAdminService,
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
                    domain: updatedTenantProfile.domain,
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

            const dataTenantDomain = {
                user: {
                    role: 2,
                    email: data.email,
                    domain: data.domain,
                    accessToken: '',
                },
            } as IFindTenantByDomainRequest;

            const tenantExistExternalService =
                await this.createTenantAdminService.findTenantByDomain(dataTenantDomain);

            if (tenantExistExternalService) {
                throw new GrpcUnauthenticatedException('TENANT_DB_EXISTED');
            }

            const tenantProfileExistExternalService =
                await this.createTenantProfileAdminService.findTenantProfileByTenantId({
                    domain: tenantExistExternalService.tenant.domain,
                    tenantId: tenantExistExternalService.tenant.id,
                });

            if (!tenantProfileExistExternalService) {
                throw new GrpcUnauthenticatedException('TENANT_PROFILE_DB_EXISTED');
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

            const dataCreateTenant = {
                user: {
                    role: 2,
                    email: Tenant.email,
                    domain: Tenant.domain,
                    accessToken: '',
                },
                name: Profile.name,
            } as ICreateTenantRequest;

            const createTenant = await this.createTenantAdminService.createTenant(dataCreateTenant);

            const dataCreateTenantProfile = {
                user: {
                    role: 2,
                    email: Tenant.email,
                    domain: Tenant.domain,
                    accessToken: '',
                },
                tenantId: createTenant.tenant.id,
                address: Profile.address,
                phoneNumber: Profile.phone,
                serviceName: 'ten cua dich vu',
                logo: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEBLAEsAAD/4QBWRXhpZgAATU0AKgAAAAgABAEaAAUAAAABAAAAPgEbAAUAAAABAAAARgEoAAMAAAABAAIAAAITAAMAAAABAAEAAAAAAAAAAAEsAAAAAQAAASwAAAAB/+0ALFBob3Rvc2hvcCAzLjAAOEJJTQQEAAAAAAAPHAFaAAMbJUccAQAAAgAEAP/hDIFodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvADw/eHBhY2tldCBiZWdpbj0n77u/JyBpZD0nVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkJz8+Cjx4OnhtcG1ldGEgeG1sbnM6eD0nYWRvYmU6bnM6bWV0YS8nIHg6eG1wdGs9J0ltYWdlOjpFeGlmVG9vbCAxMC4xMCc+CjxyZGY6UkRGIHhtbG5zOnJkZj0naHR0cDovL3d3dy53My5vcmcvMTk5OS8wMi8yMi1yZGYtc3ludGF4LW5zIyc+CgogPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9JycKICB4bWxuczp0aWZmPSdodHRwOi8vbnMuYWRvYmUuY29tL3RpZmYvMS4wLyc+CiAgPHRpZmY6UmVzb2x1dGlvblVuaXQ+MjwvdGlmZjpSZXNvbHV0aW9uVW5pdD4KICA8dGlmZjpYUmVzb2x1dGlvbj4zMDAvMTwvdGlmZjpYUmVzb2x1dGlvbj4KICA8dGlmZjpZUmVzb2x1dGlvbj4zMDAvMTwvdGlmZjpZUmVzb2x1dGlvbj4KIDwvcmRmOkRlc2NyaXB0aW9uPgoKIDxyZGY6RGVzY3JpcHRpb24gcmRmOmFib3V0PScnCiAgeG1sbnM6eG1wTU09J2h0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8nPgogIDx4bXBNTTpEb2N1bWVudElEPmFkb2JlOmRvY2lkOnN0b2NrOmY2NzlkYjlmLTViYTctNDBjYy1hYWZjLWVjNzQyNzE3MDY4MjwveG1wTU06RG9jdW1lbnRJRD4KICA8eG1wTU06SW5zdGFuY2VJRD54bXAuaWlkOjk1ZmU5NjIwLWY5MWYtNDEwOC1hZTdjLWY0OGRjNWZkYWEzMTwveG1wTU06SW5zdGFuY2VJRD4KIDwvcmRmOkRlc2NyaXB0aW9uPgo8L3JkZjpSREY+CjwveDp4bXBtZXRhPgogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAo8P3hwYWNrZXQgZW5kPSd3Jz8+/9sAQwAFAwQEBAMFBAQEBQUFBgcMCAcHBwcPCwsJDBEPEhIRDxERExYcFxMUGhURERghGBodHR8fHxMXIiQiHiQcHh8e/9sAQwEFBQUHBgcOCAgOHhQRFB4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4e/8AAEQgBaAFoAwERAAIRAQMRAf/EAB0AAQACAgMBAQAAAAAAAAAAAAAGBwMFAQQICQL/xABJEAACAQMCAgYFBwgHCAMAAAAAAQIDBAUGEQchEjFBUWFxCBOBobEUIjJCgpHBN1J1kqKz0fAVFiMzU3PSGDRUVYWTlbIXQ3L/xAAaAQEAAgMBAAAAAAAAAAAAAAAAAgQBAwUG/8QALhEBAAIBAwIFAgUFAQAAAAAAAAECAwQRMRIhBRMyQVEiYRRCUnGRI0OBobEV/9oADAMBAAIRAxEAPwCyjtvGgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADJQoVriXRoUalV90IOXwMTMRylWtremN2zt9M52ut442rBd9RqHxZrnPjj3WK6LPb8rvUtE5qf05WlLzq7/AARCdTRujw3NPOzsw0Hfv6V/ax8oyZH8VX4bI8Lv72h+/wCoV3/zK3/7ch+Lj4Z/8u/6ofieg79fRv7WXnGSH4qvwxPheT2tDrVtE5qH0HaVfKrt8USjU0a58NzRxs6NxpnO0N3LG1ZpdtNqfwZOM+Ofdptos9fytZXoVreXRr0alJ904OPxNkTE8K9q2r6o2YzKIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA7uMxWRyUtrK0qVY9s9tor7T5ELZK05luxYMmX0Qk+O0JUltLI3sYd8KC3f6z/gV7ar9MOjj8Ln+5b+EisdMYSz2cLGFWa+tWfTfv5e40Wz3t7r2PRYacV/lt6cY049GnGMI90Vsvcat91mIiO0OTDIAAAAAADipGNSPRqRjOL7JLde8zvsxMRPaWovtMYS73c7GFKb+tRfQfu5e421z3r7q2TRYb81/hHcjoSpFOWPvYz7oV1s/wBZfwN9dV+qFHJ4XP8Abt/KMZPFZHGy2vbSpSj2T23i/tLkWK5K34lzsuDJi9cOkTaQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA2mEwOSyzUraj0aO/OtU5QXl3+w15MtacrODS5M3pjt8pvh9H4yy6NS5Tvay571FtBPwj/AB3Kd9Ra3HZ18Ph+LH3t3lIopRioxSjFckktkiuvRGzkMgAAAAAAAAAAAAAOJJSi4ySlF8mmt0wxMbo7mNH4y96VS2Tsqz5701vBvxj/AA2LFNRavPdRzeH4snevaUIzeByWJblc0elR35VqfOD8+72lymWt+HIz6XJh9UdvlqzYrAAAAAAAAAAAAAAAAAAAAAAAAAAAZrK1uLy4jb2tGdarLqjFe/wXiYtaKxvKdKWyW6axvKd6f0ZbWyjXyjjc1utUl/dx8/zvgUsmpme1XZ0/h1afVk7z8eyWRSjFRikklsklskVXSiNnIZAAAAAAAAAAAAAAAAAABxJKUXGSTTWzTW6YYmN0T1Boy2uVKvi3G2rdbpP+7l5fm/AtY9TMdrObqPDq3+rH2n49kEvbW4s7iVvdUZ0aseuMl7/FeJdraLRvDjXpbHbptG0sJlAAAAAAAAAAAAAAAAAAAAAAAAbbTuBvMzX2pL1dvF7VK0lyXgu9+BqyZYxx91rTaW+ee3HysrDYqyxNt6m0pbb/AE5y5ym/F/h1HPvkted5d/DgphrtWHeINwAAAAAAAAAAAAAAAAAAAAAAA6OZxVllrb1N3S32+hOPKUH4P8OonTJak7w05sFM1drQrTUWBvMNX2qr1lvJ7U60Vyfg+5+B0MeWMkduXA1Glvgnvx8tUbVUAAAAAAAAAAAAAAAAAAAABIdJabq5eorm46VKyi+clydR90fxZozZop2jle0mjnNPVbtX/qybahRtqEKFvTjSpQW0YRWySOfMzM7y79axSOmsdmQwkAAAAAAAAAAAAAAAAAAAAAAAAADHc0KNzQnQuKcatKa2lCS3TRmJmJ3hG1YvHTaOyttW6bq4ibubfpVbKT5SfN033S/BnQw5ov2nlwNXo5wz1V71/wCI8b1EAAAAAAAAAAAAAAAAAAEh0fp6eXr/ACi5Uo2VN7SfU6j/ADV+LNGbN0RtHK9o9JOaeq3pj/ay6VOFKnGlShGEILoxjFbJLuRz5nd6CIiI2h+jDIAAAAAAAAAAAAAAAAAAAAAAAAAAAD81acKtOVKrCM4TXRlGS3TXczMTsxMRMbSrTWGnp4iv8otlKVlUe0X1um/zX+DOhhzdcbTy8/rNJOGeqvpn/SPG9RAAAAAAAAAAAAAAAAG10vhquZyCpLeFvT2lWqLsXcvFmrLkjHH3WtLppz329vdattQpW1vTt6FONOlTj0YRXUkc2ZmZ3l6OtYpEVrwyGEgAAAAAAAAAAAAOUm1uk2u/bkBi9fQ6XR9fS6Xd6xb/ABAytNLdxaXftyA4AAAAAAAAAAAAABjuaFK5t6lvXpxqUqkejOL6mjMTMTvCNqxeJrbhVWp8NVw2Q9U+lO3qbyo1H2rufijpYskZI3ec1WmnBfb29mqNqqAAAAAAAAAAAAAAzWVtWvLula28OnVqy6MV/PYYtaKxvKdKTe0VrzK2sFjKGJx1O0o89udSe3Ocu1/z2HLyXm9t5emwYa4aRWHeINwAAAAAAAAAAANHrbVuntGYSeY1Jk6VhaxfRh0uc6svzIQXOcvBe3YzETPaEbWisby8ucRfSk1FkKtS00Tj6WGtN9o3d1CNa5mu9R+hD9p+Jvrij3V7Z5/KpTUOs9Xahqyq5zU+YyEn2VrufR9kU1FexGyKxHDTNpnmWi6Uul0ulLfv35mUW909rPV2nq0auE1NmMe49lG8mo+2Lbi/ajE1ieUotMcSurh16UmosdVp2utsfSzVpulK7tYRo3MF3uP0J/svxNdsUezdXPMcvUeidXad1phIZjTeTpX1q30Z9HlOlL8ycHzhLwfs3NExMdpWK2i0bw3phIAAAAAAAAAAAHRzuMoZbHVLSty35wntzhLsf89hPHeaW3hpz4a5qTWVS3ttWs7ura3EOhVpS6Ml/PYdStotG8PM3pbHaa25hhMoAAAAAAAAAAAAAWDw8w/ya0eUrx/tq8dqSf1Yd/t+BR1OTeemHc8O0/RXzLczx+yWlV0wAAAAAAAAAAARPitrzD8O9I189lm6k9/V2lrGW07qs1uoR7l2uXYlv3JyrWbTsje0VjeXgbiHrXUGvNR1c5qG8datLeNGjHdUran2U6cexe99b3ZarWKxtCja02neUcMogAAAAkXDzWmf0JqOlnNPXjo1o7RrUpbulc09+dOpHtj711rZmLVi0bSlW01neHvnhRr3D8RNI0c9in6qafqru0lLedrWS3cH3rtUu1c+9KravTOy9S0WjeEtIpAAAAAAAAAAAAiXETD/ACm0/pShD+2oR2qpfWh3+z4FrTZNp6ZczxHT9dfMrzHP7K+LzhgAAAAAAAAAAA2ml8W8tmKVtJP1Mfn1n3QXZ7eo15b9Fd1nS4POyRX291sxSjFRilGKWyS6kjlvSxGzkMgAAAAAAAAAA5drSXe+pAeAPSK4g1eIHEO5uaFaUsNj5StcZDf5rgn86rt3zkt/JRXYWqV6YUct+qytibWAAAAAAAsj0d+INXh9xDtbqvWlHDZCUbXJw35erb+bV274N7+XSXaQvXqhsxX6bPoAtmt0012NPkyqvAAAAAAAAAAAA4klKLjJKUWtmn1NBiY3VNqjFvE5irbRT9TL59F98H2ezqOpiyddd3mtVg8nJNfb2as2KwAAAAAAAAAAWXw/xvyLCq5qR2rXe03v1qH1V+PtOfqL9Vtvh6Dw/D5eLqnmUjK6+AAAAAAAAAAACvfSN1HU0vwa1BkLep6u6r0VZW8k+anWfQ3XiouT9hOkb2a8lumsvnykkkl1Lki0ogAAAAAAABpNbPmnyYH0E9HDUdTVHBnT9/cVHUurei7G4k3zc6L6G78XFRftKt42svY53rErEINgAAAAAAAAAAAI5xAxvy3Cu5px3rWm81t1uH1l+PsLGnv022+VDxDD5mLqjmFaHQefAAAAAAAAAHdwdi8llrayW/RqT+e+6K5yf3EMluisy3YMXm5IouCMYxioxSjFLZJdiOU9REbOQyAAAAAAAAAAACgPTmuZ0uGGHtYtqNxmYufj0KNRr3s24uWjP6XjYsKgAAAAAAAAA9j+gvczqcM81aybcbfMtx8OnRpt+9FfLyt4PS9AmpvAAAAAAAAAAABxKMZRcZJSi1s0+1BiY3U/nbF43LXNk9+jTn8x98XzXuOrjt11iXl8+Lysk0+HSJtIAAAAAAABNOGFl0qt3kJL6KVGD8Xzl7tvvKmqtxV1/C8Xe1/8J0UnYAAAAAAAAAAAAAob04LGdxwnsL2Md1ZZilKfgp06kPjsbcU/U0Z4+l4wLCoAAAAAAAAAPZ3oPWM7fhTkb2cdleZio4PvUKdOHx3K+WfqW8EfSvo1N4AAAAAAAAAAAAEF4n2XRq2uQivpJ0ZvxXOPu3+4u6W3NXH8Uxd63j9kLLbkAAAAAAAAFraMtPkmm7SDW06kfWy85c/hsczPbqvL0uix9GGsfPduDUtAAAAAAAAAAAAARHjJpiWseGGf09SipXNzauVr/nQanT++UUvaSrO07oXr1VmHzmkpRk4yi4ST2cWuafamW1BwAAAAAAAByk20oxcpPkopc2+5AfRjgzpiWjuF+A09Vio3Nvaqd1/nVG51PulJr2FS07zMr9K9NYhLyKYAAAAAAAAAAAAGn1nafLNN3cEt504+tj5x5/Dc3YLdN4Vdbj68No+O6qTpPNAAAAAAAMltRdxc0qEeurOMF7XsYmdo3SrXqtFfldMIRpwjTgtowSivJcjkz3esiNo2hyYZAAAAAAAAAAAAAeQHij0t+GtTSmsp6pxlu1g83Vc5dCPzbe6fOcH3KfOcftLsLOO28bKeam07qONjSAAAAAAAu/0SeGtTVms4aoydu3g8JVVRdNfNuLpc4QXeo8py+yu015LbRs3YabzvL2z58ysuAAAAAAAAAAAAAAOJwjUhKnJbxmnF+T5GY7MTG8bSpa5pO3uatCXXSnKD9j2OtE7xu8navTaa/DGZRAAAAAA2+jaPr9T2MWt1Gp6x/ZTZqzztjla0VerPVa5zHpQAAAAAAAAAAAAAADW6nwWK1NgLzBZuzhd4+8p+rrUpct+5p9akns01zTRmJ2neGJiJjaXhfjhwdz3DfITuoxq5HTtSe1vkYx+hv1QrJfQn4/Rl2dys0vFlPJjmn7KxJtQAAAALN4IcHc/xJyELlxqY7TtOe1zkZQ+nt1wop/Tn4/Rj29zhe8VbceOb/s90aXwOK0zgLPBYS0haWFnT6FKlHn5tvtk3u23zbZWmd53lciIiNobMwyAAAAAAAAAAAAAAAVRrKj6jU99FLZSqesX2kmdPBO+OHmtbXpz2ag2qoAAAAAEl4b0+nqJz2/u7eb+/ZfiV9TP0Oh4bG+bf7LJOe74AAAAAAAAAAAAAAAAx3NChdW9S2uaNOvQqxcKlOpBShOL600+TXgwKH4jejDpPN1al7pW9qabup7t2/Q9daN+Ed+lD7La8DbXLMctFsETx2UrqD0beKeMqSVpjbDMUl1Tsr2G7+xU6LNkZay1ThtCO/wDwpxX9Z6v+oeY379qe339LYz5lflHyr/CRaf8ARt4p5OpFXeNsMPSfXO9vYbr7NPpMxOWqUYbyunh16MOk8JVp3uq72pqS6hs1b9B0bRPxjv0p/aaXga7ZZnhtrgiOe6+bWhQtbanbW1GlQoUoqFOlTgowhFdSSXJLwRqb2QAAAAAAAAAAAAAAAAArbiTT6GolP/Et4P7t1+B0NNP0OB4lXbNv9kaLDngAAAAAS7hfHfKXku6gl98l/Aq6r0w6nhcf1LT9lgFF2wAAAAAAAAAAAAAADVaj1Jp7TdD1+oM5jsVT23Tu7mNNvyTe79iMxEzwxMxHKu8r6RXCawm4Q1BcX8l/wdhVqL9ZpIl5dmuc1PlqX6UPDBP6OoX/ANOX+sz5VmPPqf7UXDD8zUP/AI5f6zPlWPPq4/2oeF/+HqH/AMcv9Y8qx51XP+1Fww/M1D/45f6x5Vjz6i9KHhg39HUK/wCnL/WY8qx59W2xPpFcJr+ahPUFxYSf/GWFWmv1kmh5dmYzUn3WJpzUuntSUPX6fzmOytPbdu0uY1GvNJ7r2ohMTHLZExPDamGQAAAAAAAAAAAAAACv+KEdspZy76DX3Sf8S9pfTLieKR/UrP2REtOWAAAAABMeFv8Av19/kw/9irq+IdXwv12/ZPSi7QAAAAAAAAAAAAEc1/rbTWhcI8tqXIwtKL3VGkl0q1eS+rTgucn7l2tEq1m3CNrRWN5eTuJ3pKaw1DUq2elk9NYx7pTptTu6i75VOqHlBfaZuriiOVa2eZ4UheXNze3c7u9uK11c1HvOtWqOc5PxlLds2tPLEGAAAAAAAGWzubmyu4XdncVra5g94VqNRwnF+Eo7NBnhd3DH0lNYadqUrPVKepcYtk51GoXdNd8anVPymvtI1WxRPDdXPMc93rLh/rbTWu8IstprIwuqS2jWpSXRrW8n9WpB84v3PsbNM1mOVmtotG8JGRSAAAAAAAAAAAAAgXFL/frH/Jn/AOxe0nEuL4p66/shxacoAAAAACXcL5bZS8j30E/ukv4lXVemHU8Ln+paPssAou2AAAAAAAAAAACCcaeJeI4aaY/pG8jG6yNz0oY+xUtpV5rrbf1YR3XSl5Jc2SrWbShe8Ujd4O1vqvPaz1DWzuor6d3eVeS7IUodkKceqMV3Lze75lqIiI2hStabTvLRmUQAAAAAAAAAAAbvRGq87ozUNDO6evp2l5S5PthVh2wqR6pRfc/NbPmYmImNpSraazvD3jwV4mYniXpj+kLSMbXJW3RhkLFy3lQm+pp/Wpy2fRl5p80VbVmsrtLxeN08IpgAAAAAAAAAAAr/AIoS3ylnHuoN/fJ/wL2l9MuJ4pP9SsfZES05YAAAAAEl4bVOhqJw/wAS3mvu2f4FfUx9DoeG22zbfZZJz3fAAAAAAAAAADo6hy9hgMHfZvK11QsbGhKvXqPsjFbvbvb6ku1tGYjdiZ2jeXzu4pa2yfEDWd5qPJuUFUfQtbffeNtQT+ZTXxb7ZNstVr0xso3tNp3RYkgAAAAAAAAAAAAAAlHC3W2U0BrOz1HjHKapPoXVvvtG5oN/Ppvz60+ySTI2r1RslS01neH0R09l8fn8FY5vFV1Xsb6hGvQqLtjJbrfua6muxplWY2X4neN4d8wyAAAAAAAAAAFbcSanT1Eof4dvBffu/wAToaaPocDxK2+bb7I0WHPAAAAAA2+ja3qNT2Mm9lKp6t/aTRqzxvjla0VunPVa5zHpQAAAAAAAAAA82+nHq+dngcTom0quM8jN3t6k+ujTe1OL8HPd/YRuxV77q+e20bPJJvVQAAAAAAAAAAAAAAAB619BzV87zBZbRN3Vcp46SvbJN9VGo9qkV4Kez+2zRljvutYLdtnpM0rAAAAAAAAAAAVRrKt6/U99JPdRqerX2UkdPBG2OHmtbbqz2ag2qoAAAAAGS2rO3uaVePXSnGa9j3MTG8bJVt02i3wumE41IRqRe8ZpSXk+ZyZ7PWRO8bw5MMgAAAAAAAB9QHgn0q8xPL8c88nPpU8e6VhTXcqcF0v2pSLWONqqWad7yq0m1AAAAAAAAAAAAAAAAC0vRUzE8RxzwKU+jTyDq2FRd6qQfR/ajEhkjerbhna8Pey6iqugAAAAAAAADic404SqSe0YJyfkuZmO7EztG8qWuaruLmrXl11Zym/a9zrRG0bPJ2t1Wm3yxmUQAAAAAAFraMu/lmm7Sbe86cfVS848vhsc3PXpvL0uiydeGs/HZuDStAAAAAAAADtA+cXGOpKtxb1dUm93LNXXuqyX4FuvphQv6pRQkgAAAAAAAAAAAAAAAAJXwcqSo8W9I1IPZxzVr76sV+JG3plOnqh9He0qL4AAAAAAAAA0+s7v5Hpu7mntOpH1UfOXL4bm7BXqvCrrcnRhtPz2VSdJ5oAAAAAAAAmnDC96NW7x8n9JKtDzXKXu2+4qaqvFnX8Lyd7Y/wDKdFJ2AAAAAAAAAuteYHzf4u/lV1b+mrv97It14hz7+qUXJIgAAAAAAAAAAAAAAACUcIvyq6S/TVp+9iRtxKVPVD6QPrfmVHQAAAAAAAAAEF4n3vSq2mPi/op1p+b5R92/3l3S15s4/imTvXH/AJQstuQAAAAAAAAd3B3zxuWtr1b9GnP5674vlJfcQyV66zDdgy+Vki64IyjKKlFqUWt012o5T1ETu5DIAAAAAAAuteYHzf4u/lV1b+mrv97It14hz7+qUXJIgAAAAAAAAAAAAAAACUcIvyq6S/TVp+9iRtxKVPVD6QPrfmVHQAAAAAAAAOJSjGLlJqMUt232IMTOyn87fPJZa5vXv0ak/mLuiuUfcdXHXorEPL58vm5Jv8ukTaQAAAAAAAABZfD/ACXy3Cq2qS3rWm0Hv1uH1X+HsOfqKdNt/l6Dw/N5mLpnmEjK6+AAAAAAALrXmB83+Lv5VdW/pq7/AHsi3XiHPv6pRckiAAAAAAAAAAAAAAAAJRwi/KrpL9NWn72JG3EpU9UPpA+t+ZUdAAAAAAAAAjnEDJfIsK7anLatd7wW3WofWf4e0saenVbf4UPEM3l4umOZVodB58AAAAAAAAAANppfKPE5ilcyb9TL5lZd8H2+zrNeXH112WdLn8nJFvb3WzFqUVKLUotbprqaOW9LE7uQyAAAAAAXWvMD5v8AF38qurf01d/vZFuvEOff1Si5JEAAAAAAAAAAAAAAAASjhF+VXSX6atP3sSNuJSp6ofSB9b8yo6AAAAAAADiTUYuUmopLdt9SQYmdlTaoyjy2Yq3MW/Ux+ZRXdBdvt6/adTFj6K7PNarP52Sbe3s1ZsVgAAAAAAAAAAAWDw7zHym0/ouvP+2oR3pN/Wh3ez4FHU49p6odzw7UddfLtzHH7JaVXTAAAAAALrA8X8ZOA3EiWss7qDFYqjmbG+v691TVlXTrRjObklKnLZ7rf6u5YrkrtsqXxW3mYUnmcVlMLdO1zGNvMdXT2dO7oSpS+6SRtid+GmYmOXTDAAAAAAAAAAAAAADJbUK91cwtrWjVr16j2hSpQc5yfhFc2GV8cDOA+vK+q8NqbM2cMDYWF5Ru+he/7xWUJqXRjSXOO+3XLbyZqvkjbZux4rb7y9mdpXWwAAAAAAES4iZj5Naf0XQn/bV471Wvqw7vb8C1pse89UuZ4jqOivl15nn9lfF5wwAAAAAAAAAAAAM1lc1rO7pXVvPoVaUulF/z2GLVi0bSnS9sdotXmFtYLJ0Mtjqd3R5b8pw35wl2r+ew5eSk0ttL02DNXNSLQ7xBuAAAAAAAdfI2VnkrZ2uRs7e9oS5OlcUo1YP2STQY5V1qTgLwrzjnOppelj60v/sxtadu9/8A8p9H9knGS0e6E4qz7K4z/omYSq5TwOsMhaP6tO9toV4/rRcX7icZp94a508e0oHmvRY4hWjk8bksBk4rqSrzoSfsnHb3koywhOCyH5TgVxZx7frNF3txFfWtKtKuv2Zb+4l5lflCcV/hGchoTW+PbV9o/UFvt1ueOq7feokotE+6M0tHs01fH5Cg2q9heUWuypbzj8UZY2ddxkns4tPxQYEm3sk35IDPQsL6u9qFjd1n3U6E5fBBnZusdoTW+RaVho/UFxv1OGOq7fe47GOqI92YpafZK8RwE4s5Jro6Qr2cX9a9uKVBL2OW/uI+ZX5SjFefZOcB6KOsLlxlm9RYXGQfXGgqlzNe6MfeRnLHsnGnn3lZelvRc0DjXCpmr7L52ouuE6qt6T+zT+d+0QnLb2bIwVjlbmldJaY0pQ9TpvAY7FR22cragozl5z+k/azXMzPLbFYrw3ZhIAAAAAAB0c7k6GJx1S7rc9uUIb85y7F/PYTx0m9toac+auGk2lUt7c1ry7q3VxPp1asulJ/z2HUrWKxtDzN72yWm1uZYTKAAAAAAAAAAAAAADa6YzNXDZD1q6U7eptGtTXau9eKNWXHGSNlrS6icF9/b3WrbV6Vzb07ihUjUpVI9KEl1NHNmJidpejraLxFq8MhhIAAAAAAAAAAGy7gOVKS6pSXkwEm5LaUnLze4GKVChJ7yoUW/Gmn+ABUKC5qhRXlTj/ADJFuK2i3Hy5AcuUn1yk/N7gcbIAAAAAAAAAAAY7mvStrepcV6ip0qcelOT6kjMRMztCNrRSJtbhVWp8zVzOQ9a94W9PeNGm+xd78WdLFjjHXZ5zVaic99/b2ao2qoAAAAAAAAAAAAAAAAkOj9QzxFf5PcuUrKo95LrdN/nL8UaM2HrjeOV7R6ucM9NvTP+ll0qkKtONWlOM4TXSjKL3TXejnzGz0ETExvD9GGQAAAAAAAAAAAAAAAAAAAAAAAAAAAH5q1IUqcqtWcYQgulKUnsku9mYjdiZiI3lWmsNQzy9f5PbOUbKm94rqdR/nP8EdDDh6I3nl5/Wauc09NfTH+0eN6iAAAAAAAAAAAAAAAAAACQ6T1JVxM1bXHSq2Unziubpvvj+KNGbDF+8cr2k1k4Z6bd6/8WTbV6NzQhXt6katKa3jOL3TRz5iYnaXfraLx1VnsyGEgAAAAAAAAAAAAAAAAAAAAAAAAAY7mvRtqE69xUjSpQW8pyeySMxEzO0I2tFI6rT2Vtq3UlXLzdtb9KlZRfKL5Oo++X4I6GHDFO88uBq9ZOaemvav/AFHjeogAAAAAAAAAAAAAAAAAAAANrp3PXmGr70n6y3k96lGT5PxXc/E1ZMUZI78rWn1V8E9uPhZeGytllrb11pV32+nCXKUH4r8eo598dqTtLv4c9M1d6y7xBuAAAAAAAAAAAAAAAAAAAAAAAHRzOVssTbeuu6u2/wBCEecpvwX49ROmO152hpzZ6Ya72lWmos9eZmvvVfq7eL3p0YvkvF978ToY8UY47cuBqNVfPPfj4ao2qoAAAAAAAAAAAAAAAAAAAAAAAzWV1cWdxG4ta06NWPVKL93ivAxasWjaU6Xtjt1VnaU70/rO2uVGhlFG2rdSqr+7l5/m/ApZNNMd6uzp/Ea3+nJ2n59ksi1KKlFpprdNPdNFV0ondyGQAAAAAAAAAAAAAAAAAAcSajFyk0klu23skgxM7InqDWdtbKVDFqNzW6nVf93Hy/O+Bax6aZ72c3UeI1p9OPvPz7IJe3VxeXEri6rTrVZdcpP3eC8C7WsVjaHGve2S3Vad5YTKAAAAAAAAAAAAAAAAAAAAAAAAAAAG0wmeyWJajbVulR350anOD8u72GvJirflZwarJh9M9vhN8PrDGXvRp3LdlWfLao94N+Ev47FO+ntXju6+HxDFk7W7SkUWpRUotSi+aae6ZXXondyGQAAAAAAAAAAAAAHEpKMXKTUYrm23skGJnZHcxrDGWXSp2zd7WXLam9oJ+Mv4blimntbnso5vEMWPtXvKEZvPZLLNxua3Ro78qNPlBeff7S5jxVpw5GfVZM3qnt8NWbFYAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAO7jMrkcbLeyu6lKPbDfeL+y+RC2Ot+YbsWfJi9E7JPjdd1I7RyFkp986D2f6r/iV7aX9Mujj8Un+5X+EisdT4S82UL6FKb+rWXQfv5e80WwXr7L2PW4b8W/lt6co1I9KnKM4vti917jVtssxMT3hyYZAAAAAAAcVJRpx6VSUYRXbJ7L3mdt2JmI7y1F9qfCWe6nfQqzX1aK6b93L3m2uC9vZWya3DTm38I7ktd1Jbxx9kod0673f6q/ib66X9UqOTxSf7df5RjJ5XI5KW97d1KseyG+0V7FyLFcdacQ52XPky+ud3SJtIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAyUK9a3l0qFapSffCbj8DExE8pVtavpnZs7fU2doLaOSqzXdUSn8Ua5wY59liutz1/M71LW2ah9ONpV86W3wZCdNRujxLNHOzsw15fr6Vhay8pSRH8LX5bI8Uyfph+/6+3f/AC23/wC5IfhI+Wf/AFL/AKYfievL9/RsLWPnKTH4WvyxPimT9MOtV1tmp/QjaUvKlv8AFko01Gu3iWaeNnRuNTZ2utpZKrBd1NKHwROMGOPZptrc9vzNZXr1riXSr1qlV985uXxNkREcK9rWt6p3YzKIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//Z',
                description: 'thong tin nguoi thue',
                facebookUrl: 'https://facebook.com/',
                instagramUrl: 'https://www.instagram.com/',
                youtubeUrl: 'https://www.youtube.com/',
            } as ICreateTenantProfileRequest;

            const createTenantProfile =
                await this.createTenantProfileAdminService.createTenantProfile(
                    dataCreateTenantProfile,
                );

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
                    domain: Profile.domain,
                },
            };
        } catch (error) {
            throw error;
        }
    }
}
