import axios from "axios";

export const API = axios.create({
  baseURL: "http://localhost:5000/api",
  withCredentials: true
});

export const registerUser = (data) => API.post("/auth/register", data);
export const loginUser = (data) => API.post("/auth/login", data);
export const logoutUser = () => API.post("/auth/logout");
export const getMeAPI = () => API.get("/auth/me");
export const getMe = () => API.get("/auth/me");

export const createQueueAPI = (data) => API.post("/services/configure-queue", data);
export const getQueues = () => API.get("/queues");

export const getServices = () => API.get("/services");
export const getServiceById = (id) => API.get(`/services/${id}`);
export const getServiceBookableDatesAPI = (serviceId) =>
  API.get(`/services/${serviceId}/bookable-dates`);
export const getServiceSlotsAPI = (serviceId, date) =>
  API.get(`/services/${serviceId}/slots`, { params: { date } });
export const getMyServices = () => API.get("/services/mine");
export const createServiceAPI = (formData) =>
  API.post("/services/create", formData, { headers: { "Content-Type": "multipart/form-data" } });
export const updateServiceAPI = (id, data) => API.put(`/services/${id}`, data);
export const deleteServiceAPI = (id) => API.delete(`/services/${id}`);

export const joinQueueAPI = (serviceId, userLocation, scheduledStart) =>
  API.post("/tickets/join", { serviceId, userLocation, scheduledStart });
export const leaveQueueAPI = (ticketId) => API.put(`/tickets/leave/${ticketId}`);
export const getQueuePositionAPI = (serviceId) => API.get(`/tickets/position/${serviceId}`);
export const getMyTicketsAPI = () => API.get("/tickets/my-tickets");
export const getServiceQueueAPI = (serviceId) => API.get(`/tickets/service/${serviceId}`);
export const serveNextAPI = (serviceId) => API.put(`/tickets/serve/${serviceId}`);

export const getPendingProvidersAPI = () => API.get("/admin/providers/pending");
export const getAllProvidersAPI = () => API.get("/admin/providers");
export const approveProviderAPI = (id) => API.put(`/admin/providers/${id}/approve`);
export const rejectProviderAPI = (id) => API.put(`/admin/providers/${id}/reject`);
export const getAllBookingsAPI = () => API.get("/admin/bookings");
export const adminListServices = () => API.get("/services/admin");
export const adminSetServiceApproval = (id, approvalStatus) =>
  API.patch(`/services/${id}/approval-status`, { approvalStatus });


export const getTrendingServicesAPI = () => API.get("/analytics/trending");
export const getProviderStatsAPI = (id) => API.get(`/analytics/provider/${id}`);
export const getGlobalStatsAPI = () => API.get("/analytics/global");
export const completeTicketAPI = (id) => API.put(`/tickets/complete/${id}`);
export const transferTicketAPI = (id, targetServiceId) => API.put(`/tickets/transfer/${id}`, { targetServiceId });

export default API;