import {
    SendMailRequest,
    SendMailResponse,
    VerifyAccountRequest,
    VerifyAccountResponse,
} from 'src/proto_build/admin/verify_account_pb';

export interface IVerifyAccountRequest extends VerifyAccountRequest.AsObject {}
export interface IVerifyAccountResponse extends VerifyAccountResponse.AsObject {}

export interface ISendMailRequest extends SendMailRequest.AsObject {}
export interface ISendMailResponse extends SendMailResponse.AsObject {}
