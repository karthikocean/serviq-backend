import { Response } from "express";
import { AuthRequest } from "../../middleware/authMiddleware";
import mongoose from "mongoose";
import { StatusCodes } from "http-status-codes";
import { sendSuccess, sendError } from "../../utils/response";
import Branch from "../../models/Branch";
import User from "../../models/User";
import Subscription from "../../models/Subscription";
import Role from "../../models/Role";
import Table from "../../models/Table";

export const createBranch = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user as any;
    if (!user || user.userType !== 'RESTAURANT_OWNER') {
      sendError(res, "Only Restaurant Owners can create branches.", StatusCodes.FORBIDDEN);
      return;
    }

    const restaurantId = user.restaurantId;

    const { 
        branchName, branchCode, branchOpeningDate, contactNumber, email, 
        street, city, state, country, pincode, 
        managerName, managerMobile, managerEmail, managerPassword,
        status, isMainBranch
    } = req.body;

    // Validate Required Fields
    if (!branchName || !branchCode || !contactNumber || !street || !city || !state || !country || !pincode || !managerName || !managerMobile || !managerPassword) {
      sendError(res, "All required fields must be provided.", StatusCodes.BAD_REQUEST);
      return;
    }

    // Validate Subscription
    const subscription = await Subscription.findOne({ restaurant: restaurantId, status: "Active" });
    if (!subscription) {
      sendError(res, "No active subscription found for this restaurant.", StatusCodes.FORBIDDEN);
      return;
    }

    if (!subscription.maxBranches) {
      sendError(res, "Invalid subscription plan configuration.", StatusCodes.INTERNAL_SERVER_ERROR);
      return;
    }

    const existingBranchCount = await Branch.countDocuments({ restaurantId, isDelete: false });
    const totalAllowedBranches = subscription.maxBranches + (subscription.extraBranches || 0);

    if (existingBranchCount >= totalAllowedBranches) {
      sendError(res, "Plan limit exceeded. Please purchase an extra branch add-on or upgrade your plan.", StatusCodes.FORBIDDEN);
      return;
    }

    // Check if phone/email already exists for user globally
    const existingUserQuery: any[] = [{ phoneNumber: managerMobile }];
    if (managerEmail) {
      existingUserQuery.push({ email: managerEmail });
    }

    const existingUser = await User.findOne({ $or: existingUserQuery });

    if (existingUser) {
      sendError(res, "A user with this email or mobile number already exists.", StatusCodes.CONFLICT);
      return;
    }

    // Check branch code uniqueness globally or per restaurant
    const existingBranch = await Branch.findOne({ branchCode });
    if (existingBranch) {
      sendError(res, "Branch code already exists.", StatusCodes.CONFLICT);
      return;
    }

    // Handle isMainBranch logic
    if (isMainBranch === true) {
      await Branch.updateMany({ restaurantId }, { $set: { isMainBranch: false } });
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
      status: status || 'Active',
      isActive: status !== 'Inactive',
      isMainBranch: isMainBranch === true
    });
    
    await newBranch.save();

    let newManager;
    try {
      // Find or Create 'Branch Manager' Role
      let branchManagerRole = await Role.findOne({ restaurantId, roleName: 'Branch Manager', isDelete: false });
      
      if (!branchManagerRole) {
        const defaultManagerPermissions = {
          dashboard: { view: true, add: false, edit: false, delete: false },
          menu: { view: true, add: true, edit: true, delete: true },
          tables: { view: true, add: true, edit: true, delete: true },
          orders: { view: true, add: true, edit: true, delete: true },
          staff_management: { view: true, add: true, edit: true, delete: true },
          reports_analytics: { view: true, add: false, edit: false, delete: false },
          user_accounts: { view: true, add: true, edit: true, delete: true },
          settings: { view: true, add: true, edit: true, delete: false },
          'waiter-list': { view: true, add: true, edit: true, delete: true },
          'kitchen-list': { view: true, add: true, edit: true, delete: true },
          'qr-code-config': { view: true, add: true, edit: true, delete: true },
          // NO access to: branch_management, plans_subscription, billing_payments, roles_permissions
        };

        branchManagerRole = new Role({
          restaurantId,
          type: "RESTAURANT",
          roleName: 'Branch Manager',
          roleType: 'BRANCH_MANAGER',
          permissions: defaultManagerPermissions,
          isDefault: false,
          isActive: true
        });
        await branchManagerRole.save();
      }

      // Create User (Branch Manager)
      newManager = new User({
        name: managerName,
        email: managerEmail,
        phoneNumber: managerMobile,
        password: managerPassword,
        userType: 'BRANCH_ADMIN',
        restaurantId,
        branchId: newBranch._id,
        roleId: branchManagerRole._id,
        isActive: true
      });

      await newManager.save();
    } catch (error) {
      // Manual rollback
      await Branch.findByIdAndDelete(newBranch._id);
      throw error;
    }

    sendSuccess(res, "Branch and Manager created successfully.", { branch: newBranch, manager: { id: newManager._id, name: newManager.name, email: newManager.email } }, StatusCodes.CREATED);
  } catch (error) {
    console.error("Error creating branch:", error);
    sendError(res, "Internal server error.", StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export const getAllBranches = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user as any;
    if (!user || (user.userType !== 'RESTAURANT_OWNER' && user.userType !== 'BRANCH_ADMIN')) {
      sendError(res, "Not authorized to view branches.", StatusCodes.FORBIDDEN);
      return;
    }
    
    let query: any = { restaurantId: user.restaurantId, isDelete: false };
    if (user.userType === 'BRANCH_ADMIN' || user.userType === 'STAFF') {
        if (user.branchId && user.branchId !== 'ALL') {
            query._id = user.branchId;
        }
    }
    
    const branches = await Branch.find(query).lean();
    
    // Attach manager details and table count for each branch
    const branchesWithManagers = await Promise.all(branches.map(async (branch) => {
        const manager = await User.findOne({ branchId: branch._id, userType: 'BRANCH_ADMIN', isDelete: false }).select("name email phoneNumber");
        const totalTables = await Table.countDocuments({ branchId: branch._id, isDelete: false });
        
        return {
            ...branch,
            managerName: manager?.name || '',
            managerEmail: manager?.email || '',
            managerMobile: manager?.phoneNumber || '',
            totalTables
        };
    }));

    sendSuccess(res, "Branches retrieved successfully.", branchesWithManagers, StatusCodes.OK);
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
    const branch = await Branch.findOne({ _id: req.params.id, restaurantId: user.restaurantId, isDelete: false }).lean();
    if (!branch) {
      sendError(res, "Branch not found.", StatusCodes.NOT_FOUND);
      return;
    }
    
    const manager = await User.findOne({ branchId: branch._id, userType: 'BRANCH_ADMIN', isDelete: false }).select("name email phoneNumber");
    const totalTables = await Table.countDocuments({ branchId: branch._id, isDelete: false });
    
    const branchWithManager = {
        ...branch,
        managerName: manager?.name || '',
        managerEmail: manager?.email || '',
        managerMobile: manager?.phoneNumber || '',
        totalTables
    };

    sendSuccess(res, "Branch details retrieved successfully.", branchWithManager, StatusCodes.OK);
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
        status, isMainBranch,
        managerName, managerMobile, managerEmail
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
        branch.status = status;
        branch.isActive = status !== 'Inactive';
    }

    if (isMainBranch !== undefined) {
        if (isMainBranch === true) {
            await Branch.updateMany({ restaurantId: user.restaurantId }, { $set: { isMainBranch: false } });
        }
        branch.isMainBranch = isMainBranch;
    }

    await branch.save();

    // Update Manager Details
    if (managerName || managerMobile || managerEmail) {
        const manager = await User.findOne({ branchId: branch._id, userType: 'BRANCH_ADMIN', isDelete: false });
        if (manager) {
            if (managerName) manager.name = managerName;
            if (managerMobile) manager.phoneNumber = managerMobile;
            if (managerEmail) manager.email = managerEmail;
            await manager.save();
        }
    }

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
