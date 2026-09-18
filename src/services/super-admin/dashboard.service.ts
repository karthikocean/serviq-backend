import Restaurant from "../../models/Restaurant";
import Subscription from "../../models/Subscription";
import Payment from "../../models/Payment";
import Plan from "../../models/Plan";

export const getDashboardMetrics = async () => {
    const totalRestaurants = await Restaurant.countDocuments({ isDelete: false });
    const activeRestaurants = await Restaurant.countDocuments({ isDelete: false, status: 'Active' });
    const inactiveRestaurants = totalRestaurants - activeRestaurants;

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const monthlyRevenueResult = await Payment.aggregate([
        { 
            $match: { 
                isDelete: false, 
                paymentStatus: "Paid",
                paymentDate: { $gte: startOfMonth }
            }
        },
        { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);
    const monthlyRevenue = monthlyRevenueResult.length > 0 ? monthlyRevenueResult[0].total : 0;

    const pendingPaymentsResult = await Payment.aggregate([
        { 
            $match: { 
                isDelete: false, 
                paymentStatus: "Pending"
            }
        },
        { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);
    const pendingPayments = pendingPaymentsResult.length > 0 ? pendingPaymentsResult[0].total : 0;

    const expiringSubscriptions = await Subscription.countDocuments({ 
        isDelete: false, 
        isActive: true,
        status: { $in: ["Expiring Soon", "Active"] },
        endDate: { $lte: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000) } // Expiring in 15 days
    });

    const expiringSubscriptionsCount = await Subscription.countDocuments({ 
        isDelete: false, 
        isActive: true,
        status: "Expiring Soon"
    });

    // Group active subscriptions by plan
    const planCountsResult = await Subscription.aggregate([
        { $match: { isDelete: false, isActive: true, status: { $in: ["Active", "Expiring Soon"] } } },
        { $group: { _id: "$plan", count: { $sum: 1 } } }
    ]);

    const plans = await Plan.find({ isDelete: false });
    
    const planCounts = plans.map(plan => {
        const found = planCountsResult.find(p => p._id.toString() === plan._id.toString());
        return {
            planName: plan.planName,
            count: found ? found.count : 0
        };
    });

    return {
        totalRestaurants,
        activeRestaurants,
        inactiveRestaurants,
        monthlyRevenue,
        pendingPayments,
        expiringSubscriptions: Math.max(expiringSubscriptions, expiringSubscriptionsCount),
        planCounts
    };
};

const isValidDateStr = (d?: string): boolean => {
    if (!d || d === "undefined" || d === "null" || d.trim() === "") return false;
    const parsed = Date.parse(d);
    return !isNaN(parsed);
};

export const getReportsAnalyticsData = async (dates?: { startDate?: string; endDate?: string }) => {
    const { startDate, endDate } = dates || {};
    const dateMatch: any = {};
    if (isValidDateStr(startDate)) {
        const start = new Date(startDate!);
        start.setUTCHours(0, 0, 0, 0);
        dateMatch.$gte = start;
    }
    if (isValidDateStr(endDate)) {
        const end = new Date(endDate!);
        end.setUTCHours(23, 59, 59, 999);
        dateMatch.$lte = end;
    }

    const paymentDateMatch = Object.keys(dateMatch).length > 0 ? { paymentDate: dateMatch } : {};
    const subDateMatch = Object.keys(dateMatch).length > 0 ? { createdAt: dateMatch } : {};

    // 1. Cumulative Revenue
    const cumulativeRevenueResult = await Payment.aggregate([
        { $match: { isDelete: false, paymentStatus: "Paid", ...paymentDateMatch } },
        { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);
    const cumulativeRevenue = cumulativeRevenueResult.length > 0 ? cumulativeRevenueResult[0].total : 0;
    
    const cumulativeRevenueGrowth = 24.5; // mocked growth

    // 2. Active Subscriptions
    const activeSubscriptionsCount = await Subscription.countDocuments({ isDelete: false, isActive: true, ...subDateMatch });
    const activeSubscriptionsGrowth = 12.3; // mocked growth

    // 3. Monthly Revenue Growth
    const currentYear = new Date().getFullYear();
    const monthlyRevenueMatch: any = {
        isDelete: false,
        paymentStatus: "Paid"
    };
    if (Object.keys(dateMatch).length > 0) {
        monthlyRevenueMatch.paymentDate = dateMatch;
    } else {
        monthlyRevenueMatch.paymentDate = {
            $gte: new Date(`${currentYear}-01-01`),
            $lt: new Date(`${currentYear + 1}-01-01`)
        };
    }

    const monthlyRevenueResult = await Payment.aggregate([
        { $match: monthlyRevenueMatch },
        {
            $group: {
                _id: { $month: "$paymentDate" },
                total: { $sum: "$amount" }
            }
        },
        { $sort: { _id: 1 } }
    ]);
    
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthlyRevenueGrowth = monthNames.map((month, index) => {
        const found = monthlyRevenueResult.find(m => m._id === index + 1);
        return {
            month,
            revenue: found ? found.total : 0
        };
    });

    // 4. Revenue by Subscription Plan & ARR
    const activeSubs = await Subscription.find({ isDelete: false, isActive: true, ...subDateMatch }).populate('plan');
    
    let totalArrEstimate = 0;
    const planStatsMap: Record<string, { activeCount: number, revenue: number }> = {};
    
    for (const sub of activeSubs) {
        const plan = sub.plan as any;
        const planName = plan ? plan.planName : "Unknown";
        
        if (!planStatsMap[planName]) {
            planStatsMap[planName] = { activeCount: 0, revenue: 0 };
        }
        planStatsMap[planName].activeCount += 1;
        
        const arr = sub.billingCycle === "Monthly" ? (sub.planPrice * 12) : sub.planPrice;
        totalArrEstimate += arr;
    }
    
    const paymentsWithSub = await Payment.find({ isDelete: false, paymentStatus: "Paid", ...paymentDateMatch }).populate({
        path: 'subscription',
        populate: { path: 'plan' }
    });
    
    for (const payment of paymentsWithSub) {
        if (payment.subscription) {
            const plan = (payment.subscription as any).plan;
            const planName = plan ? plan.planName : "Unknown";
            if (!planStatsMap[planName]) {
                planStatsMap[planName] = { activeCount: 0, revenue: 0 };
            }
            planStatsMap[planName].revenue += payment.amount;
        }
    }
    
    let totalPlanRevenue = 0;
    Object.values(planStatsMap).forEach(stat => totalPlanRevenue += stat.revenue);
    
    const revenueBySubscriptionPlan = Object.keys(planStatsMap).map(planName => {
        const stat = planStatsMap[planName];
        const percentage = totalPlanRevenue > 0 ? ((stat.revenue / totalPlanRevenue) * 100).toFixed(1) : 0;
        return {
            planName,
            activeCount: stat.activeCount,
            amount: stat.revenue,
            percentage: Number(percentage)
        };
    });

    const avgBillingRate = activeSubscriptionsCount > 0 ? (totalArrEstimate / activeSubscriptionsCount / 12).toFixed(2) : 0;

    return {
        cumulativeRevenue: {
            amount: cumulativeRevenue,
            growth: cumulativeRevenueGrowth
        },
        activeSubscriptions: {
            count: activeSubscriptionsCount,
            growth: activeSubscriptionsGrowth
        },
        monthlyRevenueGrowth,
        revenueBySubscriptionPlan,
        avgBillingRate: Number(avgBillingRate),
        totalArrEstimate
    };
};
