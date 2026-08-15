import Restaurant from "../../models/Restaurant";

export const getSettingsByRestaurantId = async (restaurantId: string) => {
  const restaurant = await Restaurant.findOne({ restaurantId });
  if (!restaurant) throw new Error("Restaurant not found");

  return {
    name: restaurant.restaurantName,
    tagline: restaurant.tagline,
    currency: restaurant.currency,
    gstNumber: restaurant.gstinNumber,
    fssaiNumber: restaurant.fssaiLicense,
    defaultTaxRate: restaurant.defaultTaxRate,
    openingTime: restaurant.openingTime,
    closingTime: restaurant.closingTime,
    themeColor: restaurant.themeColor,
    logoUrl: restaurant.logoUrl,
  };
};

export const updateSettingsByRestaurantId = async (restaurantId: string, updateData: any) => {
  const restaurant = await Restaurant.findOne({ restaurantId });
  if (!restaurant) throw new Error("Restaurant not found");

  if (updateData.name !== undefined) restaurant.restaurantName = updateData.name;
  if (updateData.tagline !== undefined) restaurant.tagline = updateData.tagline;
  if (updateData.currency !== undefined) restaurant.currency = updateData.currency;
  if (updateData.gstNumber !== undefined) restaurant.gstinNumber = updateData.gstNumber;
  if (updateData.fssaiNumber !== undefined) restaurant.fssaiLicense = updateData.fssaiNumber;
  if (updateData.defaultTaxRate !== undefined) restaurant.defaultTaxRate = updateData.defaultTaxRate;
  if (updateData.openingTime !== undefined) restaurant.openingTime = updateData.openingTime;
  if (updateData.closingTime !== undefined) restaurant.closingTime = updateData.closingTime;
  if (updateData.themeColor !== undefined) restaurant.themeColor = updateData.themeColor;
  if (updateData.logoUrl !== undefined) restaurant.logoUrl = updateData.logoUrl;

  await restaurant.save();
  return true;
};
