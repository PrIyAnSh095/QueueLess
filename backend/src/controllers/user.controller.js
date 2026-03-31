import User from "../models/user.model.js";

/**
 * Update the user's current/last known location.
 * Expects { lat, lng } in req.body.
 */
export const updateLocation = async (req, res) => {
  try {
    const { lat, lng } = req.body;

    if (lat === undefined || lng === undefined) {
      return res.status(400).json({ success: false, message: "Latitude and longitude are required" });
    }

    // Basic range validation
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return res.status(400).json({ success: false, message: "Invalid coordinate range" });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        location: {
          type: "Point",
          coordinates: [Number(lng), Number(lat)]
        }
      },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    console.log(`[user.controller] Location updated for user ${user._id}: [${lng}, ${lat}]`);

    res.status(200).json({
      success: true,
      message: "Location updated successfully",
      data: { lat, lng }
    });
  } catch (error) {
    console.error("[user.controller] updateLocation error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get the user's latest profile data (including location).
 */
export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
