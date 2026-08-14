import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { StatusCodes } from "http-status-codes";
import User from "../../models/User";
import Branch from "../../models/Branch";
import UserToken from "../../models/UserToken";
import { sendSuccess, sendError } from "../../utils/response";
import { AuthRequest } from "../../middleware/authMiddleware";

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      sendError(res, "Email and password are required.", StatusCodes.BAD_REQUEST);
      return;
    }

    const user = await User.findOne({ email, isDelete: false }).populate("roleId");

    if (!user) {
      sendError(res, "Invalid credentials.", StatusCodes.UNAUTHORIZED);
      return;
    }

    if (!user.isActive) {
      sendError(res, "Account is inactive. Contact support.", StatusCodes.FORBIDDEN);
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password!);
    if (!isMatch) {
      sendError(res, "Invalid credentials.", StatusCodes.UNAUTHORIZED);
      return;
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

    sendSuccess(res, "Login successful.", {
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
      },
    });
  } catch (error) {
    sendError(res, "Internal server error.", StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export const getProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.user?.userId).select("-password").populate("roleId");
    if (!user) {
      sendError(res, "User not found.", StatusCodes.NOT_FOUND);
      return;
    }
    sendSuccess(res, "Profile fetched.", user);
  } catch (error) {
    sendError(res, "Internal server error.", StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export const logout = async (req: AuthRequest, res: Response): Promise<void> => {
  const token = req.headers.authorization?.split(" ")[1];
  if (token) {
    await UserToken.findOneAndDelete({ userId: req.user?.userId, token });
  }
  sendSuccess(res, "Logged out successfully.");
};


