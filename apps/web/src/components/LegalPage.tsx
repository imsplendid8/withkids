import React from 'react';
import Link from 'next/link';
import { MainLayout } from '@/components/layouts/MainLayout';

/** 약관·방침 공통 틀. 법률 검토 전까지 초안이라고 분명히 보여 준다 */
export function LegalPage({
  title,
  effective,
  children,
}: {
  title: string;
  effective: string;
  children: React.ReactNode;
}) {
  return (
    <MainLayout>
      <article className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        <p className="text-sm text-gray-500 mt-1">시행일 {effective}</p>
        <p className="mt-4 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
          법률 검토 전 초안이에요. 내용이 바뀌면 이 페이지와 시행일을 고쳐 알려 드려요.
        </p>
        <div className="legal mt-6 space-y-6 text-[15px] leading-7 text-gray-800">{children}</div>
        <p className="mt-10 text-sm text-gray-500">
          <Link href="/terms" className="underline">
            이용약관
          </Link>{' '}
          ·{' '}
          <Link href="/privacy" className="underline">
            개인정보처리방침
          </Link>
        </p>
      </article>
    </MainLayout>
  );
}

export function LegalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-bold text-gray-900 mb-2">{title}</h2>
      {children}
    </section>
  );
}
