# Feature 1: Calendar View Implementation Guide
## Personal Kids Experience Booking Tracker

### 📅 Overview

Calendar View provides a visual way to manage booking dates. Users can:
- View all bookings in calendar format (month, week, day, agenda views)
- Click on calendar dates to reschedule bookings
- See booking titles and institution names at a glance
- Toggle between list and calendar views

**Status**: ✅ Implemented and Ready for Testing  
**Branch**: `claude/kids-experience-booking-tracker-pfuuqs`  
**Commit**: `db8f981`

---

### 🎯 Features Implemented

#### 1. **Calendar Component** (`BookingCalendar.tsx`)
- React Big Calendar integration with dayjs localizer
- Converts bookings to calendar events with proper date/time
- Displays event titles (program name) and institution
- Color-coded events based on booking status
- Responsive calendar with 600px height

#### 2. **Rescheduling Functionality**
- Click event to select for rescheduling
- Click calendar slot to set new date
- PATCH API endpoint: `PATCH /api/bookings/:id` with `experienceDate`
- Real-time updates reflected in calendar
- Error handling with user-friendly messages

#### 3. **View Toggle**
- "목록" (List) button - Shows traditional list view
- "캘린더" (Calendar) button - Shows calendar view
- Toggle buttons in page header
- Stats section hidden in calendar view (relevant to list only)

#### 4. **API Integration**
- New method: `apiClient.updateBooking(id, data)`
- Handles PATCH requests to update booking dates
- Automatic token injection for authentication
- Error handling and response parsing

#### 5. **Korean Localization**
- Calendar messages in Korean
- Day/month/week labels in Korean
- Status badges in Korean
- "Tips" for users in Korean

---

### 🛠️ Technical Details

#### Dependencies Added
```bash
npm install react-big-calendar date-fns
npm install --save-dev @types/react-big-calendar
```

#### File Structure
```
apps/web/src/components/BookingCalendar.tsx (NEW - 188 lines)
apps/web/src/pages/bookings.tsx (MODIFIED - added calendar view)
apps/web/src/lib/api.ts (MODIFIED - added updateBooking method)
apps/api/src/modules/bookings/bookings.controller.ts (MODIFIED - added PATCH endpoint)
```

#### Event Data Structure
```typescript
interface CalendarEvent {
  id: string;
  title: string;              // Program name
  start: Date;                // Experience date
  end: Date;                  // 2 hours after start (placeholder)
  bookingId: string;          // Link back to booking
  programName: string;        // Full program name
  institutionName: string;    // Institution name
}
```

---

### 🧪 Testing Guide

#### Local Testing Setup
```bash
# Terminal 1: Start database services
docker compose up -d postgres redis

# Terminal 2: Start API
cd apps/api
npm run dev

# Terminal 3: Start frontend
cd apps/web
npm run dev

# Open browser: http://localhost:3000
```

#### Test Scenarios

**Scenario 1: View Calendar**
1. Navigate to `/bookings` page
2. Click "캘린더" (Calendar) button
3. Verify calendar loads with month view
4. See existing bookings as events

**Scenario 2: Toggle Views**
1. Click "목록" (List) to see list view
2. Verify stats cards reappear
3. Click "캘린더" to return to calendar view

**Scenario 3: Reschedule Booking**
1. In calendar view, click on a booking event
2. Blue info box appears showing booking details
3. Click on a different date in the calendar
4. Confirm "변경 중입니다..." (Updating...) message
5. Verify booking moves to new date
6. Check API logs for PATCH request success

**Scenario 4: Error Handling**
1. Trigger offline mode (DevTools)
2. Try to reschedule a booking
3. Verify error message: "예약 일정을 변경할 수 없습니다"
4. Restore connection and retry

**Scenario 5: Calendar Navigation**
1. Use previous/next buttons to navigate months
2. Click on month/week/day buttons to change view
3. Verify events render correctly in all views
4. Test "agenda" view for list-like display

