import { AuthRequest } from "../middleware/authMiddleware";

/**
 * Utility to extract the target branchId for an API request.
 * 
 * - If user is RESTAURANT_OWNER, they can specify the branchId via query or body.
 *   If not specified in query/body, it falls back to their token's activeBranchId.
 * - For all other roles (BRANCH_ADMIN, STAFF), it strictly uses the token's activeBranchId.
 */
export const getTargetBranchId = (req: AuthRequest): string | undefined => {
  if (req.user?.userType === "RESTAURANT_OWNER") {
    const queryBranchId = req.query.branchId as string;
    const bodyBranchId = req.body?.branchId as string;
    return queryBranchId || bodyBranchId || req.user.activeBranchId;
  }

  return req.user?.activeBranchId;
};


