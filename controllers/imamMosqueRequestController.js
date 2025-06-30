const ImamMosqueRequest = require("../models/ImamMosqueRequest");
const User = require("../models/User");
const Mosque = require("../models/Mosque");

// @desc    Create a new imam mosque request
// @route   POST /api/imam-mosque-requests/request
// @access  Private (Imam)
const createImamMosqueRequest = async (req, res) => {
  try {
    const { mosqueIds, message } = req.body;
    const imamId = req.user.id;

    console.log("Received request:", { mosqueIds, message, imamId });

    if (!mosqueIds || !Array.isArray(mosqueIds) || mosqueIds.length === 0) {
      return res.status(400).json({
        message: "Please provide at least one mosque ID",
      });
    }

    const requests = [];
    const errors = [];

    for (const mosqueId of mosqueIds) {
      try {
        console.log(
          `Processing mosque ID: ${mosqueId} (type: ${typeof mosqueId})`
        );

        // Try to find mosque by externalId first (for numeric IDs from frontend)
        let mosque = await Mosque.findOne({ externalId: mosqueId });

        // If not found by externalId, try by _id (for MongoDB ObjectIds)
        if (!mosque) {
          mosque = await Mosque.findById(mosqueId);
        }

        if (!mosque) {
          console.log(`Mosque not found for ID: ${mosqueId}`);
          errors.push(`Mosque with ID ${mosqueId} not found`);
          continue;
        }

        console.log(
          `Found mosque: ${mosque.name} (ID: ${mosque._id}, externalId: ${mosque.externalId})`
        );

        // Check if request already exists
        const existingRequest = await ImamMosqueRequest.findOne({
          imamId,
          mosqueId: mosque._id, // Use the actual MongoDB _id for the request
        });

        if (existingRequest) {
          errors.push(`Request for mosque ${mosque.name} already exists`);
          continue;
        }

        // Check if imam is already assigned to this mosque
        const imam = await User.findById(imamId);
        const isAlreadyAssigned = imam.assignedMosques?.some(
          (m) =>
            m.id === mosque._id.toString() ||
            m._id?.toString() === mosque._id.toString()
        );

        if (isAlreadyAssigned) {
          errors.push(`You are already assigned to mosque ${mosque.name}`);
          continue;
        }

        // Create the request using the mosque's MongoDB _id
        const request = new ImamMosqueRequest({
          imamId,
          mosqueId: mosque._id, // Use the actual MongoDB _id
          message: message || "Request to serve as imam at this mosque",
        });

        await request.save();
        requests.push(request);
        console.log(`Created request for mosque: ${mosque.name}`);
      } catch (error) {
        console.error(`Error processing mosque ${mosqueId}:`, error);
        errors.push(`Error processing mosque ${mosqueId}: ${error.message}`);
      }
    }

    if (requests.length === 0) {
      return res.status(400).json({
        message: "No requests were created",
        errors,
      });
    }

    res.status(201).json({
      message: `${requests.length} request(s) created successfully`,
      requests: requests.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Error creating imam mosque request:", error);
    res.status(500).json({
      message: "Server error",
    });
  }
};

// @desc    Get all imam mosque requests (for superadmin)
// @route   GET /api/imam-mosque-requests
// @access  Private (Superadmin)
const getImamMosqueRequests = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};

    if (status && ["pending", "approved", "denied"].includes(status)) {
      filter.status = status;
    }

    const requests = await ImamMosqueRequest.find(filter)
      .populate("imamId", "firstName lastName email phone")
      .populate("mosqueId", "name address externalId")
      .populate("reviewedBy", "firstName lastName")
      .sort({ createdAt: -1 });

    // Add virtual name field to imam data
    const requestsWithFormattedNames = requests.map((request) => {
      const requestObj = request.toObject();
      if (requestObj.imamId) {
        requestObj.imamId.name = `${requestObj.imamId.firstName || ""} ${
          requestObj.imamId.lastName || ""
        }`.trim();
      }
      if (requestObj.reviewedBy) {
        requestObj.reviewedBy.name = `${
          requestObj.reviewedBy.firstName || ""
        } ${requestObj.reviewedBy.lastName || ""}`.trim();
      }
      return requestObj;
    });

    console.log(
      "Imam mosque requests with populated data:",
      JSON.stringify(requestsWithFormattedNames, null, 2)
    );

    res.json(requestsWithFormattedNames);
  } catch (error) {
    console.error("Error getting imam mosque requests:", error);
    res.status(500).json({
      message: "Server error",
    });
  }
};

