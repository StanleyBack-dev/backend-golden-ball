import {
  DataResponse,
  ResponseMessageDefinition,
} from "../interfaces/response.interface";

export function buildDataResponse<TData>(
  data: TData,
  definition: ResponseMessageDefinition,
): DataResponse<TData> {
  return {
    success: true,
    message: definition.message,
    code: definition.code,
    data,
  };
}
