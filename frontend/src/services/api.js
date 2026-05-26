import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  withCredentials: true
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// Auth
export const registerUser = (data) => API.post("/auth/register", data);
export const loginUser = (data) => API.post("/auth/login", data);
export const logoutUser = () => API.post("/auth/logout");
export const getMe = () => API.get("/auth/me");
export const forgotPasswordAPI = (email) => API.post("/auth/forgot-password", { email });
export const resetPasswordAPI = (data) => API.post("/auth/reset-password", data);
export const changePasswordAPI = (data) => API.post("/auth/change-password", data);
export const sendChangeOTPAPI = (userId) => API.post("/auth/send-change-otp", { userId });
export const changePasswordByAdminAPI = (data) => API.post("/auth/change-password-admin", data);

// Services
export const getServices = () => API.get("/services");
export const getServiceById = (id) => API.get(`/services/${id}`);
export const getServiceBookableDatesAPI = (serviceId) => API.get(`/services/${serviceId}/bookable-dates`);
export const getQueueSlotsAPI = (queueId, date) => API.get(`/services/queue/${queueId}/slots`, { params: { date } });
export const getMyServices = () => API.get("/services/mine");
export const createServiceAPI = (formData) => API.post("/services/create", formData, { headers: { "Content-Type": "multipart/form-data" } });
export const updateServiceAPI = (id, data) => API.put(`/services/${id}`, data);
export const requestServiceEditAPI = (id, formData) => API.post(`/services/${id}/request-edit`, formData, { headers: { "Content-Type": "multipart/form-data" } });
export const deleteServiceAPI = (id) => API.delete(`/services/${id}`);
export const getServiceStatsAPI = (id) => API.get(`/services/${id}/stats`);
export const toggleQueueBreakAPI = (queueId) => API.put(`/queues/${queueId}/toggle-break`);


// Tickets (Queue Join)
export const requestJoinCodeAPI = (data) => API.post("/tickets/request-join-code", data);
export const confirmJoinAPI = (data) => API.post("/tickets/confirm-join", data);
export const addWalkInTicketAPI = (data) => API.post("/tickets/walk-in", data);
export const joinQueueAPI = (data) => API.post("/tickets/join", data);
export const leaveQueueAPI = (ticketId) => API.put(`/tickets/leave/${ticketId}`);
export const getQueuePositionAPI = (queueId) => API.get(`/tickets/position/${queueId}`);
export const getLiveEtaAPI = (queueId, params = {}) => API.get(`/tickets/live-eta/${queueId}`, { params });
export const getMyTicketsAPI = () => API.get("/tickets/my-tickets");
export const getMyHistoryAPI = () => API.get("/tickets/my-history");
export const getServiceQueueAPI = (serviceId) => API.get(`/tickets/service/${serviceId}`);
export const serveNextAPI = (queueId) => API.put(`/tickets/serve/${queueId}`);
export const reportDelayAPI = (ticketId) => API.post(`/tickets/report-delay/${ticketId}`);
export const confirmServeAPI = (historyId, status) => API.post(`/tickets/confirm-serve/${historyId}`, { status });

// Admin
export const adminGetStatsAPI = () => API.get("/admin/stats");
export const adminGetOrganizationsAPI = (params) => API.get("/admin/organizations", { params });
export const adminApproveOrgAPI = (id) => API.put(`/admin/organizations/${id}/approve`);
export const adminRejectOrgAPI = (id) => API.put(`/admin/organizations/${id}/reject`);
export const adminApproveAddressAPI = (id) => API.put(`/admin/organizations/${id}/approve-address`);
export const adminRejectAddressAPI = (id) => API.put(`/admin/organizations/${id}/reject-address`);
export const adminGetUsersAPI = (params) => API.get("/admin/users", { params });
export const adminGetUserHistoryAPI = (userId) => API.get(`/admin/users/${userId}/history`);
export const adminGetTicketsAPI = (params) => API.get("/admin/tickets", { params });
export const adminGetUpdateRequestsAPI = () => API.get("/admin/update-requests");
export const getAdminDashboardDataAPI = () => API.get("/admin/dashboard-data");
export const adminListServices = () => API.get("/services/admin");
export const adminSetServiceApproval = (id, approvalStatus) => API.patch(`/services/${id}/approval-status`, { approvalStatus });
export const adminGetCountersAPI = () => API.get("/admin/counters");
export const adminCreateCounterAPI = (data) => API.post("/admin/counters", data);
export const adminDeleteCounterAPI = (id) => API.delete(`/admin/counters/${id}`);

// Organizations
export const getPublicOrganizationsAPI = (params) => API.get("/organizations/public", { params });
export const getPublicOrganizationAPI = (id) => API.get(`/organizations/public/${id}`);
export const getMyOrgProfileAPI = () => API.get("/organizations/me");
export const updateMyOrgProfileAPI = (data) => API.put("/organizations/me", data);
export const uploadFileAPI = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return API.post("/organizations/me/upload", formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
};
export const uploadVerificationDocAPI = (formData) => API.post("/organizations/me/verification-doc", formData, { headers: { "Content-Type": "multipart/form-data" } });
export const uploadOrgImagesAPI = (formData) => API.post("/organizations/me/images", formData, { headers: { "Content-Type": "multipart/form-data" } });
export const getOrgServicesAPI = () => API.get("/organizations/me/services");
export const getOrgStatsAPI = () => API.get("/organizations/me/stats");
export const getOrgQueueUsersAPI = () => API.get("/organizations/me/queue-users");
export const getOrgQueuesAPI = () => API.get("/organizations/me/queues");
export const getOrgCountersAPI = () => API.get("/counters");
export const createOrgCounterAPI = (data) => API.post("/counters", data);
export const deleteOrgCounterAPI = (id) => API.delete(`/counters/${id}`);
export const getOrgHistoryAPI = (params) => API.get("/organizations/me/history", { params });
export const getOrgChartsAPI = () => API.get("/organizations/me/charts");
export const getOrgStaffAPI = () => API.get("/organizations/me/staff");

export const createOrgStaffAPI = (data) => API.post("/organizations/me/staff", data);
export const serveNextByCounterAPI = (counterId) => API.put(`/counters/${counterId}/serve-next`);
export const completeCurrentTokenAPI = (counterId) => API.put(`/counters/${counterId}/complete`);
export const updateQueueStatusAPI = (queueId, status) => API.put(`/organizations/me/queues/${queueId}/status`, { status });
export const acceptAvgTimeAPI = (accept) => API.put("/organizations/me/accept-avg-time", { accept });

// Notifications
export const getNotificationsAPI = () => API.get("/notifications");
export const markNotificationReadAPI = (id) => API.put(`/notifications/${id}/read`);
export const markAllNotificationsReadAPI = () => API.put("/notifications/read-all");

// Reviews
export const getReviewsAPI = (targetType, targetId) => API.get("/reviews", { params: { targetType, targetId } });
export const createReviewAPI = (formData) => API.post("/reviews", formData, { headers: { "Content-Type": "multipart/form-data" } });
export const deleteReviewAPI = (id) => API.delete(`/reviews/${id}`);

// Search
export const searchAPI = (q) => API.get("/search", { params: { q } });

// User 
export const updateUserLocationAPI = (lat, lng) => API.put("/users/profile/location", { lat, lng });

export default API;