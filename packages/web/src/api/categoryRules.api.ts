import { apiClient } from '../lib/api';

export interface CategoryRule {
  _id: string;
  userId: string;
  categoryId: string;
  keywords: string[];
  priority: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCategoryRuleDTO {
  categoryId: string;
  keywords: string[];
  priority?: number;
}

export interface UpdateCategoryRuleDTO {
  categoryId?: string;
  keywords?: string[];
  priority?: number;
  isActive?: boolean;
}

export async function getCategoryRules(): Promise<CategoryRule[]> {
  const response = await apiClient.get<{ data: CategoryRule[] }>('/category-rules');
  return response.data.data;
}

export async function createCategoryRule(data: CreateCategoryRuleDTO): Promise<CategoryRule> {
  const response = await apiClient.post<{ data: CategoryRule }>('/category-rules', data);
  return response.data.data;
}

export async function updateCategoryRule(
  id: string,
  data: UpdateCategoryRuleDTO,
): Promise<CategoryRule> {
  const response = await apiClient.patch<{ data: CategoryRule }>(`/category-rules/${id}`, data);
  return response.data.data;
}

export async function deleteCategoryRule(id: string): Promise<void> {
  await apiClient.delete(`/category-rules/${id}`);
}
