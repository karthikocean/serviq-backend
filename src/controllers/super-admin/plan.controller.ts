import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import Plan from "../../models/Plan";
import { sendSuccess, sendError } from "../../utils/response";
import { pagination } from "../../utils/pagination";


export const getAllPlans = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const pageIndex = Math.max(0, page - 1);
    const skip = pageIndex * limit;

    const total = await Plan.countDocuments({ isDelete: false, isActive: true });

    const plans = await Plan.find({ isDelete: false, isActive: true })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    pagination(total, plans, limit, pageIndex, res, "Plans fetched.");
  } catch (error) {
    sendError(res, "Internal server error.", StatusCodes.INTERNAL_SERVER_ERROR);
  }
};


export const createPlan = async (req: Request, res: Response): Promise<void> => {
  try {
    const { planName, planDescription, monthlyPrice, monthlyDiscount, annualPrice, featuresIncluded, isActive } = req.body;
    if (!planName || !planDescription || !monthlyPrice || !monthlyDiscount || !annualPrice || !featuresIncluded) {
      sendError(res, "All fields are required.", StatusCodes.BAD_REQUEST);
      return;
    }
    const plan = await Plan.create({ planName, planDescription, monthlyPrice, monthlyDiscount, annualPrice, featuresIncluded, isActive });
    sendSuccess(res, "Plan created.", { id: plan._id }, StatusCodes.CREATED);
  } catch (error) {
    sendError(res, "Internal server error.", StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export const updatePlan = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { planName, planDescription, monthlyPrice, monthlyDiscount, annualPrice, featuresIncluded, isActive } = req.body;
    const plan = await Plan.findById(id);
    if (!plan) {
      sendError(res, "Plan not found.", StatusCodes.NOT_FOUND);
      return;
    }
    plan.planName = planName || plan.planName;
    plan.planDescription = planDescription || plan.planDescription;
    plan.monthlyPrice = monthlyPrice || plan.monthlyPrice;
    plan.monthlyDiscount = monthlyDiscount || plan.monthlyDiscount;
    plan.annualPrice = annualPrice || plan.annualPrice;
    plan.featuresIncluded = featuresIncluded || plan.featuresIncluded;
    plan.isActive = isActive !== undefined ? isActive : plan.isActive;
    await plan.save();
    sendSuccess(res, "Plan updated.");
  } catch (error) {
    sendError(res, "Internal server error.", StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

export const deletePlan = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const plan = await Plan.findById(id);
    if (!plan) {
      sendError(res, "Plan not found.", StatusCodes.NOT_FOUND);
      return;
    }
    plan.isDelete = true;
    await plan.save();
    sendSuccess(res, "Plan deleted.");
  } catch (error) {
    sendError(res, "Internal server error.", StatusCodes.INTERNAL_SERVER_ERROR);
  }
};