import mongoose from "mongoose";
import Subscription from "../../models/Subscription";
import Payment from "../../models/Payment";
import Branch from "../../models/Branch";
import SubscriptionHistory from "../../models/SubscriptionHistory";

export const getSubscriptionDashboardData = async (restaurantId: string) => {
  // 1. Fetch active subscription and populated plan
  const activeSubscription = await Subscription.findOne({
    restaurant: restaurantId,
    status: { $in: ["Active", "Expiring Soon"] },
    isDelete: false
  }).populate("plan");

  if (!activeSubscription) {
    throw new Error("No active subscription found for this restaurant.");
  }

  // 2. Calculate branch capacity
  const totalBranches = await Branch.countDocuments({
    restaurantId: restaurantId,
    isActive: true,
    isDelete: false
  });

  const baseCapacity = activeSubscription.maxBranches || 1;
  const addonCapacity = activeSubscription.extraBranches || 0;
  const totalCapacity = baseCapacity + addonCapacity;
  const availableSlots = Math.max(0, totalCapacity - totalBranches);
  const capacityUsedPercent = totalCapacity > 0 ? Math.round((totalBranches / totalCapacity) * 100) : 0;

  const branchCapacity = {
    used: totalBranches,
    total: totalCapacity,
    base: baseCapacity,
    addons: addonCapacity,
    available: availableSlots,
    percentUsed: capacityUsedPercent
  };

  // 3. Extra Branch Rate (Assuming defined system-wide or fetched from active plan, default to 699 for now)
  // Auto-renew can be pulled from restaurant settings or assumed
  const extraBranchRate = {
    rate: 699, // default if not found
    autoRenew: true // mocked for now until recurring logic exists
  };

  // 4. Last Recharge (latest payment)
  const lastPayment = await Payment.findOne({
    restaurant: restaurantId,
    paymentStatus: "Paid",
    isDelete: false
  }).sort({ paymentDate: -1, createdAt: -1 });

  let lastRecharge = null;
  if (lastPayment) {
    lastRecharge = {
      amount: lastPayment.amount,
      date: lastPayment.paymentDate || lastPayment.createdAt,
      status: lastPayment.paymentStatus,
      invoice: lastPayment.transactionId || `INV-${lastPayment._id.toString().slice(-6).toUpperCase()}`
    };
  }

  return {
    activePlan: {
      planName: (activeSubscription.plan as any)?.planName || "Unknown Plan",
      billingCycle: activeSubscription.billingCycle,
      price: activeSubscription.planPrice || (activeSubscription.plan as any)?.monthlyPrice,
      nextRenewal: activeSubscription.renewalDate,
      validity: activeSubscription.endDate
    },
    lastRecharge,
    branchCapacity,
    extraBranchRate
  };
};

export const getSubscriptionHistoryList = async (restaurantId: string, skip: number, limit: number) => {
  // Fetch payments for this restaurant, sort descending by date
  const payments = await Payment.find({
    restaurant: restaurantId,
    isDelete: false
  })
    .sort({ paymentDate: -1, createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const totalCount = await Payment.countDocuments({
    restaurant: restaurantId,
    isDelete: false
  });

  const history = payments.map(payment => {
    return {
      _id: payment._id,
      rechargeDate: payment.paymentDate || payment.createdAt,
      paymentMethod: payment.paymentMethod || "Unknown",
      invoice: payment.transactionId || `INV-${payment._id.toString().slice(-6).toUpperCase()}`,
      planDetails: payment.notes || "Subscription Payment",
      amountPaid: payment.amount,
      status: payment.paymentStatus
    };
  });

  return { history, totalCount };
};

export const purchaseBranchAddon = async (restaurantId: string, additionalSlots: number, paymentMethod: string) => {
  const activeSubscription = await Subscription.findOne({
    restaurant: restaurantId,
    status: { $in: ["Active", "Expiring Soon"] },
    isDelete: false
  }).populate("plan");

  if (!activeSubscription) {
    throw new Error("No active subscription found for this restaurant.");
  }

  const ratePerSlot = 699;
  const subtotal = additionalSlots * ratePerSlot;
  const gstAmount = Math.round(subtotal * 0.18);
  const totalAmount = subtotal + gstAmount;

  // Simulate payment processing (assuming success)
  const transactionId = `TXN-ADDON-${Date.now()}`;
  
  const payment = new Payment({
    restaurant: restaurantId,
    subscription: activeSubscription._id,
    transactionId,
    amount: totalAmount,
    taxAmount: gstAmount,
    currency: "INR",
    paymentDate: new Date(),
    paymentStatus: "Paid",
    paymentMethod,
    paymentType: "Gateway",
    notes: `Added ${additionalSlots} branch slots`,
  });
  await payment.save();

  // Update subscription
  activeSubscription.extraBranches = (activeSubscription.extraBranches || 0) + additionalSlots;
  activeSubscription.addonAmount = (activeSubscription.addonAmount || 0) + subtotal;
  await activeSubscription.save();

  // Log to history
  const history = new SubscriptionHistory({
    restaurant: restaurantId,
    subscription: activeSubscription._id,
    action: "Addon Added",
    details: `Purchased ${additionalSlots} additional branch slots`,
    addonName: "Branch Outlet Slot",
    addonQuantity: additionalSlots,
    amountPaid: totalAmount
  });
  await history.save();

  return {
    success: true,
    message: `Successfully purchased ${additionalSlots} additional branch slots.`,
    payment: {
      transactionId,
      amount: totalAmount,
      status: "Paid"
    },
    newCapacity: {
      maxBranches: activeSubscription.maxBranches,
      extraBranches: activeSubscription.extraBranches,
      totalCapacity: activeSubscription.maxBranches + activeSubscription.extraBranches
    }
  };
};
