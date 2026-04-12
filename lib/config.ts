/**
 * API Configuration
 * Centralized configuration for API endpoints and environment variables
 */

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export const API_ENDPOINTS = {
  // Auth endpoints
  AUTH: {
    REGISTER: '/auth/register/',
    LOGIN: '/auth/login/',
    LOGIN_REQUEST_OTP: '/auth/login/request-otp/',
    LOGIN_VERIFY_OTP: '/auth/login/verify-otp/',
    LOGOUT: '/auth/logout/',
    REFRESH: '/auth/refresh/',
    ME: '/auth/me/',
    MAGIC_LINK_REQUEST: '/auth/magic-link/request/',
    MAGIC_LINK_VERIFY: '/auth/magic-link/verify/',
  },
  ADMIN: {
    LOGIN: '/admin/login/',
    STAFF_CREATE: '/admin/staff/create/',
    STAFF_LIST: '/admin/staff/list/',
    STAFF_UPDATE: '/admin/staff/:staff_id/update/',
    STAFF_DEACTIVATE: '/admin/staff/:staff_id/deactivate/',
  },
  // Services
  SERVICES: {
    LIST: '/services/',
    DETAIL: '/services/:service_id/',
  },
  // Applications
  APPLICATIONS: {
    LIST: '/applications/',
    DETAIL: '/applications/:reference_number/',
    STATUS: '/applications/:reference_number/status/',
    DOCUMENTS: '/applications/:reference_number/documents/',
  },
  // Tracking
  TRACK: {
    APPLICATION: '/track/:reference_number/',
    DOCUMENTS: '/track/:reference_number/documents/',
    TIMELINE: '/track/:reference_number/timeline/',
    REQUEST_OTP: '/track/request-otp/',
    VERIFY_OTP: '/track/verify-otp/',
  },
  // Indian E-Visa
  EVISA: {
    REGISTER: '/indian-e-visa/register/',
    CONFIRM_EMAIL: '/indian-e-visa/confirm-email/',
    RESEND_EMAIL: '/indian-e-visa/resend-email/',
    PAYMENT_CONFIRM: '/indian-e-visa/payment/confirm/',
    UPLOAD: '/indian-e-visa/upload/',
  },
  // Orders & Payments
  ORDERS: {
    LIST: '/orders/',
    DETAIL: '/orders/:order_id/',
  },
  PAYMENTS: {
    CHECKOUT: '/payments/checkout/',
  },
  // Support Tickets
  SUPPORT: {
    TICKETS_LIST: '/support/tickets/',
    TICKETS_DETAIL: '/support/tickets/:ticket_id/',
    TICKETS_REPLY: '/support/tickets/:ticket_id/reply/',
  },
  // Forms
  FORMS: {
    CONTACT: '/forms/contact/',
  },
  // Public APIs
  PUBLIC: {
    HOME: '/public/home/',
    TESTIMONIALS: '/public/testimonials/',
    FAQS: '/public/faqs/',
    PRICING: '/public/pricing/',
  },
  // Cookies
  COOKIES: {
    CONSENT: '/cookies/consent/',
    POLICY: '/cookies/policy/',
  },
} as const;
