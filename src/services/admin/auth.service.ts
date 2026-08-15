import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../../models/User";
import Branch from "../../models/Branch";
import UserToken from "../../models/UserToken";

export const loginAdmin = async (email: string, password: string) => {
  const user = await User.findOne({ email, isDelete: false }).populate("roleId");
  if (!user) {
    throw new Error("Invalid credentials.");
  }
  if (!user.isActive) {
    throw new Error("Account is inactive. Contact support.");
  }

  const isMatch = await bcrypt.compare(password, user.password!);
  if (!isMatch) {
    throw new Error("Invalid credentials.");
  }

  let activeBranchId = user.branchId;

  if (user.userType === 'RESTAURANT_OWNER') {
      const mainBranch = await Branch.findOne({ restaurantId: user.restaurantId, isMainBranch: true });
      if (mainBranch) {
          activeBranchId = mainBranch._id as any;
      }
  }

  let finalToken: string;
  const existingToken = await UserToken.findOne({ userId: user._id });

  if (existingToken) {
      try {
          jwt.verify(existingToken.token, process.env.JWT_SECRET as string);
          finalToken = existingToken.token;
      } catch (err) {
          finalToken = jwt.sign(
            { 
              userId: user._id, 
              userType: user.userType, 
              restaurantId: user.restaurantId,
              activeBranchId: activeBranchId
            },
            process.env.JWT_SECRET as string,
            { expiresIn: process.env.JWT_EXPIRES_IN || "7d" } as jwt.SignOptions
          );
          existingToken.token = finalToken;
          await existingToken.save();
      }
  } else {
      finalToken = jwt.sign(
        { 
          userId: user._id, 
          userType: user.userType, 
          restaurantId: user.restaurantId,
          activeBranchId: activeBranchId
        },
        process.env.JWT_SECRET as string,
        { expiresIn: process.env.JWT_EXPIRES_IN || "7d" } as jwt.SignOptions
      );
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
  const user = await User.findById(userId).select("-password").populate("roleId");
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
  const user = await User.findById(userId);
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
