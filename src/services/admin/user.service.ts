import bcrypt from "bcryptjs";
import User from "../../models/User";
import Admin from "../../models/Admin";
import AdminRole from "../../models/AdminRole";
import UserRole from "../../models/UserRole";
import Table from "../../models/Table";

export const getUsersByRestaurantId = async (
  restaurantId: string,
  branchId?: string,
  search?: string,
  roleFilter?: string,
  statusFilter?: string,
  skip: number = 0,
  limit: number = 10
) => {
  const adminQuery: any = { restaurantId, isDelete: false, userType: 'BRANCH_ADMIN' };
  const userQuery: any = { restaurantId, isDelete: false, userType: 'STAFF' };

  const applyFilters = async (query: any, isUser: boolean) => {
    if (statusFilter === 'Active') {
      query.status = 'Active';
    } else if (statusFilter === 'Inactive') {
      query.status = 'Inactive';
    }

    if (branchId && branchId !== 'ALL') {
      query.branchId = branchId;
    }

    if (roleFilter && roleFilter !== 'All') {
      query.roleId = roleFilter;
    }

    if (search) {
      const searchQuery = { $regex: search, $options: 'i' };
      const matchingRoles = isUser 
        ? await UserRole.find({ restaurantId, roleName: searchQuery, isDelete: false }).select('_id')
        : await AdminRole.find({ restaurantId, roleName: searchQuery, isDelete: false }).select('_id');

      query.$or = [
        { name: searchQuery },
        { email: searchQuery },
        { phoneNumber: searchQuery },
        { roleId: { $in: matchingRoles.map(r => r._id) } }
      ];
    }
  };

  await applyFilters(adminQuery, false);
  await applyFilters(userQuery, true);

  const totalAdmins = await Admin.countDocuments(adminQuery);
  const totalUsers = await User.countDocuments(userQuery);
  const total = totalAdmins + totalUsers;

  const admins = await Admin.find(adminQuery)
    .select("-password")
    .populate("roleId branchId")
    .lean();

  const users = await User.find(userQuery)
    .select("-password")
    .populate("roleId branchId")
    .lean();

  const combined = [...admins, ...users].sort((a: any, b: any) => {
    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return timeB - timeA;
  });

  const paginated = combined.slice(skip, skip + limit);

  const userIds = paginated.map(u => u._id);
  const userTables = await Table.find({
    restaurantId,
    $or: [
      { assignedWaiter: { $in: userIds } },
      { coverWaiter: { $in: userIds } }
    ],
    isDelete: false
  }).select("_id tableNumber tableNo assignedWaiter coverWaiter");

  const usersWithTables = paginated.map(u => {
    const assignedTables: string[] = [];
    userTables.forEach((t: any) => {
      const primaryId = t.assignedWaiter?.toString();
      const coverId = t.coverWaiter?.toString();
      const userIdStr = u._id.toString();

      if (primaryId === userIdStr) {
        assignedTables.push(t.tableNumber || t.tableNo || t._id.toString().substring(0, 4));
      } else if (coverId === userIdStr) {
        assignedTables.push(`${t.tableNumber || t.tableNo || t._id.toString().substring(0, 4)} (Cover)`);
      }
    });

    return {
      ...u,
      assignedTableBadges: assignedTables
    };
  });

  return { total, users: usersWithTables };
};

export const getStationsByRestaurantId = async (restaurantId: string, branchId?: string) => {
  const query: any = { restaurantId, isDelete: false, userType: 'STATION' };

  if (branchId && branchId !== 'ALL') {
    query.branchId = branchId;
  }

  const stations = await User.find(query)
    .select("-password")
    .populate("roleId branchId")
    .sort({ createdAt: -1 });

  return { data: stations };
};

