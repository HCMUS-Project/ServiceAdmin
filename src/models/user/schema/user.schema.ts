import * as mongoose from 'mongoose';
import { Tenant as TenantInterface } from '../interface/user.interface';
import { v4 as uuidv4 } from 'uuid';
import { Role } from 'src/proto_build/admin/user_token_pb';
import { TenantProfileSchema } from './profile.schema';

export const TenantSchema = new mongoose.Schema<TenantInterface>(
    {
        email: {
            type: String,
            required: true,
            // unique: true,
        },
        username: {
            type: String,
            required: true,
        },
        password: {
            type: String,
            required: true,
        },
        role: {
            type: Number,
            required: true,
            enum: Object.values(Role),
        },
        domain: {
            type: String,
            required: true,
            // unique: true,
        },
        is_deleted: {
            type: Boolean,
            default: false,
        },
        is_active: {
            type: Boolean,
            default: false,
        },
        is_verified: {
            type: Boolean,
            default: false,
        },
        is_rejected: {
            type: Boolean,
            default: false,
        },
        profile_id: {
            type: String,
            ref: 'tenantprofile',
        },
    },
    { timestamps: true },
);

TenantSchema.index({ email: 1, domain: 1 }, { unique: true });
