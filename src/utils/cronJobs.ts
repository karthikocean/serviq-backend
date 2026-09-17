import cron from 'node-cron';
import Restaurant from '../models/Restaurant';
import Subscription from '../models/Subscription';
import User from '../models/User';

export const startCronJobs = () => {
    // Run daily at midnight: 0 0 * * *
    cron.schedule('0 0 * * *', async () => {
        console.log('Running Cron Job for Subscriptions...');
        try {
            const currentDate = new Date();
            const next7Days = new Date();
            next7Days.setDate(currentDate.getDate() + 7);

            // 1. Scheduled to Active
            const scheduledSubscriptions = await Subscription.find({
                status: 'Scheduled',
                startDate: { $lte: currentDate },
                isDelete: false
            });

            for (const sub of scheduledSubscriptions) {
                sub.status = 'Active';
                sub.isActive = true;
                await sub.save();
            }

            // 2. Active / Cancelled -> Expired
            const expiredSubscriptions = await Subscription.find({
                status: { $in: ['Active', 'Cancelled'] },
                endDate: { $lt: currentDate },
                isDelete: false
            });

            const affectedRestaurants = new Set<string>();

            for (const sub of expiredSubscriptions) {
                sub.status = 'Expired';
                sub.isActive = false;
                await sub.save();
                affectedRestaurants.add(sub.restaurant.toString());
            }
            
            // Note: Scheduled -> Active could also affect restaurant status if it was expired.
            for (const sub of scheduledSubscriptions) {
                affectedRestaurants.add(sub.restaurant.toString());
            }

            // 3. Restaurant Access Enforcement
            for (const restId of affectedRestaurants) {
                const restaurant = await Restaurant.findById(restId);
                if (!restaurant) continue;

                // Check if restaurant has any subscription that grants access
                const validSubCount = await Subscription.countDocuments({
                    restaurant: restId,
                    $or: [
                        { status: 'Active' },
                        { status: 'Cancelled', endDate: { $gt: currentDate } }
                    ],
                    isDelete: false
                });

                if (validSubCount > 0) {
                    if (restaurant.status === 'Expired') {
                        restaurant.status = 'Active';
                        await restaurant.save();
                    }
                } else {
                    if (restaurant.status !== 'Expired') {
                        restaurant.status = 'Expired';
                        await restaurant.save();
                    }
                }
            }

            console.log(`Cron completed. Activated: ${scheduledSubscriptions.length}, Expired: ${expiredSubscriptions.length}`);

        } catch (error) {
            console.error('Error in Subscription Cron Job:', error);
        }
    });
};
