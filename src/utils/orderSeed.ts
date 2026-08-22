import Order from "../models/Order";

export const seedOrders = async (): Promise<void> => {
    try {
        const count = await Order.countDocuments();
        if (count === 0) {
            const initialOrders = [
                {
                    orderId: "847",
                    table: "03",
                    time: "01:28 PM",
                    items: [
                        { name: "Chicken Biryani", qty: 1, price: 320 },
                        { name: "Masala Chai", qty: 2, price: 40 }
                    ],
                    notes: "Less spicy please",
                    subtotal: 400,
                    tax: 10,
                    charge: 0,
                    total: 420,
                    status: "new",
                    billingStatus: "unpaid",
                    waiter: "Unassigned"
                },
                {
                    orderId: "846",
                    table: "07",
                    time: "01:22 PM",
                    items: [
                        { name: "Chicken Biryani", qty: 4, price: 320 },
                        { name: "Dal Makhani", qty: 3, price: 160 },
                        { name: "Paneer Tikka", qty: 1, price: 180 },
                        { name: "Masala Chai", qty: 2, price: 40 }
                    ],
                    notes: "",
                    subtotal: 2020,
                    tax: 101,
                    charge: 0,
                    total: 2121,
                    status: "preparing",
                    billingStatus: "unpaid",
                    waiter: "Ravi M."
                },
                {
                    orderId: "845",
                    table: "01",
                    time: "01:15 PM",
                    items: [
                        { name: "Masala Dosa", qty: 5, price: 120 },
                        { name: "Filter Coffee", qty: 3, price: 40 }
                    ],
                    notes: "Allergy: peanuts",
                    subtotal: 720,
                    tax: 36,
                    charge: 0,
                    total: 756,
                    status: "preparing",
                    billingStatus: "unpaid",
                    waiter: "Rahul S."
                },
                {
                    orderId: "844",
                    table: "05",
                    time: "01:08 PM",
                    items: [
                        { name: "Paneer Tikka", qty: 2, price: 180 },
                        { name: "Chicken Biryani", qty: 1, price: 320 },
                        { name: "Butter Naan", qty: 3, price: 40 },
                        { name: "Masala Chai", qty: 2, price: 40 }
                    ],
                    notes: "",
                    subtotal: 880,
                    tax: 44,
                    charge: 0,
                    total: 924,
                    status: "ready",
                    billingStatus: "unpaid",
                    waiter: "Arjun K."
                },
                {
                    orderId: "843",
                    table: "02",
                    time: "01:00 PM",
                    items: [
                        { name: "Veg Thali", qty: 2, price: 120 },
                        { name: "Masala Chai", qty: 3, price: 40 }
                    ],
                    notes: "",
                    subtotal: 360,
                    tax: 18,
                    charge: 0,
                    total: 378,
                    status: "completed",
                    billingStatus: "paid",
                    waiter: "Ravi M."
                },
                {
                    orderId: "842",
                    table: "02",
                    time: "12:55 PM",
                    items: [
                        { name: "Chicken Biryani", qty: 2, price: 320 },
                        { name: "Dal Makhani", qty: 2, price: 160 },
                        { name: "Paneer Tikka", qty: 1, price: 180 },
                        { name: "Masala Chai", qty: 1, price: 40 }
                    ],
                    notes: "",
                    subtotal: 1180,
                    tax: 59,
                    charge: 0,
                    total: 1239,
                    status: "preparing",
                    billingStatus: "unpaid",
                    waiter: "Ravi M."
                }
            ];

            await Order.insertMany(initialOrders);
            console.log("🌱 Order collection seeded successfully.");
        }
    } catch (error) {
        console.error("❌ Error seeding orders:", error);
    }
};
