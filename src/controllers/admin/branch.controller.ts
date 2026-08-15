import { Response } from "express";
import { AuthRequest } from "../../middleware/authMiddleware";
import mongoose from "mongoose";
import { StatusCodes } from "http-status-codes";
import { sendSuccess, sendError } from "../../utils/response";
import Branch from "../../models/Branch";
import User from "../../models/User";
import Subscription from "../../models/Subscription";

export const createBranch = async (req: AuthRequest, res: Response): Promise<void> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const user = req.user as any;
    if (!user || user.userType !== 'RESTAURANT_OWNER') {
      await session.abortTransaction();
      session.endSession();
      sendError(res, "Only Restaurant Owners can create branches.", StatusCodes.FORBIDDEN);
      return;
    }

    const restaurantId = user.restaurantId;

    const { 
        branchName, branchCode, branchOpeningDate, contactNumber, email, 
        street, city, state, country, pincode, 
        managerName, managerMobile, managerEmail, managerPassword,
        status 
    } = req.body;

    // Validate Required Fields
    if (!branchName || !branchCode || !contactNumber || !street || !city || !state || !country || !pincode || !managerName || !managerMobile || !managerPassword) {
      await session.abortTransaction();
      session.endSession();
      sendError(res, "All required fields must be provided.", StatusCodes.BAD_REQUEST);
      return;
    }

    // Validate Subscription
    const subscription = await Subscription.findOne({ restaurant: restaurantId, status: "Active" }).session(session);
    if (!subscription) {
      await session.abortTransaction();
      session.endSession();
      sendError(res, "No active subscription found for this restaurant.", StatusCodes.FORBIDDEN);
      return;
    }

    if (!subscription.maxBranches) {
      await session.abortTransaction();
      session.endSession();
      sendError(res, "Invalid subscription plan configuration.", StatusCodes.INTERNAL_SERVER_ERROR);
      return;
    }

    const existingBranchCount = await Branch.countDocuments({ restaurantId, isDelete: false }).session(session);

    if (existingBranchCount >= subscription.maxBranches) {
      await session.abortTransaction();
      session.endSession();
      sendError(res, "Maximum branch limit reached based on your active plan.", StatusCodes.FORBIDDEN);
      return;
    }

    // Check if phone/email already exists for user globally
    const existingUserQuery: any[] = [{ phoneNumber: managerMobile }];
    if (managerEmail) {
      existingUserQuery.push({ email: managerEmail });
    }

    const existingUser = await User.findOne({ $or: existingUserQuery }).session(session);

    if (existingUser) {
      await session.abortTransaction();
      session.endSession();
      sendError(res, "A user with this email or mobile number already exists.", StatusCodes.CONFLICT);
      return;
    }

    // Check branch code uniqueness globally or per restaurant
    const existingBranch = await Branch.findOne({ branchCode }).session(session);
    if (existingBranch) {
      await session.abortTransaction();
      session.endSession();
      sendError(res, "Branch code already exists.", StatusCodes.CONFLICT);
      return;
    }

    // Create Branch
    const newBranch = new Branch({
      restaurantId,
      branchName,
      branchCode,
      branchOpeningDate,
      contactNumber,
      email,
      address: {
        street,
        city,
        state,
        country,
        pincode
      },
      isActive: status !== 'Inactive',
      isMainBranch: existingBranchCount === 0 // First branch becomes main automatically
    });
    
    await newBranch.save({ session });

    // Create User (Branch Manager)
    const newManager = new User({
      name: managerName,
      email: managerEmail,
      phoneNumber: managerMobile,
      password: managerPassword,
      userType: 'BRANCH_ADMIN',
      restaurantId,
      branchId: newBranch._id,
      isActive: true
    });

    await newManager.save({ session });

    await session.commitTransaction();
    session.endSession();

    sendSuccess(res, "Branch and Manager created successfully.", { branch: newBranch, manager: { id: newManager._id, name: newManager.name, email: newManager.email } }, StatusCodes.CREATED);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error creating branch:", error);
    sendError(res, "Internal server error.", StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export const getAllBranches = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user as any;
    if (!user || user.userType !== 'RESTAURANT_OWNER') {
      sendError(res, "Only Restaurant Owners can view branches.", StatusCodes.FORBIDDEN);
      return;
    }
    const branches = await Branch.find({ restaurantId: user.restaurantId, isDelete: false });
    sendSuccess(res, "Branches retrieved successfully.", branches, StatusCodes.OK);
  } catch (error) {
    console.error("Error fetching branches:", error);
    sendError(res, "Internal server error.", StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export const getBranchById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user as any;
    if (!user || user.userType !== 'RESTAURANT_OWNER') {
      sendError(res, "Only Restaurant Owners can view branches.", StatusCodes.FORBIDDEN);
      return;
    }
    const branch = await Branch.findOne({ _id: req.params.id, restaurantId: user.restaurantId, isDelete: false });
    if (!branch) {
      sendError(res, "Branch not found.", StatusCodes.NOT_FOUND);
      return;
    }
    
    const manager = await User.findOne({ branchId: branch._id, userType: 'BRANCH_ADMIN', isDelete: false }).select("-password");
    
    sendSuccess(res, "Branch details retrieved successfully.", { branch, manager }, StatusCodes.OK);
  } catch (error) {
    console.error("Error fetching branch details:", error);
    sendError(res, "Internal server error.", StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export const updateBranch = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user as any;
    if (!user || user.userType !== 'RESTAURANT_OWNER') {
      sendError(res, "Only Restaurant Owners can update branches.", StatusCodes.FORBIDDEN);
      return;
    }

    const { 
        branchName, branchCode, branchOpeningDate, contactNumber, email, 
        street, city, state, country, pincode, 
        status 
    } = req.body;

    const branch = await Branch.findOne({ _id: req.params.id, restaurantId: user.restaurantId, isDelete: false });
    if (!branch) {
      sendError(res, "Branch not found.", StatusCodes.NOT_FOUND);
      return;
    }

    if (branchCode && branchCode !== branch.branchCode) {
        const existingBranch = await Branch.findOne({ branchCode });
        if (existingBranch) {
            sendError(res, "Branch code already exists.", StatusCodes.CONFLICT);
            return;
        }
    }

    branch.branchName = branchName || branch.branchName;
    branch.branchCode = branchCode || branch.branchCode;
    branch.branchOpeningDate = branchOpeningDate !== undefined ? branchOpeningDate : branch.branchOpeningDate;
    branch.contactNumber = contactNumber || branch.contactNumber;
    branch.email = email !== undefined ? email : branch.email;
    
    if (street || city || state || country || pincode) {
        branch.address.street = street || branch.address.street;
        branch.address.city = city || branch.address.city;
        branch.address.state = state || branch.address.state;
        branch.address.country = country || branch.address.country;
        branch.address.pincode = pincode || branch.address.pincode;
    }
    
    if (status) {
        branch.isActive = status !== 'Inactive';
    }

    await branch.save();
    sendSuccess(res, "Branch updated successfully.", branch, StatusCodes.OK);
  } catch (error) {
    console.error("Error updating branch:", error);
    sendError(res, "Internal server error.", StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export const deleteBranch = async (req: AuthRequest, res: Response): Promise<void> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const user = req.user as any;
    if (!user || user.userType !== 'RESTAURANT_OWNER') {
      await session.abortTransaction();
      session.endSession();
      sendError(res, "Only Restaurant Owners can delete branches.", StatusCodes.FORBIDDEN);
      return;
    }

    const branch = await Branch.findOne({ _id: req.params.id, restaurantId: user.restaurantId, isDelete: false }).session(session);
    if (!branch) {
      await session.abortTransaction();
      session.endSession();
      sendError(res, "Branch not found.", StatusCodes.NOT_FOUND);
      return;
    }

    branch.isDelete = true;
    branch.isActive = false;
    await branch.save({ session });

    // Deactivate associated users
    await User.updateMany(
        { branchId: branch._id, isDelete: false },
        { $set: { isDelete: true, isActive: false } },
        { session }
    );

    await session.commitTransaction();
    session.endSession();

    sendSuccess(res, "Branch deleted successfully.", null, StatusCodes.OK);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error deleting branch:", error);
    sendError(res, "Internal server error.", StatusCodes.INTERNAL_SERVER_ERROR);
  }
};
