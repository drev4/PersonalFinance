import mongoose from 'mongoose';
import { CategoryModel, type ICategory } from './category.model.js';

export interface CreateCategoryDTO {
  userId: string;
  name: string;
  type: 'income' | 'expense';
  parentId?: string;
  color: string;
  icon: string;
  isDefault?: boolean;
}

export interface UpdateCategoryDTO {
  name?: string;
  type?: 'income' | 'expense';
  parentId?: string;
  color?: string;
  icon?: string;
}

const DEFAULT_EXPENSE_CATEGORIES: Array<{
  name: string;
  color: string;
  icon: string;
}> = [
  { name: 'Alimentación', color: '#4CAF50', icon: 'ShoppingCart' },
  { name: 'Transporte', color: '#2196F3', icon: 'Car' },
  { name: 'Hogar', color: '#FF9800', icon: 'Home' },
  { name: 'Salud', color: '#F44336', icon: 'Heart' },
  { name: 'Ocio', color: '#9C27B0', icon: 'Gamepad2' },
  { name: 'Ropa', color: '#E91E63', icon: 'Shirt' },
  { name: 'Restaurantes', color: '#FF5722', icon: 'UtensilsCrossed' },
  { name: 'Educación', color: '#3F51B5', icon: 'BookOpen' },
  { name: 'Viajes', color: '#00BCD4', icon: 'Plane' },
  { name: 'Tecnología', color: '#607D8B', icon: 'Smartphone' },
  { name: 'Otros gastos', color: '#9E9E9E', icon: 'MoreHorizontal' },
];

const DEFAULT_INCOME_CATEGORIES: Array<{
  name: string;
  color: string;
  icon: string;
}> = [
  { name: 'Salario', color: '#4CAF50', icon: 'Briefcase' },
  { name: 'Freelance', color: '#2196F3', icon: 'Code' },
  { name: 'Inversiones', color: '#FF9800', icon: 'TrendingUp' },
  { name: 'Alquiler', color: '#795548', icon: 'Building' },
  { name: 'Otros ingresos', color: '#9E9E9E', icon: 'Plus' },
];

export async function findByUser(userId: string): Promise<ICategory[]> {
  return CategoryModel.find({
    userId: new mongoose.Types.ObjectId(userId),
    isActive: true,
  })
    .sort({ name: 1 })
    .exec();
}

export async function findById(
  id: string,
  userId: string,
): Promise<ICategory | null> {
  return CategoryModel.findOne({
    _id: new mongoose.Types.ObjectId(id),
    userId: new mongoose.Types.ObjectId(userId),
    isActive: true,
  }).exec();
}

export async function create(data: CreateCategoryDTO): Promise<ICategory> {
  const category = new CategoryModel({
    userId: new mongoose.Types.ObjectId(data.userId),
    name: data.name,
    type: data.type,
    parentId:
      data.parentId !== undefined
        ? new mongoose.Types.ObjectId(data.parentId)
        : undefined,
    color: data.color,
    icon: data.icon,
    isDefault: data.isDefault ?? false,
    isActive: true,
  });
  return category.save();
}

export async function update(
  id: string,
  userId: string,
  data: Partial<UpdateCategoryDTO>,
): Promise<ICategory | null> {
  const updatePayload: Record<string, unknown> = {};

  if (data.name !== undefined) updatePayload['name'] = data.name;
  if (data.type !== undefined) updatePayload['type'] = data.type;
  if (data.color !== undefined) updatePayload['color'] = data.color;
  if (data.icon !== undefined) updatePayload['icon'] = data.icon;
  if (data.parentId !== undefined) {
    updatePayload['parentId'] = new mongoose.Types.ObjectId(data.parentId);
  }

  return CategoryModel.findOneAndUpdate(
    {
      _id: new mongoose.Types.ObjectId(id),
      userId: new mongoose.Types.ObjectId(userId),
      isActive: true,
    },
    { $set: updatePayload },
    { new: true, runValidators: true },
  ).exec();
}

export async function softDelete(
  id: string,
  userId: string,
): Promise<boolean> {
  const result = await CategoryModel.findOneAndUpdate(
    {
      _id: new mongoose.Types.ObjectId(id),
      userId: new mongoose.Types.ObjectId(userId),
      isActive: true,
    },
    { $set: { isActive: false } },
  ).exec();
  return result !== null;
}

export async function seedDefaultCategories(userId: string): Promise<void> {
  const userObjectId = new mongoose.Types.ObjectId(userId);

  const expenseDocs = DEFAULT_EXPENSE_CATEGORIES.map((cat) => ({
    userId: userObjectId,
    name: cat.name,
    type: 'expense' as const,
    color: cat.color,
    icon: cat.icon,
    isDefault: true,
    isActive: true,
  }));

  const incomeDocs = DEFAULT_INCOME_CATEGORIES.map((cat) => ({
    userId: userObjectId,
    name: cat.name,
    type: 'income' as const,
    color: cat.color,
    icon: cat.icon,
    isDefault: true,
    isActive: true,
  }));

  await CategoryModel.insertMany([...expenseDocs, ...incomeDocs]);
}
