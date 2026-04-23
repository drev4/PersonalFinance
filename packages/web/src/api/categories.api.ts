import { apiClient } from '../lib/api';
import type { Category, CreateCategoryDTO, UpdateCategoryDTO } from '../types/api';

export async function getCategories(): Promise<Category[]> {
  const response = await apiClient.get<{ data: Category[] }>('/categories');
  return response.data.data;
}

export async function createCategory(data: CreateCategoryDTO): Promise<Category> {
  const response = await apiClient.post<{ data: Category }>('/categories', data);
  return response.data.data;
}

export async function updateCategory(id: string, data: UpdateCategoryDTO): Promise<Category> {
  const response = await apiClient.patch<{ data: Category }>(`/categories/${id}`, data);
  return response.data.data;
}

export async function deleteCategory(id: string): Promise<void> {
  await apiClient.delete(`/categories/${id}`);
}
