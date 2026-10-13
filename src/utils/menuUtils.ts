import mongoose from "mongoose";
import Branch from "../models/Branch";

/**
 * Resolves the target branchId for menu queries.
 * - If branchId is "ALL", undefined, or empty, returns undefined.
 * - If a specific branchId is provided:
 *   - Checks the branch's `useCustomMenu` flag.
 *   - If `useCustomMenu === true`, returns the branch's own ID (separate branch menu).
 *   - If `useCustomMenu === false` (default), falls back to the restaurant's Main Branch (Company Menu).
 */
export const resolveMenuBranchId = async (
  restaurantId?: string | mongoose.Types.ObjectId,
  branchId?: string | mongoose.Types.ObjectId
): Promise<mongoose.Types.ObjectId | undefined> => {
  if (!branchId || branchId === "ALL" || branchId === "All" || branchId === "all" || branchId === "COMPANY" || branchId === "company") {
    return undefined;
  }

  const branchIdStr = String(branchId).trim();
  let branch: any = null;

  if (mongoose.Types.ObjectId.isValid(branchIdStr)) {
    branch = await Branch.findById(branchIdStr);
  }

  if (!branch && restaurantId) {
    branch = await Branch.findOne({
      restaurantId,
      $or: [{ branchCode: branchIdStr }, { branchName: branchIdStr }],
      isDelete: false
    });
  }

  if (!branch) {
    branch = await Branch.findOne({
      $or: [{ branchCode: branchIdStr }, { branchName: branchIdStr }],
      isDelete: false
    });
  }

  if (!branch) {
    return mongoose.Types.ObjectId.isValid(branchIdStr) ? new mongoose.Types.ObjectId(branchIdStr) : undefined;
  }

  // If this branch has its own custom menu enabled, return its branch ID
  const isCustomMenu = branch.useCustomMenu === true || String(branch.useCustomMenu) === "true";
  if (isCustomMenu) {
    return branch._id as mongoose.Types.ObjectId;
  }

  // Otherwise, branch uses Company Menu -> resolve to the Main Branch of the restaurant
  const restId = branch.restaurantId || restaurantId;
  let mainBranch = await Branch.findOne({
    restaurantId: restId,
    isMainBranch: true,
    isDelete: false
  });

  if (!mainBranch) {
    // If no branch is explicitly marked as isMainBranch, find the first non-custom branch
    mainBranch = await Branch.findOne({
      restaurantId: restId,
      useCustomMenu: { $ne: true },
      isDelete: false
    }).sort({ createdAt: 1 });
  }

  return mainBranch ? (mainBranch._id as mongoose.Types.ObjectId) : (branch._id as mongoose.Types.ObjectId);
};
