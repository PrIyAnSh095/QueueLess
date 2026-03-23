import Queue from "../models/queue.model.js";

export const createQueue = async ({ serviceId, userLimit, openingTime, closingTime, breakStartTime, breakEndTime, avgServiceTime, userId }) => {
  const queue = await Queue.create({
    serviceId,
    userLimit,
    openingTime,
    closingTime,
    breakStartTime,
    breakEndTime,
    avgServiceTime,
    createdBy: userId
  });

  return queue;
};

export const getQueues = async () => {
  return Queue.find({ isActive: true }).populate("createdBy", "name email role").populate("serviceId", "serviceName");
};

