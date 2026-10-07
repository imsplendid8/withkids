import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Brackets } from 'typeorm';
import { Experience } from './entities/experience.entity';
import { ExperienceRun } from '../experience-runs/experience-runs.entity';
import { CreateExperienceDto } from './dto/create-experience.dto';

interface SearchOptions {
  search?: string;
  ageGroup?: string;
  priceMin?: number;
  priceMax?: number;
  category?: string;
  sort?: 'recent' | 'price-low' | 'price-high' | 'name';
  limit?: number;
  offset?: number;
}

@Injectable()
export class ExperiencesService {
  constructor(
    @InjectRepository(Experience)
    private experiencesRepository: Repository<Experience>,
    @InjectRepository(ExperienceRun)
    private experienceRunsRepository: Repository<ExperienceRun>,
  ) {}

  /**
   * 지금 접수 중이거나 앞으로 `days`일 안에 접수가 시작되는 회차.
   * 선착순 프로그램은 접수 시작 시각을 놓치면 끝이라 대시보드에 띄운다.
   */
  async getBookingSchedule(days: number): Promise<ExperienceRun[]> {
    const now = new Date();
    const until = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    return await this.experienceRunsRepository
      .createQueryBuilder('run')
      .innerJoinAndSelect('run.experience', 'experience')
      .innerJoinAndSelect('experience.institution', 'institution')
      .where('experience.isActive = :active', { active: true })
      .andWhere(
        new Brackets((qb) =>
          qb
            .where('run.bookingOpenAt BETWEEN :now AND :until', { now, until })
            .orWhere('run.bookingOpenAt <= :now AND run.bookingCloseAt >= :now', { now }),
        ),
      )
      .orderBy('run.bookingOpenAt', 'ASC')
      .take(20)
      .getMany();
  }

  async create(createExperienceDto: CreateExperienceDto): Promise<Experience> {
    const experience = this.experiencesRepository.create(createExperienceDto);
    return await this.experiencesRepository.save(experience);
  }

  async findAll(): Promise<Experience[]> {
    return await this.experiencesRepository.find({
      where: { isActive: true },
      relations: ['institution'],
    });
  }

  async search(options: SearchOptions): Promise<{ data: Experience[]; total: number }> {
    const {
      search,
      ageGroup,
      priceMin,
      priceMax,
      category,
      sort = 'recent',
      limit = 10,
      offset = 0,
    } = options;

    const query = this.experiencesRepository.createQueryBuilder('exp')
      .innerJoinAndSelect('exp.institution', 'institution')
      .where('exp.isActive = :isActive', { isActive: true });

    // Search by name or institution
    if (search) {
      query.andWhere(
        '(exp.programName ILIKE :search OR institution.institutionName ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    // Filter by age group
    if (ageGroup) {
      const [minAge, maxAge] = ageGroup.split('-').map(Number);
      query.andWhere(
        '(exp.targetAgeMin <= :maxAge AND exp.targetAgeMax >= :minAge)',
        { minAge, maxAge }
      );
    }

    // Filter by price range
    if (priceMin !== undefined || priceMax !== undefined) {
      // Note: Experience entity doesn't have price, so this would need to be added
      // For now, we'll skip price filtering
    }

    // Filter by category
    if (category) {
      query.andWhere('exp.experienceCategory = :category', { category });
    }

    // Sorting
    switch (sort) {
      case 'price-low':
      case 'price-high':
        // Would need price field in Experience entity
        break;
      case 'name':
        query.orderBy('exp.programName', 'ASC');
        break;
      case 'recent':
      default:
        query.orderBy('exp.createdAt', 'DESC');
        break;
    }

    const [data, total] = await query
      .take(limit)
      .skip(offset)
      .getManyAndCount();

    return { data, total };
  }

  async findOne(id: string): Promise<Experience | null> {
    return await this.experiencesRepository.findOne({
      where: { id },
      relations: ['institution', 'reviews'],
    });
  }

  async update(id: string, data: Partial<Experience>): Promise<Experience> {
    await this.experiencesRepository.update(id, data);
    return (await this.experiencesRepository.findOneBy({ id }))!;
  }

  async remove(id: string): Promise<void> {
    await this.experiencesRepository.update(id, { isActive: false });
  }
}
