import { SignUpRequest, SignUpResponse } from 'src/proto_build/admin/sign_up_pb';

export interface ISignUpRequest extends SignUpRequest.AsObject {}
export interface ISignUpResponse extends SignUpResponse.AsObject {}
