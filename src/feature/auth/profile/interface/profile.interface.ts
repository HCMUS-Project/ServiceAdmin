import {
    GetProfileRequest,
    GetProfileResponse,
    UpdateProfileRequest,
    UpdateProfileResponse,
} from 'src/proto_build/admin/profile_pb';

export interface IGetProfileRequest extends GetProfileRequest.AsObject {}
export interface IGetProfileResponse extends GetProfileResponse.AsObject {}

export interface IUpdateProfileRequest extends UpdateProfileRequest.AsObject {}
export interface IUpdateProfileResponse extends UpdateProfileResponse.AsObject {}
