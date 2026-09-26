import { Response } from "express";
import { AuthRequest } from "../../middleware/authMiddleware";
import mongoose from "mongoose";
import { StatusCodes } from "http-status-codes";
import { sendSuccess, sendError } from "../../utils/response";
import { pagination } from "../../utils/pagination";
import Branch from "../../models/Branch";
import User from "../../models/User";
import Admin from "../../models/Admin";
import Subscription from "../../models/Subscription";
import AdminRole from "../../models/AdminRole";
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
        status, isMainBranch, branchType, gstinNumber, fssaiLicense
    } = req.body;

    // Validate Required Fields
    if (!branchName || !branchCode || !contactNumber || !street || !city || !state || !country || !pincode || !managerName || !managerMobile || !managerPassword) {
      sendError(res, "All required fields must be provided.", StatusCodes.BAD_REQUEST);
      return;
    }

    // Validate FSSAI License if provided
    const fssaiLicenseRegex = /^1\d{13}$/;
    if (fssaiLicense && !fssaiLicenseRegex.test(fssaiLicense.trim())) {
      sendError(
        res,
        "Invalid FSSAI License number. It must contain exactly 14 digits and start with 1.",
        StatusCodes.BAD_REQUEST
      );
      return;
    }

    // Validate GSTIN if provided
    const normalizedGstin = gstinNumber ? gstinNumber.trim().toUpperCase() : undefined;
    if (normalizedGstin) {
      const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
      if (!gstinRegex.test(normalizedGstin)) {
        sendError(res, "Invalid GSTIN. Please enter a valid 15-character GSTIN.", StatusCodes.BAD_REQUEST);
        return;
      }
    }

    // Validate Subscription
    const subscription = await Subscription.findOne({ restaurant: restaurantId, $or: [{ status: "Active" }, { isActive: true }], isDelete: false }).sort({ createdAt: -1 });
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
    const existingAdmin = await Admin.findOne({ $or: existingUserQuery });

    if (existingUser || existingAdmin) {
      sendError(res, "A user with this email or mobile number already exists.", StatusCodes.CONFLICT);
      return;
    }

    // Check branch code uniqueness globally or per restaurant
    const existingBranch = await Branch.findOne({ branchCode });
    if (existingBranch) {
      sendError(res, "Branch code already exists.", StatusCodes.CONFLICT);
      return;
    }

    // Determine Main Branch status
    let isMain = false;
    if (branchType === 'MAIN' || isMainBranch === true) {
      isMain = true;
    } else if (branchType === 'SUB' || isMainBranch === false) {
      isMain = false;
    } else if (existingBranchCount === 0) {
      // First branch defaults to MAIN branch if not specified
      isMain = true;
    }

    if (isMain) {
      await Branch.updateMany({ restaurantId }, { $set: { isMainBranch: false, branchType: 'SUB' } });
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
      gstinNumber: normalizedGstin || gstinNumber,
      fssaiLicense: fssaiLicense ? fssaiLicense.trim() : undefined,
      status: status || 'Active',
      isActive: status !== 'Inactive',
      isMainBranch: isMain,
      branchType: isMain ? 'MAIN' : 'SUB'
    });
    
    await newBranch.save();

    let newManager;
    try {
      // Find or Create 'Branch Manager' Role
      let branchManagerRole = await AdminRole.findOne({ restaurantId, roleName: 'Branch Manager', isDelete: false });
      
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
        };

        branchManagerRole = new AdminRole({
          restaurantId,
          roleName: 'Branch Manager',
          roleType: 'BRANCH_MANAGER',
          permissions: defaultManagerPermissions,
          isDefault: false,
          isActive: true
        });
        await branchManagerRole.save();
      }

      // Create Admin (Branch Manager)
      newManager = new Admin({
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
    } catch (error: any) {
      // Manual rollback
      await Branch.findByIdAndDelete(newBranch._id);
      throw error;
    }

    sendSuccess(res, "Branch and Manager created successfully.", { branch: newBranch, manager: { id: newManager._id, name: newManager.name, email: newManager.email } }, StatusCodes.CREATED);
  } catch (error: any) {
    console.error("Error creating branch:", error);
    sendError(res, error?.message || "Internal server error.", error?.message ? StatusCodes.BAD_REQUEST : StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

const getManagerForBranch = async (branchId: any) => {
  let manager = await Admin.findOne({ branchId, userType: 'BRANCH_ADMIN', isDelete: false }).select("name email phoneNumber");
  if (!manager) {
    manager = await Admin.findOne({ branchId, userType: { $ne: 'RESTAURANT_OWNER' }, isDelete: false }).select("name email phoneNumber");
  }
  if (!manager) {
    manager = await User.findOne({ branchId, userType: 'BRANCH_ADMIN', isDelete: false }).select("name email phoneNumber") as any;
  }
  if (!manager) {
    manager = await User.findOne({ branchId, isDelete: false }).select("name email phoneNumber") as any;
  }
  return manager;
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
    
    const page = parseInt(req.query.page as string) || 0;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string | undefined;

    if (search) {
      query.$or = [
        { branchName: { $regex: search, $options: "i" } },
        { branchCode: { $regex: search, $options: "i" } },
      ];
    }

    const pageIndex = Math.max(0, page);
    const skip = pageIndex * limit;

    const total = await Branch.countDocuments(query);
    const branches = await Branch.find(query).populate('restaurantId').skip(skip).limit(limit).lean();
    
    const branchesWithManagers = await Promise.all(branches.map(async (branch) => {
        const manager = await getManagerForBranch(branch._id);
        const totalTables = await Table.countDocuments({ branchId: branch._id, isDelete: false });
        
        return {
            ...branch,
            managerName: manager?.name || '',
            managerEmail: manager?.email || '',
            managerMobile: manager?.phoneNumber || '',
            totalTables
        };
    }));

    pagination(total, branchesWithManagers, limit, pageIndex, res, "Branches retrieved successfully.");
  } catch (error: any) {
    console.error("Error fetching branches:", error);
    sendError(res, error?.message || "Internal server error.", error?.message ? StatusCodes.BAD_REQUEST : StatusCodes.INTERNAL_SERVER_ERROR);
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
    
    const manager = await getManagerForBranch(branch._id);
    const totalTables = await Table.countDocuments({ branchId: branch._id, isDelete: false });
    
    const branchWithManager = {
        ...branch,
        managerName: manager?.name || '',
        managerEmail: manager?.email || '',
        managerMobile: manager?.phoneNumber || '',
        totalTables
    };

    sendSuccess(res, "Branch details retrieved successfully.", branchWithManager, StatusCodes.OK);
  } catch (error: any) {
    console.error("Error fetching branch details:", error);
    sendError(res, error?.message || "Internal server error.", error?.message ? StatusCodes.BAD_REQUEST : StatusCodes.INTERNAL_SERVER_ERROR);
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
        status, isMainBranch, branchType, gstinNumber, fssaiLicense,
        managerName, managerMobile, managerEmail
    } = req.body;

    const branch = await Branch.findOne({ _id: req.params.id, restaurantId: user.restaurantId, isDelete: false });
    if (!branch) {
      sendError(res, "Branch not found.", StatusCodes.NOT_FOUND);
      return;
    }

    if (fssaiLicense !== undefined) {
      const fssaiLicenseRegex = /^1\d{13}$/;
      if (fssaiLicense && !fssaiLicenseRegex.test(fssaiLicense.trim())) {
        sendError(
          res,
          "Invalid FSSAI License number. It must contain exactly 14 digits and start with 1.",
          StatusCodes.BAD_REQUEST
        );
        return;
      }
      branch.fssaiLicense = fssaiLicense ? fssaiLicense.trim() : undefined;
    }

    if (gstinNumber !== undefined) {
      const normalizedGstin = gstinNumber ? gstinNumber.trim().toUpperCase() : undefined;
      if (normalizedGstin) {
        const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
        if (!gstinRegex.test(normalizedGstin)) {
          sendError(res, "Invalid GSTIN. Please enter a valid 15-character GSTIN.", StatusCodes.BAD_REQUEST);
          return;
        }
      }
      branch.gstinNumber = normalizedGstin || gstinNumber;
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

    if (branchType !== undefined || isMainBranch !== undefined) {
        const setAsMain = branchType === 'MAIN' || isMainBranch === true;
        const setAsSub = branchType === 'SUB' || isMainBranch === false;
        
        if (setAsMain) {
            await Branch.updateMany({ restaurantId: user.restaurantId }, { $set: { isMainBranch: false, branchType: 'SUB' } });
            branch.isMainBranch = true;
            branch.branchType = 'MAIN';
        } else if (setAsSub) {
            branch.isMainBranch = false;
            branch.branchType = 'SUB';
        }
    }

    await branch.save();

    // Update Manager Details
    if (managerName || managerMobile || managerEmail) {
        let manager = await Admin.findOne({ branchId: branch._id, userType: 'BRANCH_ADMIN', isDelete: false });
        if (!manager) {
            manager = await Admin.findOne({ branchId: branch._id, userType: { $ne: 'RESTAURANT_OWNER' }, isDelete: false });
        }
        if (!manager) {
            manager = await User.findOne({ branchId: branch._id, userType: 'BRANCH_ADMIN', isDelete: false }) as any;
        }
        if (manager) {
            if (managerName) manager.name = managerName;
            if (managerMobile) manager.phoneNumber = managerMobile;
            if (managerEmail) manager.email = managerEmail;
            await manager.save();
        }
    }

    sendSuccess(res, "Branch updated successfully.", branch, StatusCodes.OK);
  } catch (error: any) {
    console.error("Error updating branch:", error);
    sendError(res, error?.message || "Internal server error.", error?.message ? StatusCodes.BAD_REQUEST : StatusCodes.INTERNAL_SERVER_ERROR);
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

    // Deactivate associated users and admins
    await User.updateMany(
        { branchId: branch._id, isDelete: false },
        { $set: { isDelete: true, isActive: false } },
        { session }
    );
    await Admin.updateMany(
        { branchId: branch._id, isDelete: false },
        { $set: { isDelete: true, isActive: false } },
        { session }
    );

    await session.commitTransaction();
    session.endSession();

    sendSuccess(res, "Branch deleted successfully.", null, StatusCodes.OK);
  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error deleting branch:", error);
    sendError(res, error?.message || "Internal server error.", error?.message ? StatusCodes.BAD_REQUEST : StatusCodes.INTERNAL_SERVER_ERROR);
  }
};
