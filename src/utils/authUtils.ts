import { AuthRequest } from "../middleware/authMiddleware";

/**
 * Utility to extract the target branchId for an API request.
 * 
 * - If user is RESTAURANT_OWNER, they can specify the branchId via query or body.
 *   If not specified in query/body, it falls back to their token's activeBranchId.
 * - For all other roles (BRANCH_ADMIN, STAFF), it strictly uses the token's activeBranchId.
 */
export const getTargetBranchId = (req: AuthRequest): string | undefined => {
  const queryBranchId = req.query?.branchId as string | undefined;
  const bodyBranchId = req.body?.branchId as string | undefined;

  if (queryBranchId) return queryBranchId;
  if (bodyBranchId) return bodyBranchId;

  return req.user?.activeBranchId;
};


