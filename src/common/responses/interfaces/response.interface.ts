export interface BaseResponse {
  success: boolean;
  message?: string;
  code?: string;
}

export interface ResponseMessageDefinition {
  code: string;
  message: string;
}

export interface DataResponse<TData> extends BaseResponse {
  data: TData;
}
