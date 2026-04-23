import { apiClient } from '../lib/api';
import type {
  Account,
  CreateAccountDTO,
  UpdateAccountDTO,
  NetWorthData,
  Transaction,
} from '../types/api';

export async function getAccounts(): Promise<Account[]> {
  const response = await apiClient.get<{ data: Account[] }>('/accounts');
  return response.data.data;
}

export async function getAccount(id: string): Promise<Account> {
  const response = await apiClient.get<{ data: Account }>(`/accounts/${id}`);
  return response.data.data;
}

export async function createAccount(data: CreateAccountDTO): Promise<Account> {
  const response = await apiClient.post<{ data: Account }>('/accounts', data);
  return response.data.data;
}

export async function updateAccount(id: string, data: UpdateAccountDTO): Promise<Account> {
  const response = await apiClient.patch<{ data: Account }>(`/accounts/${id}`, data);
  return response.data.data;
}

export async function adjustBalance(
  id: string,
  newBalance: number,
  note?: string,
): Promise<{ account: Account; transaction: Transaction }> {
  const response = await apiClient.patch<{ data: { account: Account; transaction: Transaction } }>(
    `/accounts/${id}/balance`,
    { newBalance, note },
  );
  return response.data.data;
}

export async function archiveAccount(id: string): Promise<void> {
  await apiClient.delete(`/accounts/${id}`);
}

export async function getNetWorth(): Promise<NetWorthData> {
  const response = await apiClient.get<{ data: NetWorthData }>('/accounts/net-worth');
  return response.data.data;
}
