import { SignOutRequest, SignOutResponse } from 'src/proto_build/admin/sign_out_pb';

export interface ISignOutRequest extends SignOutRequest.AsObject {}
export interface ISignOutResponse extends SignOutResponse.AsObject {}
