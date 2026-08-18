import bcrypt from "bcryptjs";
import User from "../../models/User";
import Role from "../../models/Role";
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
  const query: any = { restaurantId, isDelete: false, userType: { $nin: ['RESTAURANT_OWNER', 'STATION'] } };

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
    const searchRegex = new Date().getTime(); // Dummy, we will replace below
    const searchQuery = { $regex: search, $options: 'i' };

    // We also want to search by role name
    const matchingRoles = await Role.find({ restaurantId, roleName: searchQuery, isDelete: false }).select('_id');

    query.$or = [
      { name: searchQuery },
      { email: searchQuery },
      { phoneNumber: searchQuery },
      { roleId: { $in: matchingRoles.map(r => r._id) } }
    ];
  }

  const total = await User.countDocuments(query);
  const users = await User.find(query)
    .select("-password")
    .populate("roleId branchId")
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 })
    .lean();


  const userIds = users.map(u => u._id);
  const userTables = await Table.find({
    restaurantId,
    $or: [
      { assignedWaiter: { $in: userIds } },
      { coverWaiter: { $in: userIds } }
    ],
    isDelete: false
  }).select("_id tableNumber tableNo assignedWaiter coverWaiter");

  const usersWithTables = users.map(u => {
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
    const existingUser = await User.findOne({ email: userData.email, isDelete: false });
    if (existingUser) throw new Error("Email already registered");
  }

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
    const role = await Role.findById(userData.roleId);
    if (role && role.roleType === 'BRANCH_MANAGER') {
      const managerRoles = await Role.find({ restaurantId, roleType: 'BRANCH_MANAGER', isDelete: false }).select('_id');
      const managerRoleIds = managerRoles.map(r => r._id);
      const existingManager = await User.findOne({
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

  const newUser = new User({
    ...userData,
    restaurantId,
    status: userData.status || (userData.isActive ? 'Active' : 'Inactive'),
  });

  await newUser.save();
  return newUser;
};

export const updateUserForRestaurant = async (restaurantId: string, userId: string, updateData: any) => {
  const user = await User.findOne({ _id: userId, restaurantId, isDelete: false });
  if (!user) throw new Error("User not found");

  const newRoleId = updateData.roleId || user.roleId;
  const newBranchId = updateData.branchId || user.branchId;
  const newIsActive = updateData.isActive !== undefined ? updateData.isActive : user.isActive;

  if (newRoleId && newBranchId && newIsActive) {
    const role = await Role.findById(newRoleId);
    if (role && role.roleType === 'BRANCH_MANAGER') {
      const managerRoles = await Role.find({ restaurantId, roleType: 'BRANCH_MANAGER', isDelete: false }).select('_id');
      const managerRoleIds = managerRoles.map(r => r._id);
      const existingManager = await User.findOne({
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
  if (updateData.dutyStatus) user.dutyStatus = updateData.dutyStatus;

  if (updateData.status !== undefined) {
    user.status = updateData.status;
  } else if (updateData.isActive !== undefined) {
    user.status = updateData.isActive ? 'Active' : 'Inactive';
  }

  await user.save();
  return user;
};

export const deleteUserForRestaurant = async (restaurantId: string, userId: string) => {
  const user = await User.findOne({ _id: userId, restaurantId, isDelete: false });
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
  const user = await User.findOne({ _id: userId, restaurantId, isDelete: false });
  if (!user) throw new Error("User not found");

  user.password = newPassword;
  await user.save();
};
