import Table from "../../models/Table";
import QrCode from "../../models/QrCode";
import crypto from "crypto";

export const getTables = async (restaurantId: string, branchId: string) => {
  return await Table.find({ restaurantId, branchId, isDelete: false }).populate("assignedWaiter", "name phoneNumber");
};

export const createTable = async (restaurantId: string, branchId: string, tableData: any) => {
  const existing = await Table.findOne({ restaurantId, branchId, tableNumber: tableData.tableNumber, isDelete: false });
  if (existing) throw new Error("Table number already exists");

  const newTable = new Table({
    ...tableData,
    restaurantId,
    branchId
  });
  await newTable.save();
  
  // Automatically generate QR code for the new table
  await generateQRsForTables(restaurantId, branchId, [newTable._id.toString()]);
  
  const updatedTable = await Table.findById(newTable._id);
  return updatedTable;
};

export const updateTable = async (restaurantId: string, branchId: string, tableId: string, tableData: any) => {
  const table = await Table.findOne({ _id: tableId, restaurantId, branchId, isDelete: false });
  if (!table) throw new Error("Table not found");

  if (tableData.tableNumber && tableData.tableNumber !== table.tableNumber) {
    const existing = await Table.findOne({ restaurantId, branchId, tableNumber: tableData.tableNumber, isDelete: false });
    if (existing) throw new Error("Table number already exists");
  }

  if (tableData.tableNumber !== undefined) table.tableNumber = tableData.tableNumber;
  if (tableData.seatingCapacity !== undefined) table.seatingCapacity = tableData.seatingCapacity;
  if (tableData.section !== undefined) table.section = tableData.section;
  if (tableData.assignedWaiter !== undefined) table.assignedWaiter = tableData.assignedWaiter;
  if (tableData.status !== undefined) table.status = tableData.status;
  if (tableData.isActive !== undefined) table.isActive = tableData.isActive;

  await table.save();
  return table;
};

export const deleteTable = async (restaurantId: string, branchId: string, tableId: string) => {
  const table = await Table.findOne({ _id: tableId, restaurantId, branchId, isDelete: false });
  if (!table) throw new Error("Table not found");

  table.isDelete = true;
  table.isActive = false;
  await table.save();
  return true;
};

export const generateQRsForTables = async (restaurantId: string, branchId: string, tableIds: string[]) => {
  const tables = await Table.find({ _id: { $in: tableIds }, restaurantId, branchId, isDelete: false });
  if (tables.length === 0) throw new Error("No valid tables found");

  const qrCodesGenerated = [];

  for (const table of tables) {
    // We create a unique QR string or URL
    const uniqueHash = crypto.randomBytes(16).toString("hex");
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const qrUrl = `${frontendUrl}/menu/${restaurantId}/${branchId}?table=${table._id}&hash=${uniqueHash}`;
    
    let qr = null;
    if (table.assignedQrId) {
       qr = await QrCode.findById(table.assignedQrId);
    }
    
    if (qr) {
       qr.qrUrl = qrUrl;
       await qr.save();
    } else {
       qr = new QrCode({
         restaurantId,
         branchId,
         tableId: table._id,
         qrCodeId: uniqueHash,
         qrUrl: qrUrl,
         status: "Assigned"
       });
       await qr.save();
       table.assignedQrId = qr._id as any;
    }
    
    table.qrUrl = qrUrl;
    await table.save();
    
    qrCodesGenerated.push({ tableId: table._id, tableNumber: table.tableNumber, qrUrl });
  }

  return qrCodesGenerated;
};