---

### 📊 Calendar Views

| View | Best For | Features |
|------|----------|----------|
| **Month** | Overview | See entire month at once |
| **Week** | Planning | 7 consecutive days in detail |
| **Day** | Focus | Single day with hourly slots |
| **Agenda** | List-like | Text list of events |

---

### 🔌 API Endpoints

#### Get Bookings
```bash
GET /api/bookings
Authorization: Bearer <token>

Response:
[
  {
    "id": "uuid",
    "experienceDate": "2026-10-15",
    "experience": {
      "programName": "과학 워크숍",
      "institution": {
        "institutionName": "DKIS 과학관"
      }
    },
    ...
  }
]
```

#### Update Booking Date
```bash
PATCH /api/bookings/:id
Authorization: Bearer <token>
Content-Type: application/json

Request:
{
  "experienceDate": "2026-10-20"
}

Response:
{
  "id": "uuid",
  "experienceDate": "2026-10-20",
  ...
}
```

---

### 💡 User Tips

**For Drag-and-Drop (Planned Enhancement)**
- Currently requires selecting event then clicking date
- Future: Implement full drag-and-drop for D&D booking movement
- Requires `react-beautiful-dnd` integration

**For Mobile**
- Calendar is responsive but works best on desktop
- Can view in mobile mode but tight spacing
- List view recommended for mobile devices

**For Performance**
- Large number of bookings (100+) may slow calendar rendering
- Consider pagination or filtering by date range
- Implement virtual scrolling for future enhancement

---

### 🚀 Next Steps

#### Immediate (Phase 2)
- [ ] Test calendar with real booking data
- [ ] Verify PATCH endpoint handles all cases
- [ ] Test error scenarios thoroughly
- [ ] Performance test with 50+ bookings

#### Future Enhancements
- [ ] Implement drag-and-drop rescheduling
- [ ] Add recurring event support
- [ ] Color code by category (WORKSHOP, EXHIBITION, etc.)
- [ ] Show time slots in day view
- [ ] Add event tooltip on hover
- [ ] Export calendar to iCal format
- [ ] Mobile-optimized calendar view

#### Feature 2: Search & Filtering (Next in Queue)
Estimated timeline: 3-5 days

---

### 📝 Testing Checklist

- [ ] Calendar renders without errors
- [ ] Events display with correct titles
- [ ] Month/week/day view switching works
- [ ] Navigation buttons work (previous/next)
- [ ] Selecting event shows info box
- [ ] Clicking date reschedules booking
- [ ] Success message appears after update
- [ ] Calendar reflects changes immediately
- [ ] Error handling displays properly
- [ ] Korean text displays correctly
- [ ] Responsive on different screen sizes
- [ ] Stats hidden in calendar view
- [ ] List view still works with toggle

---

### 🐛 Troubleshooting

**Calendar not loading**
- Check browser console for errors
- Verify react-big-calendar is installed: `npm list react-big-calendar`
- Ensure bookings are being fetched from API

**Events not showing**
- Verify booking data includes `experienceDate` field
- Check API response in Network tab
- Ensure dates are valid ISO format

**Rescheduling fails silently**
- Check browser console for error messages
- Verify API endpoint exists: `PATCH /api/bookings/:id`
- Confirm Bearer token is valid

**Dates wrong in calendar**
- Check timezone configuration (using UTC with dayjs)
- Verify database stores dates in ISO format
- Test with simple date like "2026-01-15"

---

### 📚 Resources

- [React Big Calendar Documentation](https://jquense.github.io/react-big-calendar/)
- [dayjs Documentation](https://day.js.org/)
- [date-fns Documentation](https://date-fns.org/)

---

**Implementation Date**: 2026-09-17  
**Estimated Hours**: 4-6 hours  
**Status**: ✅ Ready for Testing  
**Next Feature**: Feature 2 - Search & Filtering

