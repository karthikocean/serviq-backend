import Restaurant from "../../models/Restaurant";

export const getSettingsByRestaurantId = async (restaurantId: string) => {
  const restaurant = await Restaurant.findOne({ _id: restaurantId });
  if (!restaurant) throw new Error("Restaurant not found");

  return {
    restaurantName: restaurant.restaurantName,
    ownerName: restaurant.ownerName,
    email: restaurant.email,
    phoneNumber: restaurant.phoneNumber,
    websiteDomain: restaurant.websiteDomain,
    address: restaurant.address,
    city: restaurant.city,
    state: restaurant.state,
    country: restaurant.country,
    tagline: restaurant.tagline,
    currency: restaurant.currency,
    gstinNumber: restaurant.gstinNumber,
    panNumber: restaurant.panNumber,
    fssaiLicense: restaurant.fssaiLicense,
    defaultTaxRate: restaurant.defaultTaxRate,
    openingTime: restaurant.openingTime,
    closingTime: restaurant.closingTime,
    themeColor: restaurant.themeColor,
    logoUrl: restaurant.logoUrl,
  };
};

export const updateSettingsByRestaurantId = async (restaurantId: string, updateData: any) => {
  const restaurant = await Restaurant.findOne({ _id: restaurantId });
  if (!restaurant) throw new Error("Restaurant not found");

  if (updateData.name !== undefined) restaurant.restaurantName = updateData.name;
  if (updateData.ownerName !== undefined) restaurant.ownerName = updateData.ownerName;
  if (updateData.email !== undefined) restaurant.email = updateData.email;
  if (updateData.phoneNumber !== undefined) restaurant.phoneNumber = updateData.phoneNumber;
  if (updateData.websiteDomain !== undefined) restaurant.websiteDomain = updateData.websiteDomain;
  if (updateData.address !== undefined) restaurant.address = updateData.address;
  if (updateData.city !== undefined) restaurant.city = updateData.city;
  if (updateData.state !== undefined) restaurant.state = updateData.state;
  if (updateData.country !== undefined) restaurant.country = updateData.country;
  
  if (updateData.tagline !== undefined) restaurant.tagline = updateData.tagline;
  if (updateData.currency !== undefined) restaurant.currency = updateData.currency;
  if (updateData.gstinNumber !== undefined) restaurant.gstinNumber = updateData.gstinNumber;
  if (updateData.panNumber !== undefined) restaurant.panNumber = updateData.panNumber;
  if (updateData.fssaiLicense !== undefined) restaurant.fssaiLicense = updateData.fssaiLicense;
  
  if (updateData.openingTime !== undefined) restaurant.openingTime = updateData.openingTime;
  if (updateData.closingTime !== undefined) restaurant.closingTime = updateData.closingTime;
  if (updateData.themeColor !== undefined) restaurant.themeColor = updateData.themeColor;
  if (updateData.logoUrl !== undefined) restaurant.logoUrl = updateData.logoUrl;

  await restaurant.save();
  return true;
};
