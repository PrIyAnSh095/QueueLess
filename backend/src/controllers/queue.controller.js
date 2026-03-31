import * as queueService from "../services/queue.service.js";

export const createQueue = async (req, res, next) => {
  try {
    const queue = await queueService.createQueue({
      ...req.body,
      userId: req.user._id
    });
    res.status(201).json({ success: true, data: queue });
  } catch (error) {
    next(error);
  }
};

export const getQueues = async (req, res, next) => {
  try {
    const queues = await queueService.getQueues();
    res.json({ success: true, data: queues });
  } catch (error) {
    next(error);
  }
};

export const toggleBreak = async (req, res, next) => {
  try {
    const { queueId } = req.params;
    const queue = await queueService.toggleBreak(queueId, req.user._id);

    // WebSocket Update
    import("../server.js").then(({ io }) => {
      io.emit("queue_update", { queueId, type: "break_toggle" });
    });

    res.json({ success: true, data: queue });
  } catch (error) {
    next(error);
  }
};
