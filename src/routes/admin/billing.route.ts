import { Router } from "express";
import { 
  getBill, 
  applyBillDiscount, 
  payBill,
  getBillingHistory,
  getActiveTables
} from "../../controllers/admin/billing.controller";
import { checkBranchAccess, checkSubscriptionFeature, checkPermission } from "../../middleware/rbacMiddleware";
import { validate } from "../../middleware/validate";
import { 
  applyDiscountSchema, 
  processPaymentSchema 
} from "../../validations/admin/billing.validation";

const router = Router();

router.get("/history", checkBranchAccess, checkSubscriptionFeature("ORDER"), checkPermission("ORDER", "view"), getBillingHistory);
router.get("/active-tables", checkBranchAccess, checkSubscriptionFeature("ORDER"), checkPermission("ORDER", "view"), getActiveTables);
router.get("/:orderId", checkBranchAccess, checkSubscriptionFeature("ORDER"), checkPermission("ORDER", "view"), getBill);
router.post("/:orderId/discount", checkBranchAccess, checkSubscriptionFeature("ORDER"), checkPermission("ORDER", "edit"), validate(applyDiscountSchema), applyBillDiscount);
router.post("/process-table", checkBranchAccess, checkSubscriptionFeature("ORDER"), checkPermission("ORDER", "edit"), payBill);

export default router;
