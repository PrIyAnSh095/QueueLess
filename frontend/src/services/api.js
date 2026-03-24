import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:5000/api",
  withCredentials: true
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
export const getServiceSlotsAPI = (serviceId, date) => API.get(`/services/${serviceId}/slots`, { params: { date } });
export const getMyServices = () => API.get("/services/mine");
export const createServiceAPI = (formData) => API.post("/services/create", formData, { headers: { "Content-Type": "multipart/form-data" } });
export const updateServiceAPI = (id, data) => API.put(`/services/${id}`, data);
export const deleteServiceAPI = (id) => API.delete(`/services/${id}`);

// Tickets (Queue Join)
export const requestJoinOTPAPI = (data) => API.post("/tickets/request-join-otp", data);
export const confirmJoinAPI = (data) => API.post("/tickets/confirm-join", data);
export const joinQueueAPI = (serviceId, userLocation, scheduledStart) => API.post("/tickets/join", { serviceId, userLocation, scheduledStart });
export const leaveQueueAPI = (ticketId) => API.put(`/tickets/leave/${ticketId}`);
export const getQueuePositionAPI = (serviceId) => API.get(`/tickets/position/${serviceId}`);
export const getMyTicketsAPI = () => API.get("/tickets/my-tickets");
export const getServiceQueueAPI = (serviceId) => API.get(`/tickets/service/${serviceId}`);
export const serveNextAPI = (serviceId) => API.put(`/tickets/serve/${serviceId}`);
export const reportDelayAPI = (ticketId) => API.post(`/tickets/report-delay/${ticketId}`);

// Admin
export const adminGetStatsAPI = () => API.get("/admin/stats");
export const adminGetOrganizationsAPI = (params) => API.get("/admin/organizations", { params });
export const adminApproveOrgAPI = (id) => API.put(`/admin/organizations/${id}/approve`);
export const adminRejectOrgAPI = (id) => API.put(`/admin/organizations/${id}/reject`);
export const adminGetUsersAPI = (params) => API.get("/admin/users", { params });
export const adminGetUserHistoryAPI = (userId) => API.get(`/admin/users/${userId}/history`);
export const adminGetTicketsAPI = (params) => API.get("/admin/tickets", { params });
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
export const uploadVerificationDocAPI = (formData) => API.post("/organizations/me/verification-doc", formData, { headers: { "Content-Type": "multipart/form-data" } });
export const uploadOrgImagesAPI = (formData) => API.post("/organizations/me/images", formData, { headers: { "Content-Type": "multipart/form-data" } });
export const getOrgServicesAPI = () => API.get("/organizations/me/services");
export const getOrgStatsAPI = () => API.get("/organizations/me/stats");
export const getOrgQueueUsersAPI = () => API.get("/organizations/me/queue-users");
export const getOrgCountersAPI = () => API.get("/organizations/me/counters");
export const createOrgCounterAPI = (data) => API.post("/organizations/me/counters", data);
export const deleteOrgCounterAPI = (id) => API.delete(`/organizations/me/counters/${id}`);

// Notifications
export const getNotificationsAPI = () => API.get("/notifications");
export const markNotificationReadAPI = (id) => API.put(`/notifications/${id}/read`);
export const markAllNotificationsReadAPI = () => API.put("/notifications/read-all");

// Reviews
export const getReviewsAPI = (targetType, targetId) => API.get("/reviews", { params: { targetType, targetId } });
export const createReviewAPI = (data) => API.post("/reviews", data);
export const deleteReviewAPI = (id) => API.delete(`/reviews/${id}`);

// Search
export const searchAPI = (q) => API.get("/search", { params: { q } });

export default API;