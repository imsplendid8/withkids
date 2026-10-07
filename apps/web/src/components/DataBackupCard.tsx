import React, { useRef, useState } from 'react';
import { FiDownload, FiUpload } from 'react-icons/fi';
import { exportLocalData, importLocalData } from '@/lib/localApi';
import { toLocalYmd } from '@/lib/bookingDates';

/**
 * 정적 배포에서는 예약이 이 브라우저에만 저장된다.
 * 브라우저 데이터를 지우거나 기기를 바꿀 때를 대비해 파일로 옮길 수 있게 한다.
 */
export function DataBackupCard() {
  const fileInput = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(exportLocalData(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `withdkis-backup-${toLocalYmd(new Date())}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setMessage({ type: 'success', text: '백업 파일을 저장했습니다.' });
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!window.confirm('지금 이 브라우저에 있는 예약·후기가 백업 파일 내용으로 바뀝니다. 계속할까요?')) return;

    try {
      const { bookings } = importLocalData(JSON.parse(await file.text()));
      setMessage({ type: 'success', text: `예약 ${bookings}건을 불러왔습니다. 화면을 새로고침합니다.` });
      setTimeout(() => window.location.reload(), 1200);
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof SyntaxError ? '파일을 읽을 수 없습니다.' : (error as Error).message,
      });
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-4">
      <div>
        <h2 className="text-lg font-bold text-gray-900">내 데이터 백업</h2>
        <p className="text-sm text-gray-600 mt-1">
          예약·후기·찜은 이 브라우저에만 저장됩니다. 휴대폰과 PC는 서로 공유되지 않아요. 브라우저 기록을
          지우기 전이나 다른 기기로 옮길 때 백업 파일을 만들어 두세요.
        </p>
      </div>

      {message && (
        <p className={`text-sm ${message.type === 'success' ? 'text-green-700' : 'text-red-600'}`}>
          {message.text}
        </p>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          onClick={handleExport}
          className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <FiDownload size={18} />
          백업 파일 저장
        </button>
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50"
        >
          <FiUpload size={18} />
          백업 파일 불러오기
        </button>
        <input ref={fileInput} type="file" accept="application/json,.json" onChange={handleImport} hidden />
      </div>
    </div>
  );
}
