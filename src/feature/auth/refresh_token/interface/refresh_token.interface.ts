import { RefreshTokenRequest, RefreshTokenResponse } from 'src/proto_build/admin/refresh_token_pb';

export interface IRefreshTokenRequest extends RefreshTokenRequest.AsObject {}

export interface IRefreshTokenResponse extends RefreshTokenResponse.AsObject {}
