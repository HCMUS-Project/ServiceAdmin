import * as mongoose from 'mongoose';
import { TenantProfile as ProfileInterface } from '../interface/profile.interface';
import { v4 as uuidv4 } from 'uuid';

export const TenantProfileSchema = new mongoose.Schema<ProfileInterface>(
    {
        username: {
            type: String,
            required: true,
        },
        phone: {
            type: String,
            required: true,
        },
        gender: {
            type: String,
            required: false,
        },
        address: {
            type: String,
            required: false,
        },
        age: {
            type: Number,
            required: false,
        },
        avatar: {
            type: String,
            required: false,
        },
        name: {
            type: String,
            required: false,
        },
        is_deleted: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true },
);
