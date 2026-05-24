import { TransactionType } from '../generated/prisma/client';

type SplitLike = {
  categoryId: string;
  category: { id: string; name: string; color: string; type?: TransactionType };
  subCategoryId: string | null;
  subCategory: { id: string; name: string } | null;
  amount: { toString(): string } | number;
};

type TransactionLike = {
  amount: { toString(): string } | number;
  categoryId: string | null;
  category: {
    id: string;
    name: string;
    color: string;
  } | null;
  subCategoryId: string | null;
  subCategory: { id: string; name: string } | null;
  splits?: SplitLike[];
};

export type CategoryAllocation = {
  categoryId: string;
  category: NonNullable<TransactionLike['category']>;
  subCategoryId: string | null;
  subCategory: TransactionLike['subCategory'];
  amount: number;
};

export function getCategoryAllocations(
  transaction: TransactionLike,
): CategoryAllocation[] {
  if (transaction.splits && transaction.splits.length > 0) {
    return transaction.splits.map((split) => ({
      categoryId: split.categoryId,
      category: split.category,
      subCategoryId: split.subCategoryId,
      subCategory: split.subCategory,
      amount: Number(split.amount),
    }));
  }

  if (transaction.category && transaction.categoryId) {
    return [
      {
        categoryId: transaction.categoryId,
        category: transaction.category,
        subCategoryId: transaction.subCategoryId,
        subCategory: transaction.subCategory,
        amount: Number(transaction.amount),
      },
    ];
  }

  return [];
}

export function getRentalIncomeAmount(
  transaction: TransactionLike,
  rentalCategoryId: string,
): number {
  if (transaction.splits && transaction.splits.length > 0) {
    return transaction.splits
      .filter((split) => split.categoryId === rentalCategoryId)
      .reduce((sum, split) => sum + Number(split.amount), 0);
  }

  if (transaction.categoryId === rentalCategoryId) {
    return Number(transaction.amount);
  }

  return 0;
}
