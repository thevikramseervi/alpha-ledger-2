import { PrismaPg } from '@prisma/adapter-pg';
import { AccountType, PrismaClient, TransactionType } from '../src/generated/prisma/client';

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL as string,
  }),
});

const categories = [
  { name: 'Salary', type: TransactionType.INCOME, color: '#10b981', icon: 'wallet' },
  { name: 'Freelance', type: TransactionType.INCOME, color: '#14b8a6', icon: 'briefcase' },
  { name: 'Investments Return', type: TransactionType.INCOME, color: '#06b6d4', icon: 'trending-up' },
  { name: 'Rental Income', type: TransactionType.INCOME, color: '#059669', icon: 'building' },
  { name: 'Other Income', type: TransactionType.INCOME, color: '#22c55e', icon: 'plus-circle' },
  { name: 'Rent', type: TransactionType.EXPENSE, color: '#f43f5e', icon: 'home' },
  { name: 'Groceries', type: TransactionType.EXPENSE, color: '#fb7185', icon: 'shopping-cart' },
  { name: 'Transport', type: TransactionType.EXPENSE, color: '#f97316', icon: 'car' },
  { name: 'Utilities', type: TransactionType.EXPENSE, color: '#eab308', icon: 'zap' },
  { name: 'Entertainment', type: TransactionType.EXPENSE, color: '#a855f7', icon: 'film' },
  { name: 'Healthcare', type: TransactionType.EXPENSE, color: '#ec4899', icon: 'heart-pulse' },
  { name: 'Stocks', type: TransactionType.INVESTMENT, color: '#6366f1', icon: 'line-chart' },
  { name: 'Mutual Funds', type: TransactionType.INVESTMENT, color: '#8b5cf6', icon: 'pie-chart' },
  { name: 'Crypto', type: TransactionType.INVESTMENT, color: '#3b82f6', icon: 'bitcoin' },
  { name: 'Real Estate', type: TransactionType.INVESTMENT, color: '#0ea5e9', icon: 'building' },
];

const subCategoriesByCategory: Record<string, string[]> = {
  Salary: ['Base Pay', 'Bonus', 'Reimbursements'],
  Freelance: ['Design', 'Consulting', 'Development'],
  'Investments Return': ['Dividends', 'Interest', 'Capital Gains'],
  Groceries: ['Fruits & Vegetables', 'Dairy', 'Snacks', 'Household'],
  Transport: ['Fuel', 'Metro', 'Cab', 'Maintenance'],
  Utilities: ['Electricity', 'Water', 'Internet', 'Mobile'],
  Entertainment: ['Dining Out', 'Streaming', 'Movies', 'Events'],
  Healthcare: ['Medicines', 'Consultation', 'Insurance'],
  Stocks: ['Equity', 'ETF', 'Dividends'],
  'Mutual Funds': ['SIP', 'Lump Sum', 'ELSS'],
  Crypto: ['Bitcoin', 'Ethereum', 'Altcoins'],
  'Real Estate': ['Residential', 'Commercial', 'REIT'],
};

async function main() {
  console.log('Seeding database...');

  const defaultAccounts = [
    { name: 'Cash', type: AccountType.CASH, color: '#10b981' },
    { name: 'Kotak Savings Account', type: AccountType.BANK, color: '#3b82f6' },
    { name: 'HDFC Savings Account', type: AccountType.BANK, color: '#8b5cf6' },
    { name: 'Zerodha', type: AccountType.OTHER, color: '#f59e0b' },
  ];

  for (const account of defaultAccounts) {
    await prisma.account.upsert({
      where: { name: account.name },
      update: { type: account.type, color: account.color },
      create: account,
    });
  }

  for (const category of categories) {
    await prisma.category.upsert({
      where: {
        name_type: {
          name: category.name,
          type: category.type,
        },
      },
      update: {
        color: category.color,
        icon: category.icon,
      },
      create: category,
    });
  }

  const allCategories = await prisma.category.findMany();
  const categoryIdsByName = Object.fromEntries(
    allCategories.map((category) => [category.name, category.id]),
  );

  for (const [categoryName, subCategoryNames] of Object.entries(
    subCategoriesByCategory,
  )) {
    const categoryId = categoryIdsByName[categoryName];
    if (!categoryId) continue;

    for (const name of subCategoryNames) {
      await prisma.subCategory.upsert({
        where: {
          name_categoryId: {
            name,
            categoryId,
          },
        },
        update: {},
        create: {
          name,
          categoryId,
        },
      });
    }
  }

  console.log('Seeding complete.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
