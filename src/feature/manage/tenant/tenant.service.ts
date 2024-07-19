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
import { ICreateTenantRequest } from 'src/feature/externalServices/tenant/createTenant/createTenant.interface';

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
                logo: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIbGNtcwIQAABtbnRyUkdCIFhZWiAH4gADABQACQAOAB1hY3NwTVNGVAAAAABzYXdzY3RybAAAAAAAAAAAAAAAAAAA9tYAAQAAAADTLWhhbmSdkQA9QICwPUB0LIGepSKOAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAAF9jcHJ0AAABDAAAAAx3dHB0AAABGAAAABRyWFlaAAABLAAAABRnWFlaAAABQAAAABRiWFlaAAABVAAAABRyVFJDAAABaAAAAGBnVFJDAAABaAAAAGBiVFJDAAABaAAAAGBkZXNjAAAAAAAAAAV1UkdCAAAAAAAAAAAAAAAAdGV4dAAAAABDQzAAWFlaIAAAAAAAAPNUAAEAAAABFslYWVogAAAAAAAAb6AAADjyAAADj1hZWiAAAAAAAABilgAAt4kAABjaWFlaIAAAAAAAACSgAAAPhQAAtsRjdXJ2AAAAAAAAACoAAAB8APgBnAJ1A4MEyQZOCBIKGAxiDvQRzxT2GGocLiBDJKwpai5+M+s5sz/WRldNNlR2XBdkHWyGdVZ+jYgskjacq6eMstu+mcrH12Xkd/H5////2wBDABIMDRANCxIQDhAUExIVGywdGxgYGzYnKSAsQDlEQz85Pj1HUGZXR0thTT0+WXlaYWltcnNyRVV9hnxvhWZwcm7/2wBDARMUFBsXGzQdHTRuST5Jbm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm5ubm7/wAARCAUAAtADASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDq6KKKgoKKKWgBKKKWgBKKWigBKKWigBKKWikAlFLRQAlFLRQAlFLRQAlFLSUAIaKKKACiiigAooooAKKKKACiiloAKKKKACiiigAooooAKKWigBKKWigAooooAKKKKACiiloASilooAKKKKYgooooGFFFLQAlFLRQAUUUtAhKKWigBKKWigYUUUUAFFFLQISilooASloooAKKKWgBKKWigBKKWigAooooAKKKWgBKKWigBKWiigAooooAKKKWgAooooAgooooGFFFFABRRRQAUUUUAFFFFABRRRQAUUUUgCiiigAooooAKQ0tIaAEopaKAEopaKAEpaKKACiiigAooooAKKWigBKKWigAooooAKKKKACilooASloooAKKKKACiiigAopaKBCUUtFABRRRTAKKWigBKWiigAooooAKKWigBKKWigAooooAKKWigBKKWigBKWiigAooooAKKWigBKKWigAooooAKKKKACiiloASilooAKKKKACilooASilooAr0UUUDCiiigAopaKAEpaKKQBRRRQAUUUUAJS0UUAJS0UUAJRS0UAIaSlNJQAUUUUAFFFFABRRRQAUtFFABRRRQAUUUUAFFFLQAlLRRQAUUUUAFFFFABRS0UAJRS0UCCiiigAoopaAEopaKAEpaKKACiilpgJS0UUAFFFFIAopaKYCUUtFABRRRSAKKKKYBRRS0gEpaKKACiiimAUUUUAFFLRQAlLRRQAUUUUAFFFLQAlFLRQAlLRRQAUUUtACUUtFAFeiiikMKKKKACiiigAooooAKKKKACiiigAooooAKKKKACkpaQ0AJRRS0AJS0UUAFFFFABRRRQAUUUUAFFLRQAUUUUAFFFFABRS0UCEpaKKACiiigAooooAKKWigBKWiigAooooAKKWigAooooAKKKKACilooAKKKKYBRRRSAKKKWmAlFLRSAKKKKYBRRRQAUUUtACUtFFABRRRQAUUUUAFFFFABRS0UAFFFFABRRRQAUUUUAFLRRQAUUUUAV6KKKQwooooAKKKKACiiigAooooAWkpaKAEopaSgAooooAKSlNJQAUUUUAFFFFABRRRQAUUUtACUtFFABRRRQAUUUtAgooooAKKKKACiiloASilooAKKKKACiiigAopaKACiiigAoopaAEopaKACiiigAoopaAEopaKAEopaKACiiigAooooAKKWigBKWiigAooooAKKKKYBRRS0AJRS0UAJS0UUgCiiimAUUUUAFFFLQAlFLRQAUUUUCCiiigCvRRRQUFFFFABRRRSAKKKKACloooAKKKKACiiigApKWkNACUUUUAFFFFABRRRQAtFFFABRRRQAUUUUAFLRRQAUUUUCCiiloASilooAKKKKACiiloASloooAKKKKACiiloASilooAKKKKACiiloASilooAKKKKACiiigAooooAKWiigAooooAKKKKACiiloASilooASloooAKKKKACiiigAooopgFFFFIQUtFFMAooooAKKKKACiiigAooooAr0UUUigooooAKKKKAClpKKAFooooAKKKKACiiigApppTSUAFFFFABRRRQAtFFFABRRRQAUUUtACUtFFABRRRQIKKKWgAooooAKKKKACiiloAKKKKACiiigAooooAWiiigAooooAKKKWgAooooAKKKKACiiigApaSloAKKKKACiiigQUUUUAFLRRQMKKKKBBRRRQMKKKKYgooopAFFFFABRS0lABS0UUwCiiikAUUUUwCiiigAooooAKWkpaAK1FFFIoKKKKACiiigAooooAWiiigAooooAKKKQ0AIaKKKACiiigBaKKKACiiigAoopaBBRRRQAUUUUAFFFLQAUUUUAFFFFABRRRQAtFFFABRRRQAUUUtABRRRQAUUUUAFLSUtABRRRQAUUUUAFFLRQAUUUUAFFFFABRRRQAUUUtAgooooAKKKKACiiigAooooAKKKWmAlFFLSASloopgFFFFIAooopgFFFFIAooopgFFFFABRRRQAtFFFAFaiiikUFFFFABRRRQAUtJS0AFFFFABRRRQAUhpabQAUUUUAFLRRQAUUUUAFFFLQIKKKKACiiigApaSloAKKKKACiiigApaKKACiiigAooooAKKKWgBKWkpaACiiigAooooAWiiigAooooAKKKWgAooooAKKKKACiiigAoopaAEpaKKBBRRRQAUUUUAFFFFABRRS0AFFFFABRRRTAKKKKACiiigAooooAKKKKAClpKWgBKKKKAClpKWgAooooArUUUUigooooAKKKKACloooAKKKKBBRRRQMQ0lBooAKKKWgAooooAKKKKBBS0UUAFFFFABRRRQAUtFFABRRRQAUtJS0AFFFFABRRRQAUUUUAFLRRQAUUUUAFFFFABS0lLQAUUUUAFFFFAgpaSloAKKKKBhRRRQIKKKKACiiloAKKKKBhRRRQIKKKKACiiigApaSloAKKKKACiiigAooooAKKKKACiiimAUUUUgCiiimAUtJS0AFFFFABRRRQBWooopFBRRRQAUUUUCCloooAKKKKACkNLSGgYlFFFABS0UUAFFFFAgoopaACiiigAooooAKWkpaACiiigAoopaAEpaKKACiiigAooooAKKKWgAooooAKKKKACiiigApaSloEFFFFAwooooEFLSUtAwooooEFFFFABRRRQAUtFFABRRRQAUUUUAFFFLQAUUUUAJS0UUAFFFFABRRRQAUUUUAFFFFABRRRQAtFJRQAtJRRQAUtJS0AFFFFMAooooArUUUUigooooAKKKKBBS0lLQAUUUUAIaSlNJQMKWiigAooooEFFFFABS0lLQAUUUUAFFFFAC0UUUAFFFFACClzSUUAOopKKAFooooAKKKKACloooAKKKKACiiigAooooAWiiigAooooAKKKKACloooEFFFFABRRRQAUUUUALRRRQAUUUUAFFFFABS0lFAC0UUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUtACUtFFMBKKKWkAlLSUtABRRRQAUUUUwK1FFFIoKKKKBBRRS0AFFFFABQaKQ0AJS0lLQMSloooAKKKKBBRRRQAUtFFABRRRQAUUUUALRRRQAUlLRQAlFLRQAUUUUAFFFFAC0UlLQAUtJmloAKKKKACiiigAoopaACiiigQUUUUDClpKWgAooooEFFFFABRRRQAUtJS0AFFFFABRRRQAUUUtACUUUUALRSUtABRRRQAUUUUAFFFFABRRRQAUtFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFMCtRRRSGFFFFABS0lLQAUUUUAFJQaSgYUtJRQIWiiigAooooAKKKKAFopKWgAooooAKKKKACiiigAooooAKKKKAFopKWgAooooAWikpaACiiigApaSigQtFJS5oAKWkooGLRRRQIKKKKBhS0lLQAUUUUCCiiigAooooAWikpaACiiigAooooAKKKKACiiigBaKSloAKKKKACiiigAooooAKKKKACiiigBaKKKACiiigAooooAKKKKACiiigAooopgVqKKKQwooooAKWiigYUUUGgQlJRRQAUtJS0DCiiigQUUUUAFFFFABS0lLQAUUUUAFFFFABRRRQAUUUUAFFFFABS0lFAC0UlLQAUUUUAFLSUUCFopKWgAooooAKXNJRQAtLTaXNAC0UmaWgBaKSigBaKKKACiiigAooooAKWkooAWiiigAooooAKWkpaACiiigAooooAKKKKACiiigAoopaAEopaKAEopaKACiiigAooooAKKKKACiiigAooooAKKKKAK1FFFAwooooAWiiigApDQaSgAooooGFLSUUCFooooAKKKKACiiigApaSigBaKKKACiiigAooooAKKKKACiiigApaSigQUUUUALRSUUALRRRQAUUUUAFLSUUAFLSUUALRRRQAUtJRQAuaWm0tADqKbmlzQAtFFFABRRRQAUtJRQAtFFFABRRRQAUtJRQAtFFFABRRRQAUUUUAFFFFAC0UUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFMAooooAq0tJRSGLRRRQAUtJRQAGkoooGFFFFAgooooAWiiigAooooAKKKKACiiigApaSigBaKKSgBaKKKBBRRRQMKKKKBBRRRQAUUUUAFLSUUAFLSUtABRRRQAUUUUAFFFFABS0lFAC0UUUAFFFFAC0UlFAC5pc0lFADqKbS5oAWikzS0AFLSUUALRRRQAUUUUAFLSUtABRRRQAUUUUAFFFFAC0UlLQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFAFWilooGFFFFABSGlpKACikpaACiiigAooooAKKKKAFopKWgAooooAKKKKACiiigAooooAWkoooELRSUtABRSUtABRRSUALRRRQAUUUUAFFFFABRRRQAtFJRQAtFJS0AFFFFABRRRQAtFFFABRRRQAUtJRQAtFJS0ALRSUUALmlptLQAtLTc0tAC0UUUAFFFFABS0lFAC0UlFAC0UUUAFFFFAC0UlFAC0UlFAC0UlLQAUUUUAFFFFABRRRQAUUUUAFFFFAFaikpaBhRRRQAhpKKKAClpKKAClpKWgAooooAKKKKACiiigBaKKKACiiigAooooAKKKKACiiigQUUUUAFFFFABS0lFABRRRQAtFFJQAtFFFABRRRQAUUUUAFFFFABS0lLQAUUUUAFFFFABS0lFAC0UlLQAUtJRQAtFJS0AFLSUUALRSUtAC5ozSUUAOoptLmgBaKKKACiiigBaKSigBaKKKACiiigAooooAKKKKAFopKKAFooooAKKKKACiiigAooooAq0UUUDFpDS000AFFFFABRRRQAUUUUALRRRQAUUUUAFFFFABRRRQAtFJS0AFFJRQAtFFJQIWikooAWikooAWikpaACiiigAopKWgAooooGFFFFABS0lFAhaKKKACiiigAooooAKKKKAFopKWgAooooAWikooAWikpaACiiigBaKKKACiiigBaKSloAKKKKAFozSUUAOopBRQAtFGaKAFooooAKKKKACiiigAooooAKKKKACiiigApaSloAKKKKACiiigCrRRRQMDSUGigAooooAKKKKACiiigApaSigBaKSloAKKKKACiiigAooooAKWkooAWkoooEFFFFABRRRQAUUUUAFFFFABRRRQMWiikoAWikpaACiiigQUtJRQAtFJRQAtFFFAwooooEFLSUUALRRRQAUUUUAFLSUUALRRRQAUtJRQAtFFFABRRRQAUtJS0AFFFFABS0lLQAUUlLQAuaM0lFAx1FJRmgQtFFFABRRRQAUUUUAFFFFABRRRQAUtFFABRRRQBVoNFIaBhSUUUAFLSUUALRRRQAUUUUAFFFFABRRRQAtFJS0AFFFFABRRSUALRRRQIKKKSgBaKKKAEpc0lLQAUUlFAC0UUUDCiiigAooooAWikpaACiiigAooooAWkoooAKKKWgAooooAKKKKAFpKWigQUUUUAFFFFABS0lLQAUUUUAFFFFAC0UUUAFLSUUAFLSUUALRRRQAUUUUALRSUtABRRRQAtGaSigY6ikozQIWikzS0AFFFFABRRRQAUtJRQAtFJS0AVabSmkoGFFFFABRRRQAUUUUALRSUUALRRRQAUUUUAFFFFABS0lFABS0lFAhaSiigAooooAKKKKACiiigApaSigApaSloGFFJRQAtFJS0AFLSUUAFFFFABS0lLQAUUUUCClpKKBi0UUUAFFFFAgoopaBiUtFFABRRRQAUtJRQIWiiigYUUUUCCiiloAKKKKACiiigBaKKKACiiigApaSigBaKKKACiiigYUUUUALRSUUAOopKKBC0UmaWgAooooAWkopaAKdFFFAwooooAKKKKACiiigAooooAKWkooAWikpaACiiigAoopKAFooooEFFJRQAtFJRQAUUUUALRRRQAUUUUAFFFFAwooooAKKKKAFopKWgAooooAWkoooAKWkooELRRRQAUUUUALRSUtABRRRQAUtJRQAtFJS0DClpKKBC0UlLQMKKKKBBRRRQAtFJS0AFFFFABS0lLQAUUUUAFFFFABS0lLQAUUUUAFFFFABRRRQAUtJS0DCikpaAFopKKAFopKXNAinRRRQMKKKKAClpKKAFooooAKKKKACiiigAooooAWikooAWkoooAKKKKBBRRRmgAooooAKM0UUAFFFFABS0gpaBhRRRQAUUUUAFFFFAgooooGFFFFAC0UlFAC0UlLQAUtJRQAtFJRTELRRRSAWikopgLRRRSAKWkopgLRRRSAKKKKAClpKWgAooooGLRSUUALRRRQIKKKKAFooooAKKKKACiiigBaKSigBaKKKACiiigBaKSloGJRS0UCCiiigYUUUUAVKKKKACiiigAooooAKKKKAClpKKAFopKWgAooooAKKKKACiiigQUlFFABRRRQAUtJRQAZoopaACiiigAooooGFFFFAC0UUlABS0hNNLUAPpM0wvTTJQFiXNGah8yk30XHYn3Ubqg30b6LjsT7qTdUO+jdRcLE4al3Cq+6l30BYnzS5qDfS76BWJqWoQ9OD0BYlopganBqBC0UUUCCiiimAUtJRQAtFJS0gCiiigBaKSloGFFFFABS0lLQAUUUUCClpKKAFopKWgAooooAKKKKACloooAKKKKACiiigAooooAWiiigAooooAp0UUUDCiiigApaSigBaKSloAKKKKACiiigBaKSigBaSlpKACiiigQUUUUAFFFFABRSUtABRRRQAUUtFABRSUUALRmkLVE0mKBkpbFMaSoGkphfNIpInMlML1HmjNBVh+40mabmjNIdh2aM03NLmgLDs0ZptGaAHZozSZozQA7NLmmUtAWHZpc02imA/NLmo80uaBEganBqiBpc0CsTB6eHqvmnBqYrFjNFQhqerUCsPooBpaBCUUtJTELRSUtABRRRSAWiiigApaSloGFJS0UAFFFFABS0lFAhaKKKACiiigAooooAWiiigAooooAKKKKAClpKKAFpKKKAKlFJRQMWiiigAooooAKKKKAClpKKAFooooAKKKKACiiigAooooEFFFFAwpKKKBC0UUUDCiiigQUUUE4oACaYz4pryYqs8uaBpEjy1Ezk1GWzS5pXNEh2aUUzNLmkUOzRTc0uaAHUU3NLQAtLSUUALmjNJRQA6im5paAFpaSloAWikpaAFooooEKKWkpRTAKdmkooEOzSg0yloCxKGp4aoc0oNBNicGlqINTw1MTQtFLRTEFFFFABS0lLSAKKKKAFopKKAFooooAKKKKAClpKKBBQKWigAooooAKWkooAWikpaACiiigAooooAKKKKBlOiiigAooooAKWkooAWikopgLRRRSAKWkooAWikooAKKKKBC0lFFABRSZpaACiiigApaSigYtFFBNAhCaikkwKJZMVSllyaRSQ6SXJqLNNzmlzQaJDs0uaZmlBpDHU7NNzSZpgPzRmmZpc0AOzS5plLQA8NS5pgoFAD80U2lpALS0lKKAFpaSloAKcKbS0ALS02lFADqUUgpc0CFopKcKYCUtFFABS5oooAcDTgajpQaBEwanZqEGnq1BLRJRQDmimSFFFFMBaKSlpAFFFFAgpaSigBaKKKBhRRRQIKKKKAFooooAKKKKAClpKKAFooooAKKKKACiiigZSooopgFLSUUALRRRQAUUUUAFFFFAC0UlLQAUUhopCFopKKAFpKWkoABS0UlAC0UUUAFFFLQAGopJNopztgVRuJaBpDZpcmoM5NISSaUUjVIWikooKHUoNNozQIdmlpuaUGgBaWm0ZoAfmjNNBpaAFFOFNzRmgB9GaYDThQA6lptLSAcKXNJSZoAdS5puaM0APpRTRTqAFzS5ptKKBDhS00U6gBRS0gopgLS0gNGaAClpBS0gDNOBptKKAJFang5qEGnqaZLRJRSA5paZAUUUUwFopKWkAUUUUAFLSUtABRRRQAUUUUCClpKKYC0UUUAFFFFIApaSigBaKKKACiiigClRSUUxi0UlLQAUUUUALRSUUALRRRQAUUUGgAopKKBC0UlLSAKKKKACikpaAFopKWgAoY4FFRTPtFICC4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p6jZiePeg/eL+tYTDBIPWuqIrI1S02kzIOD94U0Bl0lONNpiCiiikAUUUUwCikopALRSZooAWiiigAooooAWikooELRSUUALRRRQB1mKTFOpMUFiYoxS0tAhuKMUtFACYpcUUtACYopaKACiiigAptLRQAmaM0GmmkA/NIQDTc0oNMBpBFKDTutIRQAmaUGm0UAP3Ubqj3U0tSAkL1Gz00tTCc0wHFs0nWhVNSKlAxgUmnBKlC04LQIi2UbKlxRigCLbSbamxSFaQEW2kxUu2k20AMxRin4oxQA3FLiloxQAlFLijFADSKSn0mKAG0UpFJigAooxTsUANpaMUtAABRSiloASloxS0AJRRRQAUUUUALSUtAFABQBTgKUCgAApcUUtADcUuMilooATFNZeKfSGgCIEpw33T0odAykEZBp7AYwaYpwdh/CgDn721a2lI/gP3TVYiulubdLiMo447H0rBurZ7aTa447N60wK9JTjTaBBRRRTAKKKKACikopALRSUtABRRRQAUtJRQAtFJS0AFFFFAHXUU0NTs0DCiikoAWikooAKKKKBhRRSUCFopKKADNFJRSAWkpaSmAhFJTqaaAFBozTDxSFqBjyaYWppamk0AKWppbNNNOVeaQAATUix0qAVKBTENCYp2KXNBoABS0zNGcUASUU1Wp2aACjFFFIBMUYp1FADMUmKfijFADMUYp2KMUANxRinYoxQAzFGKfikxQAwigU/FGKAG4oxilIpKADFGKWkoAMUUtGKACijFFABijFFGaACgClpQKAExSgUtKKADFFLRQAUUtFABSUtFACUlBppNACPSMu4cdR0pDTlOKAEDblBqK4hSeIo44P6VKcA01qAOamiaGVkbqDUZrV1iDKLOOo4b6VlGmISiiimAlFFFABRRRSAKKKKACiiigAooooAWikpaAClpKKAOpBpwamUooKJM0ZpmaUGgB9FN3UuaACiikNAC0lJRQAtFJRQAtFJRQAZozSUhNADs00tTS1MLUAOLUwmkJpKQC5o60oWnqtMBoWnbaeFp2KAIxxTg1KVpMUCF60nNApaAEzSijFKBQAmKXJFKBS4zQAK/rT6j24pymgB1FLRSASiilpgJRRRSAKKKKYCUYpaKQCYopaSgBDSYp1JQA3FFLRTABRS0UAGKMUUopAJikxTqMUAN6UoNLikIoAdRSA+tOoAKWkpaACiikoAWkJpCaaTQAE00mkJpuaAFpwpAKcKAA1Gx+UU5jzTAN5oAZIFkQo/IYYNc7KhjkZfQ4rpJYh5ZwORzXOztvlZsYyaaAipKWkpiCiiigAopKKAFopKKAFoopKQC0UlLTAKKSlpAFFFFAHU0UgNLQUFLRilxQAlOBpMUlAElJTQacDmgBKKWkoAKKKSgBaTNITTS1AClqYWpC1NJpABNJminBaAEAzTlWnKtPC0wEVaeBSgUtAgxRiiloATFJinUUAMIoxTqMUAJRilxRQAgNO+lNxSigBRS4oooAM0uaaaTNAD6KQGjNAC0UmaKQC0UlFAC0lFFABRRRTASkpaSkAUUUUwFpaSloAKSlopAIGp2aYRQKAH0hpM0oNABSg0YpDxQA+imbqXNAC5pCaQmmk0AKTTCaCaYTQAZpQKQc08CgBwFIxpScCoicmgAPNSouBSIvrUgoAaRWBq1t5FzuUfI/I9jXQGqWpwefasO68imBzppKWkpgFJRRQIKKKKACiiigAooooAKKKKAClpKKAFopKKAOpxSilxSHikUPxQKQNS5oAWkIpaKAGYo6U7FIRQAoNKaZ0o3UALmkJppNMLUAOLUwtTS1NzSGOzQBmlVc1IqUxDVWpFWlC04CgAApaKWgQUUUUAFLRRQAUUUUAFFFFABRRRQAlLRRigBDmjNLSGgBCaTNKaSgBc0ZoxRigBQaXNJijpQAtLSZooAWikpaACiikpAFJS0lMApaSlFIBRS0lLTAKKKKQBTSKdRQBH0NKDSkU3pTAkBozTAaXNIBTTc4pC2KTdQApamlqQmmk0AKTSDmkFPUUDFUU88Ug4prNQIGNCL3pAMmpVGBQAopaSigAbpUbelPPSoz1oA5y9i8m6dO2cj6VXrV1uP5o5APYmso1QCUUUUAFJRRQAUUUUAFLSUUCClpKKAFopKKAFopKKQHW0hoooKGmlBopDQA8NS5qPNGaAJM0hNM3UhagBxNRs1NZ6YWoGOL00tmmU9VzSAAKeq09Up4WmA1VxT1NHSigQ8GlqPNODUAOoozRQAUUUUCFpKKKACiiigBaKSloAKKKKACiiigApDRmkzQAUCkpwoAWjFFFIAo60UUwEIoFGaWgAooooAWkoopAJRS0UAApaSloAWikpaACikooAWiikpgFIRS0lIBKSlNNJoACaYaUmmE0ABNJSU5RQMcoqTGBSKMUkjYFACM1NHJpmcmpUWgQ9BxT6QUtMAoopKAA9KjNPNMNIClqyb7Nj3U5rBrp508yF0PcEVzLAqSD24poBtJQeKTNMBaKSigBaKSigBaKSigBaKSigBaKSikAtFJRmmI//2Q==',
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
