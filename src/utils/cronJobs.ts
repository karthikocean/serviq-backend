import cron from 'node-cron';
import Restaurant from '../models/Restaurant';
import Subscription from '../models/Subscription';
import User from '../models/User';

export const startCronJobs = () => {
    // Run daily at midnight: 0 0 * * *
    cron.schedule('0 0 * * *', async () => {
        console.log('Running Cron Job to check expired plans...');
        try {
            const currentDate = new Date();
            const next7Days = new Date();
            next7Days.setDate(currentDate.getDate() + 7);

            // Find Subscriptions where endDate is less than currentDate and status is not already Expired or Cancelled
            const expiredSubscriptions = await Subscription.find({
                endDate: { $lt: currentDate },
                status: { $nin: ['Expired', 'Cancelled'] }
            });

            for (const sub of expiredSubscriptions) {
                // Update Subscription to Expired
                sub.status = 'Expired';
                sub.isActive = false;
                await sub.save();

                // Update related Restaurant to Expired
                const restaurant = await Restaurant.findById(sub.restaurant);
                if (restaurant) {
                    restaurant.status = 'Expired';
                    await restaurant.save();
                }
            }

            // Find Subscriptions expiring soon (within 7 days)
            const expiringSoonUpdate = await Subscription.updateMany(
                { 
                    endDate: { $gte: currentDate, $lte: next7Days }, 
                    status: "Active",
                    isDelete: false 
                },
                { $set: { status: "Expiring Soon" } }
            );

            if (expiredSubscriptions.length > 0) {
                console.log(`Successfully updated ${expiredSubscriptions.length} expired subscriptions and related restaurants.`);
            } else {
                console.log('No expired subscriptions found.');
            }
            if (expiringSoonUpdate.modifiedCount > 0) {
                console.log(`Marked ${expiringSoonUpdate.modifiedCount} subscriptions as Expiring Soon.`);
            }

        } catch (error) {
            console.error('Error in Expired Plan Cron Job:', error);
        }
    });
};
