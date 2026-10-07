import React, { useState, useCallback } from 'react';
import { Calendar, dayjsLocalizer, View, SlotInfo } from 'react-big-calendar';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { apiClient } from '@/lib/api';
import { parseYmd, toLocalYmd } from '@/lib/bookingDates';
import { FiX } from 'react-icons/fi';
import utc from 'dayjs/plugin/utc';
import dayjs from 'dayjs';

dayjs.extend(utc);

const localizer = dayjsLocalizer(dayjs);

interface Booking {
  id: string;
  confirmationNumber: string;
  experienceId: string;
  experienceDate: string;
  experience?: {
    programName: string;
    institution?: { institutionName: string };
  };
  status: string;
}

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  bookingId: string;
  programName: string;
  institutionName: string;
}

interface BookingCalendarProps {
  bookings: Booking[];
  onBookingUpdate?: (bookingId: string) => void;
}

export function BookingCalendar({ bookings, onBookingUpdate }: BookingCalendarProps) {
  const [view, setView] = useState<View>('month');
  const [date, setDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const events: CalendarEvent[] = bookings.map((booking) => {
    const experienceDate = parseYmd(booking.experienceDate);
    return {
      id: booking.id,
      title: booking.experience?.programName || '프로그램',
      start: experienceDate,
      end: new Date(experienceDate.getTime() + 2 * 60 * 60 * 1000),
      bookingId: booking.id,
      programName: booking.experience?.programName || '프로그램',
      institutionName: booking.experience?.institution?.institutionName || '-',
    };
  });

  const handleSelectEvent = (event: CalendarEvent) => {
    setSelectedEvent(event);
  };

  const handleSelectSlot = useCallback(
    (slotInfo: SlotInfo) => {
      if (!selectedEvent) return;

      const newDate = slotInfo.start;
      handleReschedule(selectedEvent.bookingId, newDate);
    },
    [selectedEvent]
  );

  const handleReschedule = async (bookingId: string, newDate: Date) => {
    try {
      setIsUpdating(true);
      setError(null);

      const formattedDate = toLocalYmd(newDate);

      await apiClient.updateBooking(bookingId, {
        experienceDate: formattedDate,
      });

      if (onBookingUpdate) {
        onBookingUpdate(bookingId);
      }

      setSelectedEvent(null);
    } catch (err) {
      console.error('예약 일정 변경 실패:', err);
      setError('예약 일정을 변경할 수 없습니다. 다시 시도해주세요.');
    } finally {
      setIsUpdating(false);
    }
  };

  const eventStyleGetter = (event: CalendarEvent) => {
    let backgroundColor = '#3b82f6';

    if (event.id.includes('pending')) {
      backgroundColor = '#fbbf24';
    } else if (event.id.includes('completed')) {
      backgroundColor = '#10b981';
    } else if (event.id.includes('cancelled')) {
      backgroundColor = '#ef4444';
    }

    return {
      style: {
        backgroundColor,
        borderRadius: '5px',
        opacity: 0.8,
        color: 'white',
        border: selectedEvent?.id === event.id ? '3px solid white' : 'none',
        display: 'block',
        cursor: 'pointer',
      },
    };
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-4">
        <div style={{ height: '600px' }}>
          <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            style={{ height: '100%' }}
            view={view}
            onView={setView}
            date={date}
            onNavigate={setDate}
            onSelectEvent={handleSelectEvent}
            onSelectSlot={handleSelectSlot}
            selectable
            popup
            eventPropGetter={eventStyleGetter}
            messages={{
              today: '오늘',
              previous: '이전',
              next: '다음',
              month: '월',
              week: '주',
              day: '일',
              agenda: '일정',
              date: '날짜',
              time: '시간',
              event: '예약',
              allDay: '종일',
              work_week: '업무주',
              yesterday: '어제',
              tomorrow: '내일',
              noEventsInRange: '이 기간에 예약된 프로그램이 없습니다.',
              showMore: (total: number) => `+${total}개 더보기`,
            }}
          />
        </div>

        <div className="mt-4 pt-4 border-t border-gray-200 text-sm text-gray-600">
          <p>💡 팁: 날짜를 클릭하여 예약을 새로운 날짜로 이동할 수 있습니다.</p>
        </div>
      </div>

      {selectedEvent && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="font-bold text-gray-900">{selectedEvent.programName}</h3>
              <p className="text-sm text-gray-600">{selectedEvent.institutionName}</p>
              <p className="text-sm text-gray-600 mt-2">
                현재 날짜: {selectedEvent.start.toLocaleDateString('ko-KR')}
              </p>
            </div>
            <button
              onClick={() => setSelectedEvent(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              <FiX size={20} />
            </button>
          </div>

          <p className="text-sm text-gray-600 mb-4">
            새로운 날짜를 선택하여 예약을 변경하세요.
          </p>

          {isUpdating && (
            <div className="text-sm text-blue-600">변경 중입니다...</div>
          )}
        </div>
      )}
    </div>
  );
}
