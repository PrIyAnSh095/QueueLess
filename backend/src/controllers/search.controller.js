import Service from "../models/Service.model.js";
import ServiceProvider from "../models/ServiceProvider.model.js";

export const search = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || !q.trim()) {
      return res.json({ success: true, data: { services: [], organizations: [] } });
    }

    const regex = { $regex: q.trim(), $options: "i" };

    const [services, organizations] = await Promise.all([
      Service.find({
        approvalStatus: "approved",
        status: true,
        $or: [{ serviceName: regex }, { description: regex }]
      })
        .limit(20)
        .populate("organizationId", "businessName"),
      ServiceProvider.find({
        status: "approved",
        $or: [{ businessName: regex }, { address: regex }, { description: regex }]
      })
        .limit(20)
        .populate("user", "name email")
    ]);

    return res.json({
      success: true,
      data: {
        services: services.map(s => ({
          _id: s._id,
          serviceName: s.serviceName,
          description: s.description,
          organizationName: s.organizationId?.businessName || "Organization"
        })),
        organizations: organizations.map(o => ({
          _id: o._id,
          businessName: o.businessName,
          address: o.address,
          ownerName: o.user?.name
        }))
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
