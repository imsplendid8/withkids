import React from 'react';
import { LegalPage, LegalSection } from '@/components/LegalPage';

export default function TermsPage() {
  return (
    <LegalPage title="이용약관" effective="2026년 10월 14일">
      <LegalSection title="1. 서비스">
        <p>
          WITHKIDS는 서울시 공공서비스예약, 한국관광공사, 각 기관 누리집 등에 공개된 정보를 모아
          아이와 갈 만한 체험·축제·장소를 보여 주는 무료 서비스예요.
        </p>
      </LegalSection>

      <LegalSection title="2. 이용 대상">
        <p>보호자(만 14세 이상)가 구글 계정으로 로그인해서 써요.</p>
      </LegalSection>

      <LegalSection title="3. 정보의 정확성">
        <p>
          접수 일정, 나이 조건, 요금, 운영 여부는 원래 기관에서 바뀔 수 있어요. 서비스는 매일 정보를
          새로 가져오지만 늦거나 틀릴 수 있으니, <b>예약 전에는 꼭 원래 사이트에서 확인</b>해
          주세요. 예약과 결제는 각 기관·판매처에서 이뤄지고, 서비스는 그 과정에 관여하지 않아요.
        </p>
      </LegalSection>

      <LegalSection title="4. 하지 말아 주세요">
        <ul className="list-disc pl-5 space-y-1">
          <li>다른 사람의 계정을 쓰거나 남의 정보를 입력하는 일</li>
          <li>자동 프로그램으로 서비스나 저장 공간에 무리를 주는 일</li>
          <li>서비스의 정보를 모아 그대로 다시 파는 일</li>
        </ul>
      </LegalSection>

      <LegalSection title="5. 서비스의 변경과 중단">
        <p>
          기능을 바꾸거나 서비스를 멈출 수 있어요. 미리 알릴 수 있으면 화면으로 알려 드리고, 멈추기
          전에 내 데이터를 백업 파일로 받을 수 있게 할게요.
        </p>
      </LegalSection>

      <LegalSection title="6. 책임">
        <p>
          서비스가 보여 준 정보만 믿고 생긴 손해(접수 마감, 휴관 등)에 대해서는, 운영자의 고의나
          중대한 과실이 없는 한 책임지기 어려워요.
        </p>
      </LegalSection>

      <LegalSection title="7. 탈퇴">
        <p>
          더보기 → <b>탈퇴하고 내 데이터 모두 지우기</b>로 언제든 탈퇴할 수 있어요. 자세한 내용은
          개인정보처리방침을 봐 주세요.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
