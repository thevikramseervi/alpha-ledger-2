import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateCategoryDto,
  UpdateCategoryDto,
} from './dto/category.dto';
import {
  CreateSubCategoryDto,
  UpdateSubCategoryDto,
} from './dto/sub-category.dto';
import { TransactionType } from '../generated/prisma/client';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateCategoryDto) {
    return this.prisma.category.create({
      data: {
        name: dto.name,
        type: dto.type,
        color: dto.color ?? this.defaultColor(dto.type),
        icon: dto.icon,
      },
    });
  }

  findAll(type?: TransactionType) {
    return this.prisma.category.findMany({
      where: type ? { type } : undefined,
      include: {
        subCategories: {
          orderBy: { name: 'asc' },
        },
      },
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    });
  }

  async findOne(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        subCategories: {
          orderBy: { name: 'asc' },
        },
      },
    });

    if (!category) {
      throw new NotFoundException(`Category ${id} not found`);
    }

    return category;
  }

  async update(id: string, dto: UpdateCategoryDto) {
    await this.findOne(id);

    return this.prisma.category.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.category.delete({ where: { id } });
    return { deleted: true };
  }

  async createSubCategory(categoryId: string, dto: CreateSubCategoryDto) {
    await this.findOne(categoryId);

    try {
      return await this.prisma.subCategory.create({
        data: {
          name: dto.name,
          categoryId,
        },
      });
    } catch {
      throw new ConflictException(
        `Sub-category "${dto.name}" already exists for this category`,
      );
    }
  }

  async updateSubCategory(
    categoryId: string,
    subCategoryId: string,
    dto: UpdateSubCategoryDto,
  ) {
    await this.ensureSubCategoryBelongsToCategory(categoryId, subCategoryId);

    try {
      return await this.prisma.subCategory.update({
        where: { id: subCategoryId },
        data: dto,
      });
    } catch {
      throw new ConflictException(
        `Sub-category "${dto.name}" already exists for this category`,
      );
    }
  }

  async removeSubCategory(categoryId: string, subCategoryId: string) {
    await this.ensureSubCategoryBelongsToCategory(categoryId, subCategoryId);
    await this.prisma.subCategory.delete({ where: { id: subCategoryId } });
    return { deleted: true };
  }

  private async ensureSubCategoryBelongsToCategory(
    categoryId: string,
    subCategoryId: string,
  ) {
    const subCategory = await this.prisma.subCategory.findUnique({
      where: { id: subCategoryId },
    });

    if (!subCategory || subCategory.categoryId !== categoryId) {
      throw new NotFoundException(
        `Sub-category ${subCategoryId} not found for category ${categoryId}`,
      );
    }

    return subCategory;
  }

  private defaultColor(type: TransactionType) {
    switch (type) {
      case TransactionType.INCOME:
        return '#10b981';
      case TransactionType.EXPENSE:
        return '#f43f5e';
      case TransactionType.INVESTMENT:
        return '#6366f1';
    }
  }
}