// @desc    Get imam's own requests
// @route   GET /api/imam-mosque-requests/my-requests
// @access  Private (Imam)
const getImamRequestsByImam = async (req, res) => {
  try {
    const imamId = req.user.id;

    const requests = await ImamMosqueRequest.find({ imamId })
      .populate("mosqueId", "name address externalId")
      .populate("reviewedBy", "firstName lastName")
      .sort({ createdAt: -1 });

    // Add virtual name field to reviewedBy data
    const requestsWithFormattedNames = requests.map((request) => {
      const requestObj = request.toObject();
      if (requestObj.reviewedBy) {
        requestObj.reviewedBy.name = `${
          requestObj.reviewedBy.firstName || ""
        } ${requestObj.reviewedBy.lastName || ""}`.trim();
      }
      return requestObj;
    });

    res.json(requestsWithFormattedNames);
  } catch (error) {
    console.error("Error getting imam's requests:", error);
    res.status(500).json({
      message: "Server error",
    });
  }
};

// @desc    Approve an imam mosque request
// @route   POST /api/imam-mosque-requests/:requestId/approve
// @access  Private (Superadmin)
const approveImamMosqueRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { superadminResponse } = req.body;
    const superadminId = req.user.id;

    const request = await ImamMosqueRequest.findById(requestId)
      .populate("imamId")
      .populate("mosqueId");

    if (!request) {
      return res.status(404).json({
        message: "Request not found",
      });
    }

    if (request.status !== "pending") {
      return res.status(400).json({
        message: "Request has already been processed",
      });
    }

    // Update the request
    request.status = "approved";
    request.reviewedBy = superadminId;
    request.superadminResponse = superadminResponse;
    request.reviewedAt = new Date();

    await request.save();

    // Add mosque to imam's assigned mosques
    const imam = await User.findById(request.imamId._id);
    if (imam) {
      const mosqueData = {
        id: request.mosqueId._id,
        name: request.mosqueId.name,
        address: request.mosqueId.address,
        isDefault: false, // New assignments are not default
      };

      if (!imam.assignedMosques) {
        imam.assignedMosques = [];
      }

      // Check if mosque is already assigned
      const isAlreadyAssigned = imam.assignedMosques.some(
        (m) => m.id === request.mosqueId._id.toString()
      );

      if (!isAlreadyAssigned) {
        imam.assignedMosques.push(mosqueData);
        await imam.save();
      }
    }

    // Fetch the updated request with proper population
    const updatedRequest = await ImamMosqueRequest.findById(requestId)
      .populate("imamId", "firstName lastName email phone")
      .populate("mosqueId", "name address externalId")
      .populate("reviewedBy", "firstName lastName");

    // Add virtual name field to imam data
    const requestObj = updatedRequest.toObject();
    if (requestObj.imamId) {
      requestObj.imamId.name = `${requestObj.imamId.firstName || ""} ${
        requestObj.imamId.lastName || ""
      }`.trim();
    }
    if (requestObj.reviewedBy) {
      requestObj.reviewedBy.name = `${requestObj.reviewedBy.firstName || ""} ${
        requestObj.reviewedBy.lastName || ""
      }`.trim();
    }

    res.json({
      message: "Request approved successfully",
      request: requestObj,
    });
  } catch (error) {
    console.error("Error approving imam mosque request:", error);
    res.status(500).json({
      message: "Server error",
    });
  }
};

// @desc    Deny an imam mosque request
// @route   POST /api/imam-mosque-requests/:requestId/deny
// @access  Private (Superadmin)
const denyImamMosqueRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { denialReason } = req.body;
    const superadminId = req.user.id;

    if (!denialReason || denialReason.trim() === "") {
      return res.status(400).json({
        message: "Denial reason is required",
      });
    }

    const request = await ImamMosqueRequest.findById(requestId)
      .populate("imamId")
      .populate("mosqueId");

    if (!request) {
      return res.status(404).json({
        message: "Request not found",
      });
    }

    if (request.status !== "pending") {
      return res.status(400).json({
        message: "Request has already been processed",
      });
    }

    // Update the request
    request.status = "denied";
    request.reviewedBy = superadminId;
    request.denialReason = denialReason.trim();
    request.reviewedAt = new Date();

    await request.save();

    // Fetch the updated request with proper population
    const updatedRequest = await ImamMosqueRequest.findById(requestId)
      .populate("imamId", "firstName lastName email phone")
      .populate("mosqueId", "name address externalId")
      .populate("reviewedBy", "firstName lastName");

    // Add virtual name field to imam data
    const requestObj = updatedRequest.toObject();
    if (requestObj.imamId) {
      requestObj.imamId.name = `${requestObj.imamId.firstName || ""} ${
        requestObj.imamId.lastName || ""
      }`.trim();
    }
    if (requestObj.reviewedBy) {
      requestObj.reviewedBy.name = `${requestObj.reviewedBy.firstName || ""} ${
        requestObj.reviewedBy.lastName || ""
      }`.trim();
    }

    res.json({
      message: "Request denied successfully",
      request: requestObj,
    });
  } catch (error) {
    console.error("Error denying imam mosque request:", error);
    res.status(500).json({
      message: "Server error",
    });
  }
};

