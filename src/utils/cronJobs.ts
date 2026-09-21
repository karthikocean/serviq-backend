import cron from 'node-cron';
import Restaurant from '../models/Restaurant';
import Subscription from '../models/Subscription';
import User from '../models/User';
import SystemNotification from '../models/SystemNotification';
import { broadcastSystemNotificationSocket } from '../controllers/super-admin/system-notification.controller';

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

    // Run every minute for scheduled notifications: * * * * *
    cron.schedule('* * * * *', async () => {
        try {
            const scheduledNotifications = await SystemNotification.find({
                status: 'Scheduled',
                isScheduled: true
            });

            if (scheduledNotifications.length === 0) return;

            const now = new Date();

            for (const ntf of scheduledNotifications) {
                const { scheduledDate, scheduledTime } = ntf;
                if (!scheduledDate || !scheduledTime) continue;

                let year, month, day;
                if (scheduledDate.includes('-')) {
                    const parts = scheduledDate.split('-');
                    if (parts[0].length === 4) { // YYYY-MM-DD
                        year = parseInt(parts[0], 10);
                        month = parseInt(parts[1], 10) - 1;
                        day = parseInt(parts[2], 10);
                    } else if (parts[2].length === 4) { // DD-MM-YYYY
                        day = parseInt(parts[0], 10);
                        month = parseInt(parts[1], 10) - 1;
                        year = parseInt(parts[2], 10);
                    }
                } else {
                    const fallbackDate = new Date(`${scheduledDate} ${scheduledTime}`);
                    if (!isNaN(fallbackDate.getTime()) && fallbackDate <= now) {
                        ntf.status = 'Sent';
                        await ntf.save();
                        await broadcastSystemNotificationSocket(ntf);
                    }
                    continue;
                }

                let hours = 0, minutes = 0;
                const timeRegex = /(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)?/;
                const timeMatch = scheduledTime.match(timeRegex);
                if (timeMatch) {
                    hours = parseInt(timeMatch[1], 10);
                    minutes = parseInt(timeMatch[2], 10);
                    const modifier = timeMatch[3];
                    if (modifier) {
                        const mod = modifier.toUpperCase();
                        if (mod === 'PM' && hours < 12) hours += 12;
                        if (mod === 'AM' && hours === 12) hours = 0;
                    }
                }

                if (year !== undefined && month !== undefined && day !== undefined) {
                    const notifDateTime = new Date(year, month, day, hours, minutes, 0, 0);
                    if (notifDateTime <= now) {
                        ntf.status = 'Sent';
                        await ntf.save();
                        await broadcastSystemNotificationSocket(ntf);
                    }
                }
            }
        } catch (error) {
            console.error('Error in Scheduled Notifications Cron Job:', error);
        }
    });
};
