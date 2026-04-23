import axios, { type AxiosInstance } from 'axios';
import { createHmac } from 'node:crypto';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BinanceCredentials {
  apiKey: string;
  apiSecret: string;
}

export interface BinanceBalance {
  asset: string;
  free: string;
  locked: string;
}

export interface BinanceAsset {
  coin: string;
  name: string;
  free: string;
  locked: string;
  freeze: string;
  withdrawing: string;
  networkList: BinanceNetwork[];
}

export interface BinanceNetwork {
  network: string;
  coin: string;
  withdrawIntegerMultiple: string;
  isDefault: boolean;
  depositEnable: boolean;
  withdrawEnable: boolean;
  name: string;
}

export interface BinanceTrade {
  id: number;
  symbol: string;
  orderId: number;
  orderListId: number;
  price: string;
  qty: string;
  quoteQty: string;
  commission: string;
  commissionAsset: string;
  time: number;
  isBuyer: boolean;
  isMaker: boolean;
  isBestMatch: boolean;
}

interface BinanceErrorBody {
  code: number;
  msg: string;
}

// ---------------------------------------------------------------------------
// Error class
// ---------------------------------------------------------------------------

export class BinanceApiError extends Error {
  public readonly code: string;
  public readonly binanceCode?: number;

  constructor(message: string, code: string, binanceCode?: number) {
    super(message);
    this.name = 'BinanceApiError';
    this.code = code;
    this.binanceCode = binanceCode;
  }
}

// ---------------------------------------------------------------------------
// Binance API error codes that indicate invalid credentials
// ---------------------------------------------------------------------------
const INVALID_CREDENTIAL_CODES = new Set([-2008, -2015, -1022, -2014]);

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

const BASE_URL = 'https://api.binance.com';
const RECV_WINDOW = 5000;

export class BinanceClient {
  private readonly http: AxiosInstance;

  constructor(private readonly credentials: BinanceCredentials) {
    this.http = axios.create({
      baseURL: BASE_URL,
      timeout: 10_000,
    });
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  private sign(queryString: string): string {
    return createHmac('sha256', this.credentials.apiSecret)
      .update(queryString)
      .digest('hex');
  }

  private async request<T>(
    endpoint: string,
    params: Record<string, string> = {},
    signed = false,
  ): Promise<T> {
    const headers: Record<string, string> = {};

    if (signed) {
      headers['X-MBX-APIKEY'] = this.credentials.apiKey;

      const timestamp = Date.now().toString();
      const allParams: Record<string, string> = {
        ...params,
        recvWindow: RECV_WINDOW.toString(),
        timestamp,
      };

      const queryString = new URLSearchParams(allParams).toString();
      const signature = this.sign(queryString);
      const signedQuery = `${queryString}&signature=${signature}`;

      try {
        const response = await this.http.get<T>(`${endpoint}?${signedQuery}`, {
          headers,
        });
        return response.data;
      } catch (err) {
        throw this.handleAxiosError(err);
      }
    }

    // Unsigned request
    try {
      const response = await this.http.get<T>(endpoint, { params });
      return response.data;
    } catch (err) {
      throw this.handleAxiosError(err);
    }
  }

  private handleAxiosError(err: unknown): BinanceApiError {
    if (axios.isAxiosError(err)) {
      const body = err.response?.data as BinanceErrorBody | undefined;

      if (body !== undefined && typeof body.code === 'number') {
        const msg = body.msg ?? 'Unknown Binance API error';

        if (INVALID_CREDENTIAL_CODES.has(body.code)) {
          return new BinanceApiError(
            `Binance credential error (${body.code}): ${msg}`,
            'BINANCE_INVALID_CREDENTIALS',
            body.code,
          );
        }

        return new BinanceApiError(
          `Binance API error (${body.code}): ${msg}`,
          'BINANCE_API_ERROR',
          body.code,
        );
      }

      const httpStatus = err.response?.status;
      return new BinanceApiError(
        `Binance HTTP error: ${httpStatus ?? 'network failure'} — ${err.message}`,
        'BINANCE_HTTP_ERROR',
      );
    }

    if (err instanceof Error) {
      return new BinanceApiError(err.message, 'BINANCE_UNKNOWN_ERROR');
    }

    return new BinanceApiError('Unknown error communicating with Binance', 'BINANCE_UNKNOWN_ERROR');
  }

  // -------------------------------------------------------------------------
  // Public API methods
  // -------------------------------------------------------------------------

  /**
   * Returns spot balances for assets with a non-zero total balance.
   * Endpoint: GET /api/v3/account
   */
  async getSpotBalances(): Promise<BinanceBalance[]> {
    const data = await this.request<{ balances: BinanceBalance[] }>(
      '/api/v3/account',
      {},
      true,
    );

    return data.balances.filter(
      (b) => parseFloat(b.free) + parseFloat(b.locked) > 0,
    );
  }

  /**
   * Returns all assets including coin details.
   * Endpoint: GET /sapi/v1/capital/config/getall
   */
  async getAllAssets(): Promise<BinanceAsset[]> {
    return this.request<BinanceAsset[]>('/sapi/v1/capital/config/getall', {}, true);
  }

  /**
   * Returns historical trades for a given symbol, optionally starting from a
   * specific trade ID.
   * Endpoint: GET /api/v3/myTrades
   */
  async getMyTrades(symbol: string, fromId?: number): Promise<BinanceTrade[]> {
    const params: Record<string, string> = { symbol };

    if (fromId !== undefined) {
      params['fromId'] = fromId.toString();
    }

    return this.request<BinanceTrade[]>('/api/v3/myTrades', params, true);
  }

  /**
   * Tests API connectivity and credential validity.
   * Returns true when both the public ping and the authenticated /account
   * call succeed.
   */
  async testConnectivity(): Promise<boolean> {
    try {
      // Step 1: unauthenticated ping
      await this.request('/api/v3/ping');

      // Step 2: authenticated account endpoint to validate credentials
      await this.request('/api/v3/account', {}, true);

      return true;
    } catch {
      return false;
    }
  }
}
