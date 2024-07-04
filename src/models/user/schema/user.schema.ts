import * as mongoose from 'mongoose';
import { Tenant as TenantInterface } from '../interface/user.interface';
import { v4 as uuidv4 } from 'uuid';
import { TenantProfileSchema } from './profile.schema';
import {Role} from 'src/proto_build/admin/user_token_pb';

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
            required: false,
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

TenantSchema.index({ email: 1 }, { unique: true });