// import Queue from "../models/queue.model.js";

// export const createQueue = async ({ name, location, avgServiceTime, userId }) => {
//   const queue = await Queue.create({
//     name,
//     location,
//     avgServiceTime,
//     createdBy: userId
//   });

//   return queue;
// };

// export const getQueues = async () => {
//   return Queue.find({ isActive: true }).populate("createdBy", "name email role");
// };
