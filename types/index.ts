// CJ API Response Type

export interface CJApiResponse<T = unknown> {
  code: number;
  result: boolean;
  message: string;
  data: T | null;
  requestId?: string;
}

export interface CJAuthToken {
  openId: number;
  accessToken: string;
  accessTokenExpiryDate: string;
  refreshToken: string;
  refreshTokenExpiryDate: string;
  createDate: string;
}
// Product Type

export interface CJProduct {
  pid: string;
  productName: string;
  productNameEn: string;
  productSku: string;
  productImage: string;
  productWeight: number;
  productType: string;
  categoryId: string;
  categoryName: string;
  sellPrice: number;
  supplierId: string;
  supplierName: string;
  listedNum: number;
  variants: CJProductVariant[];
  productImages: string[];
  description: string;
}

export interface CJProductVariant {
  vid: string;
  variantName: string;
  variantNameEn: string;
  variantSku: string;
  variantImage: string;
  variantWeight: number;
  variantPrice: number;
  isSell: number;
  sellPrice: number;
}

export interface CJProductSearchParams {
  productName?: string;
  categoryId?: string;
  minPrice?: number;
  maxPrice?: number;
  pageNum?: number;
  pageSize?: number;
  orderBy?: string;
  categoryKeyword?: string;
}

export interface CJProductListData {
  total: number;
  pageNum: number;
  pageSize: number;
  list: CJProduct[];
}
// Order Type

export interface CJOrderProduct {
  vid: string;
  quantity: number;
  shippingName?: string;
}

export interface CJShippingAddress {
  consignee: string;
  phone: string;
  email?: string;
  country: string;
  province: string;
  city: string;
  address: string;
  address2?: string;
  zip: string;
  houseNumber?: string;
}

export interface CJCreateOrderPayload {
  orderNumber: string;
  shippingCountry: string;
  shippingAddress: CJShippingAddress;
  products: CJOrderProduct[];
  remark?: string;
}

export interface CJLogistic {
  trackNumber: string;
  shippingName: string;
  shippingNameEn: string;
  logisticStatus: string;
  updateTime: string;
}

export interface CJOrder {
  orderId: string;
  orderNum: string;
  status: string;
  statusName: string;
  payStatus: string;
  shippingCountry: string;
  createTime: string;
  logisticList?: CJLogistic[];
}
// Shipping Type

export interface CJShippingRate {
  logisticName: string;
  logisticNameEn: string;
  logisticPrice: number;
  logisticTime: string;
  isTracked: boolean;
}

export interface CJShippingQuery {
  pid: string;
  vid: string;
  quantity: number;
  countryCode: string;
}
// MongoDB Document Type

export interface TokenDocument {
  _id?: string;
  accessToken: string;
  accessTokenExpiryDate: Date;
  refreshToken: string;
  refreshTokenExpiryDate: Date;
  openId: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CachedProductDocument {
  _id?: string;
  pid: string;
  productData: CJProduct;
  cachedAt: Date;
  expiresAt: Date;
}

export type OrderStatus =
  | "pending"
  | "submitted"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled";

export interface OrderDocument {
  _id?: string;
  storeOrderId: string;
  cjOrderId?: string;
  status: OrderStatus;
  customerInfo: CJShippingAddress;
  products: CJOrderProduct[];
  totalAmount?: number;
  trackingNumbers?: string[];
  createdAt: Date;
  updatedAt: Date;
  rawCJResponse?: unknown;
}

export interface AppConfig {
  port: number;
  host: string;
  mongoUri: string;
  mongoDbName: string;
  cjApiKey: string;
  cjBaseUrl: string;
  jwtSecret: string;
  frontendUrl: string;
  nodeEnv: string;
}
// Router Type
export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "OPTIONS";

export type RouteHandler = (
  req: Request,
  params: Record<string, string>,
) => Promise<Response> | Response;

export interface Route {
  method: HttpMethod;
  pattern: URLPattern;
  handler: RouteHandler;
}
