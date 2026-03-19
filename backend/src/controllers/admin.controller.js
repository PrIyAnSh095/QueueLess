import ServiceProvider from "../models/ServiceProvider.model.js";

export const getPendingProviders = async (req, res) => {
  try {
    const providers = await ServiceProvider.find({ status: "pending" })
      .populate("user", "name email phone createdAt")
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, data: providers });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getAllProviders = async (req, res) => {
  try {
    const providers = await ServiceProvider.find()
      .populate("user", "name email phone createdAt")
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, data: providers });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const approveProvider = async (req, res) => {
  try {
    const provider = await ServiceProvider.findByIdAndUpdate(
      req.params.id,
      { status: "approved" },
      { new: true }
    ).populate("user", "name email");

    if (!provider) return res.status(404).json({ success: false, message: "Provider not found" });

    return res.status(200).json({ success: true, data: provider });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const rejectProvider = async (req, res) => {
  try {
    const provider = await ServiceProvider.findByIdAndUpdate(
      req.params.id,
      { status: "rejected" },
      { new: true }
    ).populate("user", "name email");

    if (!provider) return res.status(404).json({ success: false, message: "Provider not found" });

    return res.status(200).json({ success: true, data: provider });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
