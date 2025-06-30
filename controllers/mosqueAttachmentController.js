const MosqueAttachmentRequest = require("../models/MosqueAttachmentRequest");
const User = require("../models/User");
const Mosque = require("../models/Mosque");
const mongoose = require("mongoose");

// @desc    Create a mosque attachment request
// @route   POST /api/mosque-attachments/request
// @access  Private
exports.createAttachmentRequest = async (req, res) => {
  try {
    const { mosqueId, message, mosqueData } = req.body;
    const userId = req.user.id;

    // Validate input
    if (!mosqueId) {
      return res.status(400).json({
        message: "Mosque ID is required",
      });
    }

    // Check if user is male or female
    if (!["male", "female"].includes(req.user.role)) {
      return res.status(403).json({
        message: "Only male and female users can request mosque attachments",
      });
    }

    // Find mosque by either ObjectId or externalId
    let mosque;
    console.log("Looking for mosque with ID:", mosqueId);
    console.log("Mosque data from frontend:", mosqueData);

    // Check if it's a valid ObjectId (24 character hex string)
    const isValidObjectId =
      typeof mosqueId === "string" &&
      mosqueId.length === 24 &&
      /^[0-9a-fA-F]{24}$/.test(mosqueId) &&
      mongoose.Types.ObjectId.isValid(mosqueId);

    if (isValidObjectId) {
      // If it's a valid ObjectId, search by _id
      console.log("Searching by ObjectId");
      mosque = await Mosque.findById(mosqueId);
    } else {
      // If it's not a valid ObjectId, search by externalId
      console.log("Searching by externalId:", mosqueId);
      mosque = await Mosque.findOne({ externalId: mosqueId });
    }

    console.log("Found mosque:", mosque ? mosque.name : "Not found");

    // If mosque doesn't exist in database, create a temporary mosque record
    if (!mosque) {
      console.log("Creating new mosque record");
      // This handles mosques from allMosquesInLondon.js that aren't in the database
      const mosqueLocation = mosqueData?.location
        ? {
            type: "Point",
            coordinates: [mosqueData.location.lng, mosqueData.location.lat],
          }
        : {
            type: "Point",
            coordinates: [0, 0], // Default coordinates
          };

      mosque = new Mosque({
        name: mosqueData?.name || `Mosque ${mosqueId}`,
        externalId: mosqueData?.externalId || mosqueId,
        location: mosqueLocation,
        address: mosqueData?.address || "Address not available",
        imams: [], // No imams assigned
      });

      // Save the temporary mosque
      await mosque.save();
      console.log("New mosque saved with ID:", mosque._id);
    }

    // Get user with current attached mosques
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    console.log("User found:", user.firstName, user.lastName);
    console.log("User's current attached mosques:", user.attachedMosques);

    // Check if user is already attached to this mosque
    const mosqueExternalId = Number(mosque.externalId);
    console.log("Checking attachment for mosque externalId:", mosqueExternalId);

    const isAlreadyAttached = user.attachedMosques.some((attachedMosque) => {
      console.log("Comparing:", attachedMosque.id, "with", mosqueExternalId);
      return attachedMosque.id === mosqueExternalId;
    });

    console.log("Is already attached:", isAlreadyAttached);

    if (isAlreadyAttached) {
      console.log("Handling detachment");
      // Handle detachment
      // Remove mosque from user's attached mosques
      user.attachedMosques = user.attachedMosques.filter((attachedMosque) => {
        console.log("Filtering out mosque:", attachedMosque.id);
        return attachedMosque.id !== mosqueExternalId;
      });
      await user.save();
      console.log("User saved after detachment");

      // Delete any pending verification requests for this mosque
      await MosqueAttachmentRequest.deleteMany({
        userId,
        mosqueId: mosque._id,
        status: "pending",
      });

      // Update user's verification status after detachment
      await updateUserVerificationStatus(userId);

      return res.status(200).json({
        success: true,
        message: "Successfully detached from mosque!",
        action: "detached",
      });
    } else {
      console.log("Handling attachment");
      // Handle attachment
      // Check if user already has a pending verification request for this mosque
      const existingRequest = await MosqueAttachmentRequest.findOne({
        userId,
        mosqueId: mosque._id,
        status: "pending",
      });

      if (existingRequest) {
        return res.status(400).json({
          message:
            "You already have a pending verification request for this mosque",
        });
      }

      // Assign to the first imam of the mosque (if any)
      const assignedImamId = mosque.imams.length > 0 ? mosque.imams[0] : null;

      // Create the verification request only if there are imams
      let attachmentRequest = null;
      if (assignedImamId) {
        attachmentRequest = new MosqueAttachmentRequest({
          userId,
          mosqueId: mosque._id,
          message: message || "Requesting verification for mosque attachment",
          assignedImamId,
        });

        await attachmentRequest.save();
      }

      // Immediately attach user to the mosque (but keep them unverified)
      const mosqueCoordinates =
        mosque.location?.coordinates ||
        (mosque.location?.lng && mosque.location?.lat
          ? [mosque.location.lng, mosque.location.lat]
          : [0, 0]);

      console.log("Adding mosque to user's attached mosques:", {
        id: Number(mosque.externalId),
        name: mosque.name,
        address: mosque.address,
        coordinates: mosqueCoordinates,
      });

      user.attachedMosques.push({
        id: Number(mosque.externalId),
        name: mosque.name,
        address: mosque.address,
        location: {
          type: "Point",
          coordinates: mosqueCoordinates,
        },
      });
      await user.save();
      console.log("User saved after attachment");

      // Populate user and mosque details for response if there's a request
      if (attachmentRequest) {
        await attachmentRequest.populate([
          { path: "userId", select: "firstName lastName email profilePicture" },
          { path: "mosqueId", select: "name address" },
          { path: "assignedImamId", select: "firstName lastName" },
        ]);
      }

      return res.status(201).json({
        success: true,
        message: assignedImamId
          ? "Successfully attached to mosque! You are now unverified until the imam approves your request."
          : "Successfully attached to mosque! Verification is pending until an imam is assigned to this mosque.",
        action: "attached",
        request: attachmentRequest,
      });
    }
  } catch (err) {
    console.error("Create attachment request error:", err);
    console.error("Error stack:", err.stack);
    console.error("Request body:", req.body);
    console.error("User ID:", req.user?.id);

    // Handle specific error types
    if (err.code === 11000) {
      // Duplicate key error (unique constraint violation)
      return res.status(400).json({
        message: "You already have a pending request for this mosque",
      });
    }

    if (err.name === "ValidationError") {
      return res.status(400).json({
        message:
          "Validation error: " +
          Object.values(err.errors)
            .map((e) => e.message)
            .join(", "),
      });
    }

    res.status(500).json({
      message: "Server error while processing mosque attachment",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

// @desc    Get attachment requests for an imam
// @route   GET /api/mosque-attachments/imam-requests
// @access  Private (Imam only)
exports.getImamAttachmentRequests = async (req, res) => {
  try {
    console.log("getImamAttachmentRequests called");
    console.log("User:", req.user);

    // Check if user is an imam
    if (req.user.role !== "imam") {
      console.log("User is not an imam, role:", req.user.role);
      return res.status(403).json({
        message: "Access denied. Imam only.",
      });
    }

    // Check if imam is approved
    if (req.user.imamApprovalStatus !== "approved") {
      console.log("Imam not approved, status:", req.user.imamApprovalStatus);
      return res.status(403).json({
        message: "Your imam account is not yet approved",
      });
    }

    const imamId = req.user.id;
    const { status } = req.query;

    console.log("Imam ID:", imamId);
    console.log("Status filter:", status);

    // Build query
    const query = { assignedImamId: imamId };
    if (status && ["pending", "approved", "denied"].includes(status)) {
      query.status = status;
    }

    console.log("Query:", query);

    // Get requests with populated data
    const requests = await MosqueAttachmentRequest.find(query)
      .populate({
        path: "userId",
        select: "firstName lastName email phone profilePicture gender role",
      })
      .populate({
        path: "mosqueId",
        select: "name address",
      })
      .sort({ createdAt: -1 });

    console.log("Found requests:", requests.length);
    if (requests.length > 0) {
      console.log("First request:", requests[0]);
    }

    // Format the response
    const formattedRequests = requests.map((request) => ({
      id: request._id,
      user: {
        id: request.userId._id,
        name: `${request.userId.firstName} ${request.userId.lastName}`,
        email: request.userId.email,
        phone: request.userId.phone || "Not provided",
        gender: request.userId.gender,
        role: request.userId.role,
        profilePicture: request.userId.profilePicture,
      },
      mosque: {
        id: request.mosqueId._id,
        name: request.mosqueId.name,
        address: request.mosqueId.address,
      },
      message: request.message,
      status: request.status,
      imamResponse: request.imamResponse,
      denialReason: request.denialReason,
      createdAt: request.createdAt,
      reviewedAt: request.reviewedAt,
    }));

    console.log("Formatted requests:", formattedRequests.length);
    if (formattedRequests.length > 0) {
      console.log("First formatted request:", formattedRequests[0]);
    }

    res.json(formattedRequests);
  } catch (err) {
    console.error("Get imam attachment requests error:", err);
    res.status(500).json({
      message: "Server error while fetching attachment requests",
    });
  }
};

// @desc    Approve a mosque attachment request (verify user)
// @route   POST /api/mosque-attachments/:requestId/approve
// @access  Private (Imam only)
exports.approveAttachmentRequest = async (req, res) => {
  try {
    console.log("approveAttachmentRequest called");
    console.log("Request params:", req.params);
    console.log("Request body:", req.body);
    console.log("User:", req.user);

    // Check if user is an imam
    if (req.user.role !== "imam") {
      console.log("User is not an imam, role:", req.user.role);
      return res.status(403).json({
        message: "Access denied. Imam only.",
      });
    }

    const { requestId } = req.params;
    const { imamResponse } = req.body;
    const imamId = req.user.id;

    console.log("Looking for request with ID:", requestId);
    console.log("Imam ID:", imamId);

    // Find the request
    const request = await MosqueAttachmentRequest.findById(requestId)
      .populate("userId")
      .populate("mosqueId");

    console.log("Found request:", request);

    if (!request) {
      console.log("Request not found");
      return res.status(404).json({
        message: "Verification request not found",
      });
    }

    // Check if imam is assigned to this request
    if (request.assignedImamId.toString() !== imamId) {
      console.log(
        "Imam not authorized. Request imam:",
        request.assignedImamId.toString(),
        "Current imam:",
        imamId
      );
      return res.status(403).json({
        message: "You are not authorized to review this request",
      });
    }

    // Check if request is already processed
    if (request.status !== "pending") {
      console.log("Request already processed, status:", request.status);
      return res.status(400).json({
        message: "This verification request has already been processed",
      });
    }

    console.log("Processing approval...");

    // Update request status
    request.status = "approved";
    request.imamResponse = imamResponse;
    request.reviewedAt = new Date();
    await request.save();

    console.log("Request updated successfully");

    // Update user's verification status based on all their requests
    await updateUserVerificationStatus(request.userId._id);

    console.log("Approval completed successfully");

    res.json({
      success: true,
      message: "User verification approved successfully",
      request: {
        id: request._id,
        status: request.status,
        imamResponse: request.imamResponse,
        reviewedAt: request.reviewedAt,
      },
    });
  } catch (err) {
    console.error("Approve verification request error:", err);
    res.status(500).json({
      message: "Server error while approving verification request",
    });
  }
};

// @desc    Deny a mosque attachment request (deny verification)
// @route   POST /api/mosque-attachments/:requestId/deny
// @access  Private (Imam only)
exports.denyAttachmentRequest = async (req, res) => {
  try {
    console.log("denyAttachmentRequest called");
    console.log("Request params:", req.params);
    console.log("Request body:", req.body);
    console.log("User:", req.user);

    // Check if user is an imam
    if (req.user.role !== "imam") {
      console.log("User is not an imam, role:", req.user.role);
      return res.status(403).json({
        message: "Access denied. Imam only.",
      });
    }

    const { requestId } = req.params;
    const { denialReason, imamResponse } = req.body;
    const imamId = req.user.id;

    console.log("Looking for request with ID:", requestId);
    console.log("Imam ID:", imamId);

    // Find the request
    const request = await MosqueAttachmentRequest.findById(requestId);

    console.log("Found request:", request);

    if (!request) {
      console.log("Request not found");
      return res.status(404).json({
        message: "Verification request not found",
      });
    }

    // Check if imam is assigned to this request
    if (request.assignedImamId.toString() !== imamId) {
      console.log(
        "Imam not authorized. Request imam:",
        request.assignedImamId.toString(),
        "Current imam:",
        imamId
      );
      return res.status(403).json({
        message: "You are not authorized to review this request",
      });
    }

    // Check if request is already processed
    if (request.status !== "pending") {
      console.log("Request already processed, status:", request.status);
      return res.status(400).json({
        message: "This verification request has already been processed",
      });
    }

    console.log("Processing denial...");

    // Update request status
    request.status = "denied";
    request.denialReason = denialReason;
    request.imamResponse = imamResponse;
    request.reviewedAt = new Date();
    await request.save();

    console.log("Request updated successfully");

    // Update user's verification status based on all their requests
    await updateUserVerificationStatus(request.userId);

    res.json({
      success: true,
      message: "User verification denied successfully",
      request: {
        id: request._id,
        status: request.status,
        denialReason: request.denialReason,
        imamResponse: request.imamResponse,
        reviewedAt: request.reviewedAt,
      },
    });
  } catch (err) {
    console.error("Deny verification request error:", err);
    res.status(500).json({
      message: "Server error while denying verification request",
    });
  }
};

// @desc    Get user's attachment requests
// @route   GET /api/mosque-attachments/user-requests
// @access  Private
exports.getUserAttachmentRequests = async (req, res) => {
  try {
    const userId = req.user.id;

    const requests = await MosqueAttachmentRequest.find({ userId })
      .populate({
        path: "mosqueId",
        select: "name address",
      })
      .populate({
        path: "assignedImamId",
        select: "firstName lastName",
      })
      .sort({ createdAt: -1 });

    const formattedRequests = requests.map((request) => ({
      id: request._id,
      mosque: {
        id: request.mosqueId._id,
        name: request.mosqueId.name,
        address: request.mosqueId.address,
      },
      imam: {
        id: request.assignedImamId._id,
        name: `${request.assignedImamId.firstName} ${request.assignedImamId.lastName}`,
      },
      message: request.message,
      status: request.status,
      imamResponse: request.imamResponse,
      denialReason: request.denialReason,
      createdAt: request.createdAt,
      reviewedAt: request.reviewedAt,
    }));

    res.json(formattedRequests);
  } catch (err) {
    console.error("Get user attachment requests error:", err);
    res.status(500).json({
      message: "Server error while fetching user attachment requests",
    });
  }
};

// @desc    Update imam response for an approved request
// @route   PUT /api/mosque-attachments/:requestId/update-response
// @access  Private (Imam only)
exports.updateImamResponse = async (req, res) => {
  try {
    console.log("updateImamResponse called");
    console.log("Request params:", req.params);
    console.log("Request body:", req.body);
    console.log("User:", req.user);

    // Check if user is an imam
    if (req.user.role !== "imam") {
      console.log("User is not an imam, role:", req.user.role);
      return res.status(403).json({
        message: "Access denied. Imam only.",
      });
    }

    const { requestId } = req.params;
    const { imamResponse } = req.body;
    const imamId = req.user.id;

    console.log("Looking for request with ID:", requestId);
    console.log("New imam response:", imamResponse);

    // Find the request
    const request = await MosqueAttachmentRequest.findById(requestId);

    console.log("Found request:", request);

    if (!request) {
      console.log("Request not found");
      return res.status(404).json({
        message: "Verification request not found",
      });
    }

    // Check if imam is assigned to this request
    if (request.assignedImamId.toString() !== imamId) {
      console.log(
        "Imam not authorized. Request imam:",
        request.assignedImamId.toString(),
        "Current imam:",
        imamId
      );
      return res.status(403).json({
        message: "You are not authorized to update this request",
      });
    }

    console.log("Updating imam response...");

    // Update the imam response and status
    request.imamResponse = imamResponse;
    request.status = "approved";
    request.denialReason = null; // Clear denial reason when approving
    request.reviewedAt = new Date();
    await request.save();

    console.log("Response updated successfully");

    // Update user's verification status based on all their requests
    await updateUserVerificationStatus(request.userId);

    res.json({
      success: true,
      message: "Imam response updated successfully",
      request: {
        id: request._id,
        imamResponse: request.imamResponse,
      },
    });
  } catch (err) {
    console.error("Update imam response error:", err);
    res.status(500).json({
      message: "Server error while updating imam response",
    });
  }
};

// @desc    Update denial reason for a denied request
// @route   PUT /api/mosque-attachments/:requestId/update-denial
// @access  Private (Imam only)
exports.updateDenialReason = async (req, res) => {
  try {
    console.log("updateDenialReason called");
    console.log("Request params:", req.params);
    console.log("Request body:", req.body);
    console.log("User:", req.user);

    // Check if user is an imam
    if (req.user.role !== "imam") {
      console.log("User is not an imam, role:", req.user.role);
      return res.status(403).json({
        message: "Access denied. Imam only.",
      });
    }

    const { requestId } = req.params;
    const { denialReason } = req.body;
    const imamId = req.user.id;

    console.log("Looking for request with ID:", requestId);
    console.log("New denial reason:", denialReason);

    // Find the request
    const request = await MosqueAttachmentRequest.findById(requestId);

    console.log("Found request:", request);

    if (!request) {
      console.log("Request not found");
      return res.status(404).json({
        message: "Verification request not found",
      });
    }

    // Check if imam is assigned to this request
    if (request.assignedImamId.toString() !== imamId) {
      console.log(
        "Imam not authorized. Request imam:",
        request.assignedImamId.toString(),
        "Current imam:",
        imamId
      );
      return res.status(403).json({
        message: "You are not authorized to update this request",
      });
    }

    console.log("Updating denial reason...");

    // Update the denial reason and status
    request.denialReason = denialReason;
    request.status = "denied";
    request.imamResponse = null; // Clear approval response when denying
    request.reviewedAt = new Date();
    await request.save();

    console.log("Denial reason updated successfully");

    // Update user's verification status based on all their requests
    await updateUserVerificationStatus(request.userId);

    res.json({
      success: true,
      message: "Denial reason updated successfully",
      request: {
        id: request._id,
        denialReason: request.denialReason,
      },
    });
  } catch (err) {
    console.error("Update denial reason error:", err);
    res.status(500).json({
      message: "Server error while updating denial reason",
    });
  }
};

// @desc    Reset a request to pending status
// @route   PUT /api/mosque-attachments/:requestId/reset-to-pending
// @access  Private (Imam only)
exports.resetToPending = async (req, res) => {
  try {
    console.log("resetToPending called");
    console.log("Request params:", req.params);
    console.log("User:", req.user);

    // Check if user is an imam
    if (req.user.role !== "imam") {
      console.log("User is not an imam, role:", req.user.role);
      return res.status(403).json({
        message: "Access denied. Imam only.",
      });
    }

    const { requestId } = req.params;
    const imamId = req.user.id;

    console.log("Looking for request with ID:", requestId);

    // Find the request
    const request = await MosqueAttachmentRequest.findById(requestId);

    console.log("Found request:", request);

    if (!request) {
      console.log("Request not found");
      return res.status(404).json({
        message: "Verification request not found",
      });
    }

    // Check if imam is assigned to this request
    if (request.assignedImamId.toString() !== imamId) {
      console.log(
        "Imam not authorized. Request imam:",
        request.assignedImamId.toString(),
        "Current imam:",
        imamId
      );
      return res.status(403).json({
        message: "You are not authorized to update this request",
      });
    }

    // Check if request is already pending
    if (request.status === "pending") {
      console.log("Request is already pending");
      return res.status(400).json({
        message: "Request is already in pending status",
      });
    }

    console.log("Resetting request to pending...");

    // Reset the request to pending status
    request.status = "pending";
    request.imamResponse = null;
    request.denialReason = null;
    request.reviewedAt = null;
    await request.save();

    console.log("Request reset to pending successfully");

    // Update user's verification status based on all their requests
    await updateUserVerificationStatus(request.userId);

    res.json({
      success: true,
      message: "Request reset to pending status successfully",
      request: {
        id: request._id,
        status: request.status,
      },
    });
  } catch (err) {
    console.error("Reset to pending error:", err);
    res.status(500).json({
      message: "Server error while resetting request to pending",
    });
  }
};

// Helper function to update user's verification status based on all their requests
const updateUserVerificationStatus = async (userId) => {
  try {
    // Get all mosque attachment requests for this user
    const userRequests = await MosqueAttachmentRequest.find({ userId });

    // Check if user has any approved requests
    const hasApprovedRequest = userRequests.some(
      (request) => request.status === "approved"
    );

    // Update user's verification status
    const user = await User.findById(userId);
    if (user) {
      user.isVerified = hasApprovedRequest;
      await user.save();
      console.log(
        `User ${userId} verification status updated to: ${hasApprovedRequest}`
      );
    }

    return hasApprovedRequest;
  } catch (error) {
    console.error("Error updating user verification status:", error);
    throw error;
  }
};
