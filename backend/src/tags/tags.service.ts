import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTagDto, UpdateTagDto } from './dto/tag.dto';

@Injectable()
export class TagsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.tag.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const tag = await this.prisma.tag.findUnique({ where: { id } });
    if (!tag) {
      throw new NotFoundException(`Tag ${id} not found`);
    }
    return tag;
  }

  create(dto: CreateTagDto) {
    return this.prisma.tag.create({
      data: {
        name: dto.name.trim(),
        color: dto.color ?? '#6366f1',
      },
    });
  }

  async update(id: string, dto: UpdateTagDto) {
    await this.findOne(id);
    return this.prisma.tag.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.color !== undefined ? { color: dto.color } : {}),
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.tag.delete({ where: { id } });
    return { deleted: true };
  }

  async ensureTagIdsExist(tagIds: string[]) {
    const uniqueIds = [...new Set(tagIds)];
    if (uniqueIds.length === 0) {
      return uniqueIds;
    }

    const count = await this.prisma.tag.count({
      where: { id: { in: uniqueIds } },
    });

    if (count !== uniqueIds.length) {
      throw new BadRequestException('One or more tags were not found');
    }

    return uniqueIds;
  }
}
