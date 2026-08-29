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
