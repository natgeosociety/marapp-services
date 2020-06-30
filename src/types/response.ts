export interface SuccessResponse {
  code: number;
  data: any;
}

export interface ErrorObject {
  code: number;
  source?: { pointer?: string; parameter?: string };
  title: string;
  detail: string;
}

export interface ErrorResponse {
  errors: ErrorObject[];
}

export interface PaginationMeta {
  total: number;
  page?: number;
  size?: number;
  nextCursor?: string;
  previousCursor?: string;
}

export interface ResponseMeta {
  results: number;
  pagination: PaginationMeta;
  filters?: object;
}

export interface PaginationCursor {
  id?: string;
  sort?: { [key: string]: [any, 1 | -1] };
  reverse?: boolean;
}
