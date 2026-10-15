import React from 'react';
import { LegalPage, LegalSection } from '@/components/LegalPage';

/**
 * 개인정보처리방침 (초안). 실제로 저장하는 것과 어긋나지 않게 고칠 때는 cloud.ts·children.ts도 함께 본다.
 * - 계정: Firebase Auth (구글 로그인)
 * - 저장: Firestore users/{uid} 문서 하나 (store: withdkis.* 키·찜)
 * - 분석 도구·광고 쿠키 없음
 */
export default function PrivacyPage() {
  return (
    <LegalPage title="개인정보처리방침" effective="2026년 10월 14일">
      <p>
        WITHKIDS(이하 &lsquo;서비스&rsquo;)는 아이와 갈 체험·축제를 찾는 보호자를 위한 서비스예요.
        서비스에 꼭 필요한 정보만 받고, 탈퇴하면 바로 지워요.
      </p>

      <LegalSection title="1. 받는 정보">
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <b>구글 로그인 정보</b>: 이름, 이메일 주소, 구글이 주는 계정 식별값
          </li>
          <li>
            <b>직접 입력한 정보</b>: 아이 이름(별칭으로 적어도 돼요)과 생일, 찜한 프로그램, 예약
            메모·후기, 가 본 곳 표시와 메모, 관심 키워드, 화면 설정
          </li>
        </ul>
        <p className="mt-2">
          위치 정보, 전화번호, 결제 정보는 받지 않아요. 방문 분석 도구나 광고 쿠키도 쓰지 않아요.
        </p>
      </LegalSection>

      <LegalSection title="2. 쓰는 목적">
        <ul className="list-disc pl-5 space-y-1">
          <li>아이 나이에 맞는 프로그램인지 알려 주기 (생일은 만 나이·학년 계산에만 써요)</li>
          <li>찜·예약·가 본 곳을 휴대폰과 PC에서 같이 보이게 하기</li>
          <li>로그인 확인과 부정 이용 막기</li>
        </ul>
      </LegalSection>

      <LegalSection title="3. 보관 기간과 지우기">
        <p>
          탈퇴할 때까지 보관해요. <b>더보기 → 탈퇴하고 내 데이터 모두 지우기</b>를 누르면 계정에
          저장된 정보와 로그인 연결을 바로 지워요. 로그인하지 않고 쓴 정보는 쓰던 브라우저에만 있고,
          브라우저 기록을 지우면 사라져요.
        </p>
      </LegalSection>

      <LegalSection title="4. 맡기는 곳 (처리 위탁)">
        <table className="w-full text-sm border border-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-2 border-b border-gray-200">받는 곳</th>
              <th className="text-left p-2 border-b border-gray-200">맡기는 일</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="p-2 border-b border-gray-100">Google LLC (Firebase)</td>
              <td className="p-2 border-b border-gray-100">로그인, 계정 데이터 저장</td>
            </tr>
            <tr>
              <td className="p-2">GitHub, Inc. (GitHub Pages)</td>
              <td className="p-2">사이트 전송 (접속 기록이 남을 수 있어요)</td>
            </tr>
          </tbody>
        </table>
        <p className="mt-2">
          두 곳 모두 해외(미국 등)에 서버가 있을 수 있어요. 그 밖에 제3자에게 제공하지 않아요.
        </p>
      </LegalSection>

      <LegalSection title="5. 아이 정보">
        <p>
          서비스는 보호자(만 14세 이상)만 가입할 수 있어요. 아이가 직접 가입하지 않고, 보호자가
          아이의 이름과 생일을 입력해요. 이름 대신 &lsquo;첫째&rsquo;처럼 별칭을 써도 모든 기능을 쓸
          수 있어요.
        </p>
      </LegalSection>

      <LegalSection title="6. 내 권리">
        <p>
          언제든 프로필에서 정보를 고치거나, 백업 파일로 받아 보거나, 탈퇴해서 지울 수 있어요. 그
          밖의 요청은 아래 연락처로 보내 주세요.
        </p>
      </LegalSection>

      <LegalSection title="7. 개인정보 보호책임자">
        <p>WITHKIDS 운영자 · 연락처는 정식 공개 전에 적어 둘게요.</p>
      </LegalSection>
    </LegalPage>
  );
}
