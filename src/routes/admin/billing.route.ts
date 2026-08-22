import { Router } from "express";
import { 
  getBill, 
  applyBillDiscount, 
  payBill,
  getBillingHistory,
  getActiveTables
} from "../../controllers/admin/billing.controller";
import { checkBranchAccess, checkSubscriptionFeature } from "../../middleware/rbacMiddleware";
import { validate } from "../../middleware/validate";
import { 
  applyDiscountSchema, 
  processPaymentSchema 
} from "../../validations/admin/billing.validation";

const router = Router();

router.get("/history", checkBranchAccess, checkSubscriptionFeature("ORDER"), getBillingHistory);
router.get("/active-tables", checkBranchAccess, checkSubscriptionFeature("ORDER"), getActiveTables);
router.get("/:orderId", checkBranchAccess, checkSubscriptionFeature("ORDER"), getBill);
router.post("/:orderId/discount", checkBranchAccess, checkSubscriptionFeature("ORDER"), validate(applyDiscountSchema), applyBillDiscount);
router.post("/process-table", checkBranchAccess, checkSubscriptionFeature("ORDER"), payBill);

export default router;
