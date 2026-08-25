import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Admin from "../../models/Admin";
import User from "../../models/User";
import Branch from "../../models/Branch";
import UserToken from "../../models/UserToken";

export const loginAdmin = async (email: string, password: string) => {
  const cleanIdentifier = email ? email.trim() : "";
  const normalizedEmail = cleanIdentifier.toLowerCase();

  let user = await Admin.findOne({
    $or: [{ email: normalizedEmail }, { phoneNumber: cleanIdentifier }],
    isDelete: false
  }).populate("roleId");

  if (!user) {
    user = await User.findOne({
      $or: [{ email: normalizedEmail }, { phoneNumber: cleanIdentifier }],
      isDelete: false
    }).populate("roleId") as any;
  }

  if (!user) {
    throw new Error("Invalid credentials.");
  }
  if (!user.isActive) {
    throw new Error("Account is inactive. Contact support.");
  }

  let isMatch = false;
  if (user.password) {
    if (user.password.startsWith("$2a$") || user.password.startsWith("$2b$")) {
      isMatch = await bcrypt.compare(password, user.password);
    } else {
      // Handle legacy/unhashed password and upgrade to bcrypt
      isMatch = (password === user.password);
      if (isMatch) {
        user.password = password;
        await user.save();
      }
    }
  }

  if (!isMatch) {
    throw new Error("Invalid credentials.");
  }

  let activeBranchId = user.branchId;

  if (user.userType !== 'RESTAURANT_OWNER') {
    if (user.branchId) {
      const branch = await Branch.findById(user.branchId);
      if (branch && !branch.isActive && branch.status !== 'Active') {
        throw new Error("Your branch is currently inactive. Please contact your restaurant owner.");
      }
    }
  }

  if (user.userType === 'RESTAURANT_OWNER') {
    const mainBranch = await Branch.findOne({ restaurantId: user.restaurantId, isMainBranch: true });
    if (mainBranch) {
      activeBranchId = mainBranch._id as any;
    } else {
      const firstBranch = await Branch.findOne({ restaurantId: user.restaurantId });
      if (firstBranch) {
        activeBranchId = firstBranch._id as any;
      } else {
        activeBranchId = "ALL" as any;
      }
    }
  }

  // Always generate a fresh token with up-to-date payload
  const finalToken = jwt.sign(
    {
      userId: user._id,
      userType: user.userType,
      restaurantId: user.restaurantId,
      activeBranchId: activeBranchId,
      roleId: user.roleId
    },
    process.env.JWT_SECRET as string,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" } as jwt.SignOptions
  );

  const existingToken = await UserToken.findOne({ userId: user._id });
  if (existingToken) {
    existingToken.token = finalToken;
    await existingToken.save();
  } else {
    await UserToken.create({ userId: user._id, token: finalToken });
  }

  return {
    token: finalToken,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      phoneNumber: user.phoneNumber,
      userType: user.userType,
      restaurantId: user.restaurantId,
      activeBranchId: activeBranchId,
      role: user.roleId,
    }
  };
};

export const getAdminProfile = async (userId: string) => {
  let user = await Admin.findById(userId).select("-password").populate("roleId");
  if (!user) {
    user = await User.findById(userId).select("-password").populate("roleId") as any;
  }
  if (!user) {
    throw new Error("User not found.");
  }
  return user;
};

export const logoutAdmin = async (userId: string, token: string) => {
  await UserToken.findOneAndDelete({ userId, token });
  return true;
};

export const updateAdminPassword = async (userId: string, currentPassword: string, newPassword: string) => {
  let user = await Admin.findById(userId);
  if (!user) {
    user = await User.findById(userId) as any;
  }
  if (!user) throw new Error("User not found.");

  const isMatch = await bcrypt.compare(currentPassword, user.password!);
  if (!isMatch) {
    throw new Error("Incorrect current password.");
  }

  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(newPassword, salt);
  await user.save();

  // Invalidate existing sessions so they have to login again (optional, but good practice)
  await UserToken.deleteMany({ userId: user._id });
  return true;
};
