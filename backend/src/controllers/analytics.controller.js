import Ticket from "../models/ticket.model.js";
import Service from "../models/Service.model.js";
import mongoose from "mongoose";

export const getProviderStats = async (req, res) => {
  try {
    const { providerId } = req.params;
    
    const services = await Service.find({ organizationId: providerId });
    const serviceIds = services.map(s => s._id);

    const [generalStats, waitingCount, cancelledCount] = await Promise.all([
      Ticket.aggregate([
        { $match: { service: { $in: serviceIds }, status: "completed" } },
        {
          $group: {
            _id: null,
            avgServiceTime: { $avg: { $subtract: ["$completedAt", "$servedAt"] } },
            avgWaitTime: { $avg: { $subtract: ["$servedAt", "$createdAt"] } },
            totalServed: { $sum: 1 }
          }
        }
      ]),
      Ticket.countDocuments({ service: { $in: serviceIds }, status: "waiting" }),
      Ticket.countDocuments({ service: { $in: serviceIds }, status: "cancelled" })
    ]);

    const result = generalStats[0] || { avgServiceTime: 0, avgWaitTime: 0, totalServed: 0 };
    result.avgServiceTime = Math.round((result.avgServiceTime / 1000) / 60) || 0;
    result.avgWaitTime = Math.round((result.avgWaitTime / 1000) / 60) || 0;
    result.waiting = waitingCount;
    result.cancelled = cancelledCount;

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getTrendingServices = async (req, res) => {
  try {
    const trending = await Ticket.aggregate([
      { $match: { createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } },
      { $group: { _id: "$service", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: "services",
          localField: "_id",
          foreignField: "_id",
          as: "serviceDetails"
        }
      },
      { $unwind: "$serviceDetails" },
      {
        $project: {
          _id: 1,
          count: 1,
          serviceName: "$serviceDetails.serviceName",
          description: "$serviceDetails.description",
          avgServiceTime: "$serviceDetails.avgServiceTime"
        }
      }
    ]);

    res.json({ success: true, data: trending });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getGlobalStats = async (req, res) => {
    try {
        const now = new Date();
        const startOfDay = new Date(now.setHours(0, 0, 0, 0));
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfYear = new Date(now.getFullYear(), 0, 1);

        const [daily, monthly, yearly, totals] = await Promise.all([
            Ticket.countDocuments({ createdAt: { $gte: startOfDay } }),
            Ticket.countDocuments({ createdAt: { $gte: startOfMonth } }),
            Ticket.countDocuments({ createdAt: { $gte: startOfYear } }),
            Promise.all([
                Ticket.countDocuments(),
                Service.countDocuments(),
                mongoose.model("ServiceProvider").countDocuments()
            ])
        ]);

        res.json({ 
            success: true, 
            data: { 
                daily, 
                monthly, 
                yearly, 
                totalTickets: totals[0], 
                totalServices: totals[1], 
                totalProviders: totals[2] 
            } 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}
