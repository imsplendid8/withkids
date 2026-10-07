import axios, { AxiosInstance } from 'axios';
import { STATIC_MODE } from './staticMode';
import { LocalApiClient } from './localApi';

export interface LatestCrawl {
  adapterName: string;
  lastCrawl: {
    id: string;
    status: 'RUNNING' | 'SUCCESS' | 'PARTIAL_FAILURE' | 'FAILURE';
    crawlStartedAt: string;
    crawlCompletedAt: string | null;
    programsFound: number;
    programsCreated: number;
    programsUpdated: number;
    errorMessage: string | null;
  } | null;
}

// 같은 오리진의 /api 로 보내면 next.config.js의 rewrite가 API 서버로 넘긴다.
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.client.interceptors.request.use((config) => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      },
    );
  }

  // Auth endpoints
  /** 계정이 하나도 없어 첫 계정을 만들어야 하는지 */
  async getSetupStatus(): Promise<{ needsSetup: boolean }> {
    const response = await this.client.get('/auth/setup-status');
    return response.data;
  }

  async register(email: string, password: string, profileName?: string) {
    const response = await this.client.post('/auth/register', {
      email,
      password,
      profileName,
    });
    return response.data;
  }

  async login(email: string, password: string) {
    const response = await this.client.post('/auth/login', {
      email,
      password,
    });
    return response.data;
  }

  async refreshToken(refreshToken: string) {
    const response = await this.client.post('/auth/refresh', {
      refreshToken,
    });
    return response.data;
  }

  /** 이름·자녀 나이까지 포함한 로그인 사용자 정보 */
  async getMe() {
    const response = await this.client.get('/users/me');
    return response.data;
  }

  async getCurrentUser() {
    const response = await this.client.get('/auth/me');
    return response.data;
  }

  async updatePassword(oldPassword: string, newPassword: string) {
    const response = await this.client.patch('/auth/password', {
      oldPassword,
      newPassword,
    });
    return response.data;
  }

  // User endpoints
  async updateProfile(profileName: string, childrenAges: number[]) {
    const response = await this.client.patch('/users/profile', {
      profileName,
      childrenAges,
    });
    return response.data;
  }

  async getPreferences() {
    const response = await this.client.get('/users/preferences');
    return response.data;
  }

  async updatePreferences(preferences: Record<string, unknown>) {
    const response = await this.client.patch('/users/preferences', preferences);
    return response.data;
  }

  async addBookmark(experienceId: string, bookmarkType: string) {
    const response = await this.client.post('/users/bookmarks', {
      experienceId,
      bookmarkType,
    });
    return response.data;
  }

  async removeBookmark(experienceId: string) {
    const response = await this.client.delete(`/users/bookmarks/${experienceId}`);
    return response.data;
  }

  // Experience endpoints
  async getExperiences(params?: Record<string, unknown>) {
    const response = await this.client.get('/experiences', { params });
    return response.data;
  }

  async searchExperiences(params: Record<string, unknown>) {
    const response = await this.client.get('/experiences/search', { params });
    return response.data;
  }

  async getBookingSchedule(days = 14) {
    const response = await this.client.get('/experiences/booking-schedule', { params: { days } });
    return response.data;
  }

  async getExperienceById(id: string) {
    const response = await this.client.get(`/experiences/${id}`);
    return response.data;
  }

  // Booking endpoints
  async createBooking(data: {
    experienceId: string;
    experienceDate: string;
    selectedChildren: Array<{ id: string; name: string; age: number }>;
    specialRequests?: string;
    totalPrice?: number;
  }) {
    const response = await this.client.post('/bookings', data);
    return response.data;
  }

  async getBookings() {
    const response = await this.client.get('/bookings');
    return response.data;
  }

  async getBookingById(id: string) {
    const response = await this.client.get(`/bookings/${id}`);
    return response.data;
  }

  async searchBookings(params: {
    keyword?: string;
    dateFrom?: string;
    dateTo?: string;
    status?: string;
    sort?: 'newest' | 'oldest' | 'price_low' | 'price_high';
  }) {
    const response = await this.client.get('/bookings/search', { params });
    return response.data;
  }

  async updateBooking(id: string, data: Record<string, unknown>) {
    const response = await this.client.patch(`/bookings/${id}`, data);
    return response.data;
  }

  async cancelBooking(id: string) {
    const response = await this.client.delete(`/bookings/${id}`);
    return response.data;
  }

  // Review endpoints
  async createReview(data: {
    bookingId: string;
    rating: number;
    reviewText: string;
  }) {
    const response = await this.client.post('/reviews', data);
    return response.data;
  }

  async getReviewsByExperience(experienceId: string, limit = 10, offset = 0) {
    const response = await this.client.get(`/reviews/experience/${experienceId}`, {
      params: { limit, offset },
    });
    return response.data;
  }

  async getReviewByBooking(bookingId: string) {
    const response = await this.client.get(`/reviews/booking/${bookingId}`);
    return response.data;
  }

  async getUserReviews(limit = 20, offset = 0) {
    const response = await this.client.get('/reviews/user/my-reviews', {
      params: { limit, offset },
    });
    return response.data;
  }

  async markReviewAsHelpful(reviewId: string) {
    const response = await this.client.put(`/reviews/${reviewId}/helpful`);
    return response.data;
  }

  async getExperienceRating(experienceId: string) {
    const response = await this.client.get(`/reviews/experience/${experienceId}/rating`);
    return response.data;
  }

  // Notifications endpoints
  async getNotifications(params?: Record<string, unknown>) {
    const response = await this.client.get('/notifications', { params });
    return response.data;
  }

  async markNotificationAsRead(id: string) {
    const response = await this.client.patch(`/notifications/${id}/read`);
    return response.data;
  }

  async markAllNotificationsAsRead() {
    const response = await this.client.patch('/notifications/read-all');
    return response.data;
  }

  // Jobs endpoints
  async getCrawlerStats() {
    const response = await this.client.get('/jobs/crawler/stats');
    return response.data;
  }

  async getNotificationDeliveryStats() {
    const response = await this.client.get('/jobs/notification-delivery/stats');
    return response.data;
  }

  /** 켜져 있는 수집원별 마지막 수집 결과 */
  async getLatestCrawls(): Promise<LatestCrawl[]> {
    const response = await this.client.get('/crawler-monitoring/latest');
    return response.data;
  }

  async triggerCrawler() {
    const response = await this.client.post('/jobs/crawler/trigger');
    return response.data;
  }

  async triggerNotificationDelivery() {
    const response = await this.client.post('/jobs/notification-delivery/trigger');
    return response.data;
  }
}

/** 서버 ApiClient의 공개 메서드 전부. 정적 모드 클라이언트도 이것을 빠짐없이 구현해야 한다. */
export type ApiClientContract = { [K in keyof ApiClient]: ApiClient[K] };

export const apiClient: ApiClientContract = STATIC_MODE ? new LocalApiClient() : new ApiClient();
