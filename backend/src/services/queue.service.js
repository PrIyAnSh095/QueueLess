import mongoose from "mongoose";
import Queue from "../models/queue.model.js";
import Service from "../models/Service.model.js";
import ServiceProvider from "../models/ServiceProvider.model.js";

export const createQueue = async (data) => {
  const queue = await Queue.create(data);
  return queue;
};

export const getQueues = async () => {
  return await Queue.find().populate("serviceId");
};

export const toggleBreak = async (queueId, userId) => {
  const queue = await Queue.findById(queueId).populate("serviceId");
  if (!queue) throw new Error("Queue not found");

  const service = queue.serviceId;
  const user = await mongoose.model("User").findById(userId);
  
  // Resolve Org ID for the requester
  let requesterOrgId = null;
  if (["counter", "reception"].includes(user?.role)) {
    requesterOrgId = user.organizationId;
  } else {
    const provider = await ServiceProvider.findOne({ user: userId });
    requesterOrgId = provider?._id;
  }
  
  if (!requesterOrgId) throw new Error("Authentication context missing for queue management");

  const isOwner = service?.organizationId?.toString() === requesterOrgId.toString();
  const isCounter = queue.counters.some((counterId) => counterId?.toString() === userId.toString());

  if (!isOwner && !isCounter && !["counter", "reception"].includes(user?.role)) {
    throw new Error("Not authorized to manage this queue");
  }

  if (queue.status === "ended" && !queue.isOnBreak) {
    throw new Error("Queue is ended. Start it again before using break mode.");
  }

  queue.isOnBreak = !queue.isOnBreak;
  return await queue.save();
};