export const createUserForRestaurant = async (restaurantId: string, userData: any) => {
  if (userData.email) {
    const existingAdmin = await Admin.findOne({ email: userData.email, isDelete: false });
    const existingUser = await User.findOne({ email: userData.email, isDelete: false });
    if (existingAdmin || existingUser) throw new Error("Email already registered");
  }

  if (userData.phoneNumber) {
    const existingAdmin = await Admin.findOne({ phoneNumber: userData.phoneNumber, isDelete: false });
    const existingUser = await User.findOne({ phoneNumber: userData.phoneNumber, isDelete: false });
    if (existingAdmin || existingUser) throw new Error("Phone number already registered");
  }

  const isBranchAdmin = userData.userType === 'BRANCH_ADMIN';

  if (userData.userType === 'STATION' && userData.branchId) {
    const existingStation = await User.findOne({
      restaurantId,
      branchId: userData.branchId,
      userType: 'STATION',
      isDelete: false
    });
    if (existingStation) {
      throw new Error("This branch already has a Kitchen Station account.");
    }
  }

  if (userData.roleId && userData.branchId && userData.isActive !== false) {
    const role = isBranchAdmin 
      ? await AdminRole.findById(userData.roleId)
      : await UserRole.findById(userData.roleId);

    if (role && role.roleType === 'BRANCH_MANAGER') {
      const managerRoles = await AdminRole.find({ restaurantId, roleType: 'BRANCH_MANAGER', isDelete: false }).select('_id');
      const managerRoleIds = managerRoles.map(r => r._id);
      const existingManager = await Admin.findOne({
        restaurantId,
        branchId: userData.branchId,
        roleId: { $in: managerRoleIds },
        isActive: true,
        isDelete: false
      });
      if (existingManager) {
        throw new Error("This branch already has an active manager.");
      }
    }
  }

  let newRecord;
  if (isBranchAdmin) {
    newRecord = new Admin({
      ...userData,
      restaurantId,
      status: userData.status || (userData.isActive ? 'Active' : 'Inactive'),
    });
  } else {
    newRecord = new User({
      ...userData,
      restaurantId,
      status: userData.status || (userData.isActive ? 'Active' : 'Inactive'),
    });
  }

  await newRecord.save();
  return newRecord;
};

export const updateUserForRestaurant = async (restaurantId: string, userId: string, updateData: any) => {
  let user: any = await Admin.findOne({ _id: userId, restaurantId, isDelete: false });
  let isAdminRecord = true;
  if (!user) {
    user = await User.findOne({ _id: userId, restaurantId, isDelete: false });
    isAdminRecord = false;
  }
  
  if (!user) throw new Error("User not found");

  const newRoleId = updateData.roleId || user.roleId;
  const newBranchId = updateData.branchId || user.branchId;
  const newIsActive = updateData.isActive !== undefined ? updateData.isActive : user.isActive;

  if (newRoleId && newBranchId && newIsActive) {
    const role = isAdminRecord 
      ? await AdminRole.findById(newRoleId)
      : await UserRole.findById(newRoleId);

    if (role && role.roleType === 'BRANCH_MANAGER') {
      const managerRoles = await AdminRole.find({ restaurantId, roleType: 'BRANCH_MANAGER', isDelete: false }).select('_id');
      const managerRoleIds = managerRoles.map(r => r._id);
      const existingManager = await Admin.findOne({
        _id: { $ne: userId },
        restaurantId,
        branchId: newBranchId,
        roleId: { $in: managerRoleIds },
        isActive: true,
        isDelete: false
      });
      if (existingManager) {
        throw new Error("This branch already has an active manager.");
      }
    }
  }

  if (updateData.name) user.name = updateData.name;
  if (updateData.email) user.email = updateData.email;
  if (updateData.phoneNumber) user.phoneNumber = updateData.phoneNumber;
  if (updateData.userType) user.userType = updateData.userType;
  if (updateData.roleId) user.roleId = updateData.roleId;
  if (updateData.branchId) user.branchId = updateData.branchId;
  if (user.dutyStatus && updateData.dutyStatus) user.dutyStatus = updateData.dutyStatus;

  if (updateData.status !== undefined) {
    user.status = updateData.status;
  } else if (updateData.isActive !== undefined) {
    user.status = updateData.isActive ? 'Active' : 'Inactive';
  }

  await user.save();
  return user;
};

export const deleteUserForRestaurant = async (restaurantId: string, userId: string) => {
  let user: any = await Admin.findOne({ _id: userId, restaurantId, isDelete: false });
  if (!user) {
    user = await User.findOne({ _id: userId, restaurantId, isDelete: false });
  }
  if (!user) throw new Error("User not found");

  // Prevent RESTAURANT_OWNER deletion
  if (user.userType === "RESTAURANT_OWNER") {
    throw new Error("Cannot delete restaurant owner account");
  }

  user.isDelete = true;
  user.isActive = false;
  await user.save();
  return true;
};

export const changePasswordForRestaurant = async (restaurantId: string, userId: string, newPassword: string) => {
  let user: any = await Admin.findOne({ _id: userId, restaurantId, isDelete: false });
  if (!user) {
    user = await User.findOne({ _id: userId, restaurantId, isDelete: false });
  }
  if (!user) throw new Error("User not found");

  user.password = newPassword;
  await user.save();
};
