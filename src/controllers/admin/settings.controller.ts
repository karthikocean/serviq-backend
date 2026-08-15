import { Request, Response } from "express";
import { AuthRequest } from "../../middleware/authMiddleware";
import { getSettingsByRestaurantId, updateSettingsByRestaurantId } from "../../services/admin/settings.service";

export const getSettings = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as AuthRequest).user;
    if (!user || !user.restaurantId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const settings = await getSettingsByRestaurantId(user.restaurantId);
    res.status(200).json(settings);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch settings", error: error.message });
  }
};

export const updateSettings = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as AuthRequest).user;
    if (!user || !user.restaurantId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    await updateSettingsByRestaurantId(user.restaurantId, req.body);
    res.status(200).json({ success: true, message: "Settings saved successfully" });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to update settings", error: error.message });
  }
};
