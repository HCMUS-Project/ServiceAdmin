import { SignInRequest, SignInResponse } from 'src/proto_build/auth/sign_in_pb';

export interface ISignInRequest extends SignInRequest.AsObject {}
export interface ISignInResponse extends SignInResponse.AsObject {}
