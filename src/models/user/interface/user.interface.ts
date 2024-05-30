import { Document } from 'mongoose';
import { Role } from 'src/common/enums/role.enum';
import { TenantProfile } from './profile.interface';

export interface Tenant extends Document {
    readonly email: string;
    readonly username: string;
    readonly password: string;
    readonly role: Role;
    readonly domain: string;
    readonly is_deleted: boolean;
    readonly is_active: boolean;
    readonly is_verified: boolean;
    readonly profile_id: TenantProfile | string;
}
