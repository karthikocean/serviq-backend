import bcrypt from "bcryptjs";
import User from "../../models/User";

export const getUsersByRestaurantId = async (restaurantId: string, branchId?: string) => {
  const query: any = { restaurantId, isDelete: false };
  if (branchId) {
    query.branchId = branchId;
  }
  return await User.find(query).select("-password").populate("roleId branchId");
};

export const createUserForRestaurant = async (restaurantId: string, userData: any) => {
  const existingUser = await User.findOne({ email: userData.email, isDelete: false });
  if (existingUser) throw new Error("Email already registered");

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(userData.password, salt);

  const newUser = new User({
    ...userData,
    password: hashedPassword,
    restaurantId,
  });

  await newUser.save();
  return newUser;
};

export const updateUserForRestaurant = async (restaurantId: string, userId: string, updateData: any) => {
  const user = await User.findOne({ _id: userId, restaurantId, isDelete: false });
  if (!user) throw new Error("User not found");

  if (updateData.name) user.name = updateData.name;
  if (updateData.phoneNumber) user.phoneNumber = updateData.phoneNumber;
  if (updateData.roleId) user.roleId = updateData.roleId;
  if (updateData.isActive !== undefined) user.isActive = updateData.isActive;
  if (updateData.userType) user.userType = updateData.userType;
  if (updateData.branchId) user.branchId = updateData.branchId;

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
