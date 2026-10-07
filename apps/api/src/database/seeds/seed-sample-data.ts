import { dataSource } from '../data-source';
import { Institution } from '../../modules/institutions/entities/institution.entity';
import { Experience } from '../../modules/experiences/entities/experience.entity';

async function seedData() {
  if (!dataSource.isInitialized) {
    await dataSource.initialize();
  }

  const institutionRepository = dataSource.getRepository(Institution);
  const experienceRepository = dataSource.getRepository(Experience);

  console.log('🌱 Seeding sample data...\n');

  // Create institutions
  const nationalMuseum = await institutionRepository.save({
    institutionName: '국립박물관',
    description: '대한민국의 역사와 문화를 대표하는 박물관',
    websiteUrl: 'https://www.museum.go.kr',
    address: '서울시 종로구 세종로 82',
    institutionType: 'MUSEUM',
  });

  const seoulMilk = await institutionRepository.save({
    institutionName: '서울우유 목장',
    description: '아이들을 위한 낙농 체험',
    websiteUrl: 'https://www.seoul-milk.com',
    address: '경기도 남양주시',
    institutionType: 'FACTORY',
  });

  const scienceCenter = await institutionRepository.save({
    institutionName: '서울 과학관',
    description: '과학 교육과 체험 중심의 관',
    websiteUrl: 'https://www.science.or.kr',
    address: '서울시 영등포구 문제초로 60',
    institutionType: 'SCIENCE_CENTER',
  });

  console.log('✅ Created 3 institutions');

  // Create experiences
  await experienceRepository.save({
    institutionId: nationalMuseum.id,
    programName: '어린이 도슨트 프로그램',
    description: '박물관 유물을 설명하는 어린이 도슨트 프로그램',
    programUrl: 'https://www.museum.go.kr/docent',
    bookingUrl: 'https://booking.museum.go.kr/docent',
    isRecurring: true,
    experienceCategory: 'DOCENT',
    targetAgeMin: 6,
    targetAgeMax: 12,
    requiredGuardian: true,
    bookingMethod: 'FIRST_COME',
  });

  await experienceRepository.save({
    institutionId: seoulMilk.id,
    programName: '낙농 체험 투어',
    description: '우유 생산 과정을 직접 체험하는 프로그램',
    programUrl: 'https://www.seoul-milk.com/tour',
    bookingUrl: 'https://booking.seoul-milk.com/tour',
    isRecurring: true,
    experienceCategory: 'FACTORY_TOUR',
    targetAgeMin: 5,
    targetAgeMax: 10,
    requiredGuardian: true,
    bookingMethod: 'LOTTERY',
    price: 5000,
  });

  await experienceRepository.save({
    institutionId: scienceCenter.id,
    programName: '생명과학 실험실',
    description: '세포와 생명에 대해 배우는 실험 프로그램',
    programUrl: 'https://www.science.or.kr/workshop',
    bookingUrl: 'https://booking.science.or.kr/workshop',
    isRecurring: true,
    experienceCategory: 'WORKSHOP',
    targetAgeMin: 7,
    targetAgeMax: 13,
    requiredGuardian: false,
    bookingMethod: 'FIRST_COME',
    price: 0,
  });

  console.log('✅ Created 3 experience programs');

  console.log('\n✨ Sample data seeding completed!');
  console.log(`
  Created:
  - 3 Institutions
  - 3 Experience Programs

  Next steps:
  1. Start the API: npm run dev:api
  2. Visit http://localhost:3001/api/docs for Swagger documentation
  3. Test the endpoints in the Swagger UI
  `);

  process.exit(0);
}

seedData().catch((error) => {
  console.error('❌ Error seeding data:', error);
  process.exit(1);
});
