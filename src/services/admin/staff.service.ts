import bcrypt from "bcryptjs";
import User from "../../models/User";

export const getStaffByRestaurantId = async (restaurantId: string, branchId?: string, dutyStatus?: string) => {
  const query: any = { restaurantId, userType: 'STAFF', isDelete: false };
  if (branchId) {
    query.branchId = branchId;
  }
  if (dutyStatus) {
    query.dutyStatus = dutyStatus;
  }
  return await User.find(query).select("-password").populate("roleId branchId");
};

export const createStaff = async (restaurantId: string, branchId: string, staffData: any) => {
  const existingUser = await User.findOne({ email: staffData.email, isDelete: false });
  if (existingUser) throw new Error("Email already registered");

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(staffData.password, salt);

  const newUser = new User({
    ...staffData,
    password: hashedPassword,
    userType: 'STAFF',
    restaurantId,
    branchId
  });

  await newUser.save();
  return newUser;
};

export const updateStaff = async (restaurantId: string, branchId: string, staffId: string, updateData: any) => {
  const staff = await User.findOne({ _id: staffId, restaurantId, branchId, userType: 'STAFF', isDelete: false });
  if (!staff) throw new Error("Staff not found");

  if (updateData.name) staff.name = updateData.name;
  if (updateData.phoneNumber) staff.phoneNumber = updateData.phoneNumber;
  if (updateData.roleId !== undefined) staff.roleId = updateData.roleId;
  if (updateData.isActive !== undefined) staff.isActive = updateData.isActive;
  if (updateData.dutyStatus) staff.dutyStatus = updateData.dutyStatus;
  if (updateData.kitchenPin) staff.kitchenPin = updateData.kitchenPin;
  if (updateData.autoAccept !== undefined) staff.autoAccept = updateData.autoAccept;

  await staff.save();
  return staff;
};

export const deleteStaff = async (restaurantId: string, branchId: string, staffId: string) => {
  const staff = await User.findOne({ _id: staffId, restaurantId, branchId, userType: 'STAFF', isDelete: false });
  if (!staff) throw new Error("Staff not found");

  staff.isDelete = true;
  staff.isActive = false;
  await staff.save();
  return true;
};

export const toggleStaffDutyStatus = async (restaurantId: string, branchId: string, staffId: string, dutyStatus: 'ON_DUTY' | 'OFF_DUTY') => {
  const staff = await User.findOne({ _id: staffId, restaurantId, branchId, userType: 'STAFF', isDelete: false });
  if (!staff) throw new Error("Staff not found");

  staff.dutyStatus = dutyStatus;
  await staff.save();
  return staff;
};
