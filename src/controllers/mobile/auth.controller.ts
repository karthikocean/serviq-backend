import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { StatusCodes } from "http-status-codes";
import User from "../../models/User";
import UserToken from "../../models/UserToken";
import { sendSuccess, sendError } from "../../utils/response";
import { AuthRequest } from "../../middleware/authMiddleware";

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, phoneNumber, password, email } = req.body;

    if (!name || !phoneNumber || !password) {
      sendError(res, "Name, phone number and password are required.", StatusCodes.BAD_REQUEST);
      return;
    }

    const existing = await User.findOne({ phoneNumber, isDelete: false });
    if (existing) {
      sendError(res, "Phone number already registered.", StatusCodes.CONFLICT);
      return;
    }

    const user = await User.create({ name, phoneNumber, password, email });

    const token = jwt.sign(
      { id: user._id, type: "mobile" },
      process.env.JWT_SECRET as string,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" } as jwt.SignOptions
    );

    await UserToken.create({ userId: user._id, token });

    sendSuccess(res, "Registration successful.", {
      token,
      user: { id: user._id, name: user.name, phoneNumber: user.phoneNumber, email: user.email },
    }, StatusCodes.CREATED);
  } catch (error) {
    sendError(res, "Internal server error.", StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { phoneNumber, password } = req.body;

    if (!phoneNumber || !password) {
      sendError(res, "Phone number and password are required.", StatusCodes.BAD_REQUEST);
      return;
    }

    const user = await User.findOne({ phoneNumber, isDelete: false });
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

    let finalToken: string;
    const existingToken = await UserToken.findOne({ userId: user._id });

    if (existingToken) {
        try {
            jwt.verify(existingToken.token, process.env.JWT_SECRET as string);
            finalToken = existingToken.token;
        } catch (error) {
            finalToken = jwt.sign(
              { id: user._id, type: "mobile" },
              process.env.JWT_SECRET as string,
              { expiresIn: process.env.JWT_EXPIRES_IN || "7d" } as jwt.SignOptions
            );
            existingToken.token = finalToken;
            await existingToken.save();
        }
    } else {
        finalToken = jwt.sign(
          { id: user._id, type: "mobile" },
          process.env.JWT_SECRET as string,
          { expiresIn: process.env.JWT_EXPIRES_IN || "7d" } as jwt.SignOptions
        );
        await UserToken.create({ userId: user._id, token: finalToken });
    }

    sendSuccess(res, "Login successful.", {
      token: finalToken,
      user: { id: user._id, name: user.name, phoneNumber: user.phoneNumber, email: user.email },
    });
  } catch (error) {
    sendError(res, "Internal server error.", StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export const getProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.user?.id).select("-password");
    if (!user) {
      sendError(res, "User not found.", StatusCodes.NOT_FOUND);
      return;
    }
    sendSuccess(res, "Profile fetched.", user);
  } catch (error) {
    sendError(res, "Internal server error.", StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export const updateProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, email } = req.body;
    const user = await User.findById(req.user?.id);
    if (!user) {
      sendError(res, "User not found.", StatusCodes.NOT_FOUND);
      return;
    }
    if (name) user.name = name;
    if (email) user.email = email;
    await user.save();
    sendSuccess(res, "Profile updated.", { id: user._id, name: user.name, email: user.email });
  } catch (error) {
    sendError(res, "Internal server error.", StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export const logout = async (req: AuthRequest, res: Response): Promise<void> => {
  const token = req.headers.authorization?.split(" ")[1];
  if (token) {
    const userId = req.user?.userId || req.user?.id;
    await UserToken.findOneAndDelete({ userId, token });
  }
  sendSuccess(res, "Logged out successfully.");
};
