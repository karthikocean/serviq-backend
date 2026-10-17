import bcrypt from "bcryptjs";
import User from "../../models/User";
import Admin from "../../models/Admin";
import AdminRole from "../../models/AdminRole";
import UserRole from "../../models/UserRole";
import Table from "../../models/Table";
import UserToken from "../../models/UserToken";

export const getUsersByRestaurantId = async (
  restaurantId: string,
  branchId?: string,
  search?: string,
  roleFilter?: string,
  statusFilter?: string,
  skip: number = 0,
  limit: number = 10,
  dutyFilter?: string
) => {
  // Query all non-owner administrative accounts (e.g. branch admins, managers)
  const adminQuery: any = { restaurantId, isDelete: false, userType: { $ne: 'RESTAURANT_OWNER' } };
  // Query all users/staff/stations belonging to this restaurant in the User collection
  const userQuery: any = { restaurantId, isDelete: false };

  const applyFilters = async (query: any, isUser: boolean) => {
    if (statusFilter && statusFilter !== 'All' && statusFilter !== 'ALL') {
      const sLower = statusFilter.toLowerCase().trim();
      if (sLower === 'active') {
        query.$or = [{ status: 'Active' }, { status: { $exists: false }, isActive: true }, { isActive: true }];
      } else if (sLower === 'inactive') {
        query.$or = [{ status: 'Inactive' }, { isActive: false }];
      }
    }

    if (dutyFilter && dutyFilter !== 'All' && dutyFilter !== 'ALL') {
      const normDuty = dutyFilter.toUpperCase().replace(/\s+/g, '_');
      if (normDuty === 'ON_DUTY' || normDuty === 'OFF_DUTY') {
        query.dutyStatus = normDuty;
      }
    }

    if (branchId && branchId !== 'ALL' && branchId !== 'All' && branchId !== 'COMPANY' && branchId !== 'company' && /^[0-9a-fA-F]{24}$/.test(branchId)) {
      query.branchId = branchId;
    }

    if (roleFilter && roleFilter !== 'All' && roleFilter !== 'ALL') {
      if (/^[0-9a-fA-F]{24}$/.test(roleFilter)) {
        query.roleId = roleFilter;
      } else {
        const regex = new RegExp(`^${roleFilter.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
        const [userRoles, adminRoles] = await Promise.all([
          UserRole.find({ restaurantId, roleName: regex, isDelete: false }).select('_id'),
          AdminRole.find({ restaurantId, roleName: regex, isDelete: false }).select('_id')
        ]);
        const matchedRoleIds = [...userRoles.map(r => r._id), ...adminRoles.map(r => r._id)];
        if (matchedRoleIds.length > 0) {
          query.roleId = { $in: matchedRoleIds };
        } else {
          query.roleId = null;
        }
      }
    }

    if (search && search.trim()) {
      const cleanSearch = search.trim();
      const escapedSearch = cleanSearch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const searchRegex = { $regex: escapedSearch, $options: 'i' };

      const [userRoles, adminRoles] = await Promise.all([
        UserRole.find({ restaurantId, roleName: searchRegex, isDelete: false }).select('_id'),
        AdminRole.find({ restaurantId, roleName: searchRegex, isDelete: false }).select('_id')
      ]);
      const matchedRoleIds = [...userRoles.map(r => r._id), ...adminRoles.map(r => r._id)];

      query.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { phoneNumber: searchRegex },
        { employeeCode: searchRegex },
        ...(matchedRoleIds.length > 0 ? [{ roleId: { $in: matchedRoleIds } }] : [])
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

  // Cross-populate roleId for Users if unpopulated or referencing AdminRole
  const unpopulatedUsers = users.filter((u: any) => !u.roleId || typeof u.roleId !== 'object' || !(u.roleId as any)?.roleName);
  if (unpopulatedUsers.length > 0) {
    const rawIds: string[] = unpopulatedUsers
      .map((u: any) => (u.roleId?._id ? u.roleId._id.toString() : (u.roleId ? u.roleId.toString() : '')))
      .filter((id: string) => Boolean(id) && /^[0-9a-fA-F]{24}$/.test(id));
    if (rawIds.length > 0) {
      const fallbackRoles: any[] = await AdminRole.find({ _id: { $in: rawIds } }).lean();
      const fallbackMap = new Map<string, any>(fallbackRoles.map((r: any) => [r._id.toString(), r]));
      users.forEach((u: any) => {
        const rId = (u.roleId?._id || u.roleId)?.toString();
        if (rId && fallbackMap.has(rId)) {
          u.roleId = fallbackMap.get(rId);
        }
      });
    }
  }

  // Cross-populate roleId for Admins if unpopulated or referencing UserRole
  const unpopulatedAdmins = admins.filter((a: any) => !a.roleId || typeof a.roleId !== 'object' || !(a.roleId as any)?.roleName);
  if (unpopulatedAdmins.length > 0) {
    const rawIds: string[] = unpopulatedAdmins
      .map((a: any) => (a.roleId?._id ? a.roleId._id.toString() : (a.roleId ? a.roleId.toString() : '')))
      .filter((id: string) => Boolean(id) && /^[0-9a-fA-F]{24}$/.test(id));
    if (rawIds.length > 0) {
      const fallbackRoles: any[] = await UserRole.find({ _id: { $in: rawIds } }).lean();
      const fallbackMap = new Map<string, any>(fallbackRoles.map((r: any) => [r._id.toString(), r]));
      admins.forEach((a: any) => {
        const rId = (a.roleId?._id || a.roleId)?.toString();
        if (rId && fallbackMap.has(rId)) {
          a.roleId = fallbackMap.get(rId);
        }
      });
    }
  }

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
  const cleanData = { ...userData };

  if (cleanData.email && typeof cleanData.email === "string" && cleanData.email.trim()) {
    cleanData.email = cleanData.email.trim().toLowerCase();
    const existingAdmin = await Admin.findOne({ email: cleanData.email, isDelete: false });
    const existingUser = await User.findOne({ email: cleanData.email, isDelete: false });
    if (existingAdmin || existingUser) throw new Error("Email already registered");
  } else {
    delete cleanData.email;
  }

  if (cleanData.phoneNumber && typeof cleanData.phoneNumber === "string" && cleanData.phoneNumber.trim()) {
    cleanData.phoneNumber = cleanData.phoneNumber.trim();
    const existingAdmin = await Admin.findOne({ phoneNumber: cleanData.phoneNumber, isDelete: false });
    const existingUser = await User.findOne({ phoneNumber: cleanData.phoneNumber, isDelete: false });
    if (existingAdmin || existingUser) throw new Error("Phone number already registered");
  } else {
    delete cleanData.phoneNumber;
  }

  // BranchAdmin requires email; if no email, create as STAFF user
  let isBranchAdmin = cleanData.userType === 'BRANCH_ADMIN';
  if (isBranchAdmin && !cleanData.email) {
    isBranchAdmin = false;
    cleanData.userType = 'STAFF';
  }

  if (cleanData.userType === 'STATION' && cleanData.branchId) {
    const existingStation = await User.findOne({
      restaurantId,
      branchId: cleanData.branchId,
      userType: 'STATION',
      isDelete: false
    });
    if (existingStation) {
      throw new Error("This branch already has a Kitchen Station account.");
    }
  }

  if (cleanData.roleId && cleanData.branchId && cleanData.isActive !== false) {
    let role = isBranchAdmin 
      ? await AdminRole.findById(cleanData.roleId)
      : await UserRole.findById(cleanData.roleId);

    if (!role) {
      role = isBranchAdmin
        ? await UserRole.findById(cleanData.roleId)
        : await AdminRole.findById(cleanData.roleId);
    }

    if (role && role.roleType === 'BRANCH_MANAGER') {
      const managerRoles = await AdminRole.find({ restaurantId, roleType: 'BRANCH_MANAGER', isDelete: false }).select('_id');
      const managerRoleIds = managerRoles.map(r => r._id);
      const existingManager = await Admin.findOne({
        restaurantId,
        branchId: cleanData.branchId,
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
      ...cleanData,
      restaurantId,
      status: cleanData.status || (cleanData.isActive ? 'Active' : 'Inactive'),
    });
  } else {
    newRecord = new User({
      ...cleanData,
      restaurantId,
      status: cleanData.status || (cleanData.isActive ? 'Active' : 'Inactive'),
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
  await UserToken.deleteMany({ userId: user._id });
};