// @desc    Update an imam mosque request status
// @route   PUT /api/imam-mosque-requests/:requestId
// @access  Private (Superadmin)
const updateImamMosqueRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { status, superadminResponse, denialReason } = req.body;
    const superadminId = req.user.id;

    const request = await ImamMosqueRequest.findById(requestId)
      .populate("imamId")
      .populate("mosqueId");

    if (!request) {
      return res.status(404).json({
        message: "Request not found",
      });
    }

    // Validate status
    if (!["pending", "approved", "denied"].includes(status)) {
      return res.status(400).json({
        message: "Invalid status. Must be pending, approved, or denied",
      });
    }

    // Validate required fields based on status
    if (status === "denied" && (!denialReason || denialReason.trim() === "")) {
      return res.status(400).json({
        message: "Denial reason is required when status is denied",
      });
    }

    // Store previous status for mosque assignment logic
    const previousStatus = request.status;

    // Update the request
    request.status = status;
    request.reviewedBy = superadminId;
    request.reviewedAt = new Date();

    if (status === "approved") {
      request.superadminResponse =
        superadminResponse || "Request approved by superadmin";
      request.denialReason = undefined; // Clear denial reason if it was denied before
    } else if (status === "denied") {
      request.denialReason = denialReason.trim();
      request.superadminResponse = undefined; // Clear approval response if it was approved before
    } else {
      // Reset to pending
      request.superadminResponse = undefined;
      request.denialReason = undefined;
      request.reviewedBy = undefined;
      request.reviewedAt = undefined;
    }

    await request.save();

    // Handle mosque assignment logic
    const imam = await User.findById(request.imamId._id);
    if (imam && status === "approved") {
      const mosqueData = {
        id: request.mosqueId._id,
        name: request.mosqueId.name,
        address: request.mosqueId.address,
        isDefault: false,
      };

      if (!imam.assignedMosques) {
        imam.assignedMosques = [];
      }

      // Check if mosque is already assigned
      const isAlreadyAssigned = imam.assignedMosques.some(
        (m) => m.id === request.mosqueId._id.toString()
      );

      if (!isAlreadyAssigned) {
        imam.assignedMosques.push(mosqueData);
        await imam.save();
      }
    } else if (imam && previousStatus === "approved" && status !== "approved") {
      // Remove mosque from assigned mosques if status changed from approved to something else
      if (imam.assignedMosques) {
        imam.assignedMosques = imam.assignedMosques.filter(
          (m) => m.id !== request.mosqueId._id.toString()
        );
        await imam.save();
      }
    }

    // Fetch the updated request with proper population
    const updatedRequest = await ImamMosqueRequest.findById(requestId)
      .populate("imamId", "firstName lastName email phone")
      .populate("mosqueId", "name address externalId")
      .populate("reviewedBy", "firstName lastName");

    // Add virtual name field to imam data
    const requestObj = updatedRequest.toObject();
    if (requestObj.imamId) {
      requestObj.imamId.name = `${requestObj.imamId.firstName || ""} ${
        requestObj.imamId.lastName || ""
      }`.trim();
    }
    if (requestObj.reviewedBy) {
      requestObj.reviewedBy.name = `${requestObj.reviewedBy.firstName || ""} ${
        requestObj.reviewedBy.lastName || ""
      }`.trim();
    }

    res.json({
      message: `Request ${status} successfully`,
      request: requestObj,
    });
  } catch (error) {
    console.error("Error updating imam mosque request:", error);
    res.status(500).json({
      message: "Server error",
    });
  }
};

module.exports = {
  createImamMosqueRequest,
  getImamMosqueRequests,
  approveImamMosqueRequest,
  denyImamMosqueRequest,
  updateImamMosqueRequest,
  getImamRequestsByImam,
};
