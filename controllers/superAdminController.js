const mongoose = require("mongoose");
const User = require("../models/User");
const Mosque = require("../models/Mosque");

// @desc    Get all pending imam requests
// @route   GET /api/superadmin/imam-requests
// @access  Private (Super Admin only)
exports.getImamRequests = async (req, res) => {
  try {
    // Check if user is super admin
    if (req.user.role !== "superadmin") {
      return res
        .status(403)
        .json({ message: "Access denied. Super admin only." });
    }

    // Find all users with role "imam" who have verified their email
    const imamRequests = await User.find({
      role: "imam",
      isEmailVerified: true, // Only show verified users
    }).select("-password");

    // Format the data for frontend
    const formattedRequests = imamRequests.map((imam) => {
      // Get the first attached mosque name and address if available
      const firstMosque =
        imam.attachedMosques && imam.attachedMosques.length > 0
          ? imam.attachedMosques[0]
          : null;

      return {
        id: imam._id,
        name: `${imam.firstName} ${imam.lastName}`,
        email: imam.email,
        phone: imam.phone || "Not provided",
        mosqueName: firstMosque ? firstMosque.name : "Not specified",
        address: firstMosque
          ? firstMosque.address
          : imam.currentLocation || "Not provided",
        message: imam.messageToCommunity || "No message provided",
        status: imam.imamApprovalStatus || "pending",
        profilePicture: imam.profilePicture,
        attachedMosques: imam.attachedMosques || [],
        createdAt: imam.createdAt,
      };
    });

    res.json(formattedRequests);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};

// @desc    Approve imam request and assign to mosque
// @route   POST /api/superadmin/approve-imam/:imamId
// @access  Private (Super Admin only)
exports.approveImamRequest = async (req, res) => {
  try {
    // Check if user is super admin
    if (req.user.role !== "superadmin") {
      return res
        .status(403)
        .json({ message: "Access denied. Super admin only." });
    }

    const imamId = req.params.imamId;

    // Find the imam
    const imam = await User.findById(imamId);
    if (!imam) {
      return res.status(404).json({ message: "Imam not found" });
    }

    if (imam.role !== "imam") {
      return res.status(400).json({ message: "User is not an imam" });
    }

    // Check if imam has attached mosques
    if (!imam.attachedMosques || imam.attachedMosques.length === 0) {
      return res.status(400).json({
        message: "Imam must have at least one attached mosque to be approved",
      });
    }

    const assignedMosques = [];
    const errors = [];

    // Process each attached mosque
    for (const attachedMosque of imam.attachedMosques) {
      try {
        // Find the mosque in database by externalId or create it if it doesn't exist
        let mosque = await Mosque.findOne({ externalId: attachedMosque.id });

        if (!mosque) {
          // Create the mosque if it doesn't exist
          mosque = new Mosque({
            name: attachedMosque.name,
            address: attachedMosque.address,
            externalId: attachedMosque.id,
            location: {
              type: "Point",
              coordinates: [
                attachedMosque.location.coordinates[0],
                attachedMosque.location.coordinates[1],
              ],
            },
          });
          await mosque.save();
        }

        // Check if imam is already assigned to this mosque
        if (!mosque.imams.includes(imamId)) {
          // Add imam to mosque
          mosque.imams.push(imamId);
          await mosque.save();
        }

        assignedMosques.push({
          id: mosque._id,
          name: mosque.name,
          address: mosque.address,
        });
      } catch (error) {
        errors.push(
          `Failed to assign to ${attachedMosque.name}: ${error.message}`
        );
      }
    }

    if (assignedMosques.length === 0) {
      return res.status(400).json({
        message: "Failed to assign imam to any mosques",
        errors,
      });
    }

    // Update imam's approval status and managed mosques
    imam.imamApprovalStatus = "approved";
    imam.isVerified = true;
    imam.managedMosques = assignedMosques.map((m) => m.id);
    await imam.save();

    // Send notification to imam (you can implement this later)
    const io = req.app.get("io");
    if (io) {
      io.to(imamId).emit("imamApproved", {
        mosques: assignedMosques,
      });
    }

    res.json({
      message: `Imam approved and assigned to ${assignedMosques.length} mosque(s) successfully`,
      imam: {
        id: imam._id,
        name: `${imam.firstName} ${imam.lastName}`,
        email: imam.email,
      },
      assignedMosques,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};

// @desc    Deny imam request
// @route   POST /api/superadmin/deny-imam/:imamId
// @access  Private (Super Admin only)
exports.denyImamRequest = async (req, res) => {
  try {
    // Check if user is super admin
    if (req.user.role !== "superadmin") {
      return res
        .status(403)
        .json({ message: "Access denied. Super admin only." });
    }

    const { reason } = req.body;
    const imamId = req.params.imamId;

    // Find the imam
    const imam = await User.findById(imamId);
    if (!imam) {
      return res.status(404).json({ message: "Imam not found" });
    }

    if (imam.role !== "imam") {
      return res.status(400).json({ message: "User is not an imam" });
    }

    // Update imam status
    imam.imamApprovalStatus = "denied";
    imam.deniedReason = reason || "Request denied by super admin";
    imam.isVerified = false;
    await imam.save();

    // Send notification to imam (you can implement this later)
    const io = req.app.get("io");
    if (io) {
      io.to(imamId).emit("imamDenied", {
        reason: reason || "Request denied by super admin",
      });
    }

    res.json({
      message: "Imam request denied successfully",
      imam: {
        id: imam._id,
        name: `${imam.firstName} ${imam.lastName}`,
        email: imam.email,
      },
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};

// @desc    Get all mosques for assignment
// @route   GET /api/superadmin/mosques
// @access  Private (Super Admin only)
exports.getMosquesForAssignment = async (req, res) => {
  try {
    // Check if user is super admin
    if (req.user.role !== "superadmin") {
      return res
        .status(403)
        .json({ message: "Access denied. Super admin only." });
    }

    const mosques = await Mosque.find().populate(
      "imams",
      "firstName lastName email"
    );

    const formattedMosques = mosques.map((mosque) => ({
      id: mosque._id,
      name: mosque.name,
      address: mosque.address,
      imams: mosque.imams,
      imamCount: mosque.imams.length,
    }));

    res.json(formattedMosques);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};

// @desc    Remove imam from mosque
// @route   DELETE /api/superadmin/mosque/:mosqueId/imam/:imamId
// @access  Private (Super Admin only)
exports.removeImamFromMosque = async (req, res) => {
  try {
    // Check if user is super admin
    if (req.user.role !== "superadmin") {
      return res
        .status(403)
        .json({ message: "Access denied. Super admin only." });
    }

    const { mosqueId, imamId } = req.params;

    // Find the mosque
    const mosque = await Mosque.findById(mosqueId);
    if (!mosque) {
      return res.status(404).json({ message: "Mosque not found" });
    }

    // Remove imam from mosque
    mosque.imams = mosque.imams.filter((id) => id.toString() !== imamId);
    await mosque.save();

    // Remove mosque from imam's managed mosques
    const imam = await User.findById(imamId);
    if (imam) {
      imam.managedMosques = imam.managedMosques.filter(
        (id) => id.toString() !== mosqueId
      );
      await imam.save();
    }

    res.json({ message: "Imam removed from mosque successfully" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};

// @desc    Update imam approval status (approve, deny, pending)
// @route   PATCH /api/superadmin/imam-status/:imamId
// @access  Private (Super Admin only)
exports.updateImamStatus = async (req, res) => {
  try {
    if (req.user.role !== "superadmin") {
      return res
        .status(403)
        .json({ message: "Access denied. Super admin only." });
    }

    const imamId = req.params.imamId;
    const { status, managedMosques, deniedReason } = req.body;

    // Find the imam
    const imam = await User.findById(imamId);
    if (!imam) {
      return res.status(404).json({ message: "Imam not found" });
    }
    if (imam.role !== "imam") {
      return res.status(400).json({ message: "User is not an imam" });
    }

    if (!status || !["pending", "approved", "denied"].includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    imam.imamApprovalStatus = status;
    if (status === "approved") {
      imam.isVerified = true;
      if (Array.isArray(managedMosques)) {
        imam.managedMosques = managedMosques;
      }
      imam.deniedReason = undefined;
    } else if (status === "denied") {
      imam.isVerified = false;
      imam.managedMosques = [];
      imam.deniedReason = deniedReason || "Request denied by super admin";
    } else if (status === "pending") {
      imam.isVerified = false;
      imam.managedMosques = [];
      imam.deniedReason = undefined;
    }
    await imam.save();

    // Optionally, update mosque.imams array if status is changed
    if (status !== "approved") {
      // Remove imam from all mosques' imams arrays
      await Mosque.updateMany(
        { imams: imam._id },
        { $pull: { imams: imam._id } }
      );
    } else if (status === "approved" && Array.isArray(managedMosques)) {
      // Ensure imam is added to selected mosques
      await Mosque.updateMany(
        { _id: { $in: managedMosques } },
        { $addToSet: { imams: imam._id } }
      );
    }

    res.json({
      message: `Imam status updated to ${status}`,
      imam: {
        id: imam._id,
        name: `${imam.firstName} ${imam.lastName}`,
        email: imam.email,
        status: imam.imamApprovalStatus,
        managedMosques: imam.managedMosques,
        deniedReason: imam.deniedReason,
      },
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};
