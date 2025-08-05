import VehicleCheckin from "../model/checkin.js";
import Price from "../model/price.js";
import uploadQR from "../utils/ImageLinker.js";
import QRCode from "qrcode";
import { v4 as uuidv4 } from "uuid";
import Staff from "../model/staff.js";
import mongoose from "mongoose";
// import { sendWhatsAppCheckIn } from "../utils/sendWhatsAppTemplate.js";

// ✅ Capitalize helper
const capitalize = (str) =>
  str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();

// ✅ Convert to IST string format
const convertToISTString = (date) => {
  return new Date(date).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
  });
};

const Checkin = async (req, res) => {
  try {
    const { name, vehicleNo, vehicleType, mobile, paymentMethod, days } =
      req.body;

    const user = req.user;
    if (
      !name ||
      !vehicleNo ||
      !vehicleType ||
      !mobile ||
      !paymentMethod ||
      !days
    ) {
      return res.status(400).json({ message: "All fields are required" });
    }
    console.log(user);
    const cleanedPlate = vehicleNo.replace(/\s/g, "").toUpperCase();
    const cleanedType = vehicleType.trim().toLowerCase();
    const userRole = user.role;
    const checkInBy = user._id;
    const adminId = userRole === "admin" ? checkInBy : user.adminId;

    // Check pricing
    const priceDoc = await Price.findOne({ adminId });
    if (!priceDoc || typeof priceDoc.dailyPrices !== "object") {
      return res
        .status(400)
        .json({ message: "Daily prices are not set for this admin." });
    }

    const rateStr = priceDoc.dailyPrices[cleanedType];
    if (!rateStr || rateStr === "0") {
      return res.status(400).json({
        message: ` Daily price for "${cleanedType}" is missing or zero.`,
      });
    }

    const rate = Number(rateStr);
    if (isNaN(rate)) {
      return res
        .status(400)
        .json({ message: `Rate for "${cleanedType}" is not a valid number.` });
    }

    // Prevent duplicate check-in
    const alreadyCheckedIn = await VehicleCheckin.findOne({
      vehicleNo: cleanedPlate,
      isCheckedOut: false,
    });

    if (alreadyCheckedIn) {
      return res.status(400).json({
        message: ` Vehicle ${cleanedPlate} is already checked in.`,
      });
    }

    // Generate token and QR
    const tokenId = uuidv4();
    const qrCodeBase64 = await QRCode.toDataURL(tokenId);
    // const url = await uploadQR(qrCodeBase64);

    // Save check-in
    const newCheckin = new VehicleCheckin({
      name,
      vehicleNo: cleanedPlate,
      vehicleType: cleanedType,
      mobile,
      paymentMethod,
      days,
      perDayRate: rate,
      paidDays: days,
      amount: rate * days,
      adminId,
      checkInBy,
      tokenId,
      qrCode: qrCodeBase64,
      isCheckedOut: false,
    });

    await newCheckin.save();

    // Send WhatsApp message with QR
    // try {
    //   const message = `✅ Hello ${name}, your ${cleanedType} (${cleanedPlate}) has been checked in for ${days} day(s).\n🧾 Total: ₹${
    //     rate * days
    //   }\n💳 Payment: ${paymentMethod}\n\n📎 Please scan the QR below to show your token.`;
    //   await sendWhatsAppCheckIn(mobile, url, message);
    // } catch (err) {
    //   console.warn("⚠ WhatsApp message failed:", err.message);
    // }

    return res.status(201).json({
      message: "✅ Vehicle checked in successfully",
      tokenId,
      qrCode: qrCodeBase64,
    });
  } catch (error) {
    console.error("❌ Check-in error:", error.message);
    return res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

const Checkout = async (req, res) => {
  try {
    const { tokenId, previewOnly } = req.body;
    const user = req.user;

    if (!tokenId) {
      return res.status(400).json({ message: "tokenId is required" });
    }

    const vehicle = await VehicleCheckin.findOne({ tokenId });

    if (!vehicle) {
      return res
        .status(404)
        .json({ message: "No check-in found with this tokenId" });
    }

    if (vehicle.isCheckedOut && !previewOnly) {
      return res.status(400).json({
        message: "Vehicle is already checked out",
        exitTimeIST: convertToISTString(vehicle.exitDateTime),
      });
    }

    if (vehicle.isCheckedOut) {
      return res.status(400).json({
        message: "Vehicle is already checked out",
        exitTimeIST: convertToISTString(vehicle.exitDateTime),
      });
    }

    // 2. Get adminId
    const userRole = user.role;
    const userId = user._id;
    const adminId = userRole === "admin" ? userId : user.adminId;

    // 3. Get pricing
    const priceData = await Price.findOne({ adminId });
    if (!priceData || typeof priceData.dailyPrices !== "object") {
      return res
        .status(404)
        .json({ message: "No daily pricing info found for this admin" });
    }

    const vehicleType = (vehicle.vehicleType || "").trim().toLowerCase();
    const priceStr = priceData.dailyPrices?.[vehicleType];
    const price = Number(priceStr);

    if (!priceStr || isNaN(price)) {
      return res
        .status(400)
        .json({ message: `Invalid or missing price for ${vehicleType}` });
    }

    // 4. Calculate date-based difference (no time, only date)
    const entryDate = new Date(vehicle.entryDateTime);
    const exitDate = new Date();

    const getDateOnly = (date) =>
      new Date(date.getFullYear(), date.getMonth(), date.getDate());

    const cleanEntry = getDateOnly(entryDate);
    const cleanExit = getDateOnly(exitDate);

    let usedDays = 0;
    let tempDate = new Date(cleanEntry);
    while (tempDate < cleanExit) {
      usedDays++;
      tempDate.setDate(tempDate.getDate() + 1);
    }
    usedDays = Math.max(1, usedDays);

    const paidDays = Number(vehicle.paidDays || 0);
    const paidAmount = paidDays * price;
    const extraDays = Math.max(0, usedDays - paidDays);
    const extraAmount = extraDays * price;
    const totalAmount = paidAmount + extraAmount;
    const readableDuration = ` ${usedDays} day${usedDays > 1 ? "s" : ""}`;

    // 👇 If previewOnly is true, just return the info without saving
    if (previewOnly) {
      return res.status(200).json({
        message: "Preview before checkout",
        data: {
          name: vehicle.name,
          mobileNumber: vehicle.mobile,
          vehicleType: vehicle.vehicleType,
          numberPlate: vehicle.vehicleNo,
          table: {
            entryDate: cleanEntry.toLocaleDateString(),
            currentDate: cleanExit.toLocaleDateString(),
            timeUsed: readableDuration,
            perDayRate: ` ₹${price}`,
            paidDays: vehicle.paidDays,
            paidAmount: `₹${paidAmount}`,
            extraDays: extraDays,
            extraAmount: ` ₹${extraAmount}`,
            totalAmount: `₹${totalAmount}`,
          },
        },
      });
    }

    // 5. Proceed to checkout
    vehicle.extraDays = extraDays;
    vehicle.extraAmount = extraAmount;
    vehicle.totalAmount = totalAmount;
    vehicle.exitDateTime = cleanExit;
    vehicle.totalParkedHours = `${usedDays * 24}`;
    vehicle.isCheckedOut = true;
    vehicle.checkedOutBy = user.name || user.username || "Unknown";
    vehicle.checkedOutByRole = userRole;

    await vehicle.save();

    // 6. Send WhatsApp message
    try {
      const msg = `🚗 Hello ${vehicle.name}, your ${vehicle.vehicleType} (${vehicle.vehicleNo}) has been successfully checked out.\n⏱ Duration: ${readableDuration}\n💰 Amount Paid: ₹${totalAmount}`;
      await sendWhatsAppMessage(vehicle.mobile, msg);
    } catch (err) {
      console.warn("⚠ WhatsApp message failed during checkout:", err.message);
    }

    // 7. Send final receipt
    res.status(200).json({
      message: "✅ Vehicle checked out successfully",
      receipt: {
        name: vehicle.name,
        mobileNumber: vehicle.mobile,
        vehicleType: vehicle.vehicleType,
        numberPlate: vehicle.vehicleNo,
        table: {
          entryDate: cleanEntry.toLocaleDateString(),
          exitDate: cleanExit.toLocaleDateString(),
          timeUsed: readableDuration,
          perDayRate: `₹${price}`,
          paidDays: vehicle.paidDays,
          paidAmount: `₹${paidAmount}`,
          extraDays: extraDays,
          extraAmount: `₹${extraAmount}`,
          totalAmount: `₹${totalAmount}`,
        },
      },
    });
  } catch (error) {
    console.error("Checkout error:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};
const getCheckins = async (req, res) => {
  try {
    const userId = req.query.staffId || req.user._id; // ✅ Use staffId if passed
    const { vehicle } = req.query;

    let query = {
      isCheckedOut: false,
      checkInBy: userId,
    };

    if (vehicle && vehicle !== "all") {
      query.vehicleType = vehicle;
    }

    const checkins = await VehicleCheckin.find(query).sort({
      entryDateTime: -1,
    });

    res.status(200).json({
      count: checkins.length,
      vehicle: checkins,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

const getCheckouts = async (req, res) => {
  try {
    const userId = req.query.staffId || req.user._id;

    const { vehicle } = req.query; // ✅ FIXED

    let query = {
      isCheckedOut: true,
      checkInBy: userId,
    };

    if (vehicle && vehicle !== "all") {
      query.vehicleType = vehicle;
    }

    const checkouts = await VehicleCheckin.find(query).sort({
      exitDateTime: -1,
    });

    res.status(200).json({
      count: checkouts.length,
      vehicle: checkouts,
    });
  } catch (error) {
    console.error("getCheckouts error:", error);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

const getVehicleList = async (req, res) => {
  try {
    const { isCheckedOut, vehicleType, numberPlate } = req.query;
    const userId = req.user._id;

    const query = { checkInBy: userId }; // ✅ Correct field name

    if (isCheckedOut === "true") query.isCheckedOut = true;
    else if (isCheckedOut === "false") query.isCheckedOut = false;

    if (vehicleType) query.vehicleType = vehicleType;
    if (numberPlate)
      query.vehicleNo = numberPlate.toUpperCase().replace(/\s/g, "");

    const vehicles = await VehicleCheckin.find(query).sort({
      entryDateTime: -1,
    });

    res.status(200).json({
      count: vehicles.length,
      vehicles,
    });
  } catch (error) {
    console.error("Vehicle list error:", error);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

const getTodayVehicle = async (req, res) => {
  try {
    const userId = req.user._id;

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const checkins = await VehicleCheckin.find({
      checkInBy: userId,
      isCheckedOut: false,
      entryDateTime: { $gte: startOfToday, $lte: endOfToday },
    });

    const checkouts = await VehicleCheckin.find({
      checkInBy: userId,
      isCheckedOut: true,
      entryDateTime: { $gte: startOfToday, $lte: endOfToday },
    });

    const allData = await VehicleCheckin.find({
      checkInBy: userId,
      $or: [
        { entryDateTime: { $gte: startOfToday, $lte: endOfToday } },
        { CheckOutTime: { $gte: startOfToday, $lte: endOfToday } },
      ],
    });

    const checkinsCount = checkins.reduce((acc, curr) => {
      acc[curr.vehicleType] = (acc[curr.vehicleType] || 0) + 1;
      return acc;
    }, {});

    const checkoutsCount = checkouts.reduce((acc, curr) => {
      acc[curr.vehicleType] = (acc[curr.vehicleType] || 0) + 1;
      return acc;
    }, {});
    const allDataCount = allData.reduce((acc, curr) => {
      acc[curr.vehicleType] = (acc[curr.vehicleType] || 0) + 1;
      return acc;
    }, {});

    const allDataTotalMoney = allData.reduce((acc, curr) => {
      acc[curr.vehicleType] = (acc[curr.vehicleType] || 0) + curr.amount;
      return acc;
    }, {});
    const moneyByPaymentMethod = allData.reduce((acc, curr) => {
      acc[curr.paymentMethod] = (acc[curr.paymentMethod] || 0) + curr.amount;
      return acc;
    }, {});
    const vehicleStats = {
      checkinsCount,
      checkoutsCount,
      allDataCount,
      money: allDataTotalMoney,
      PaymentMethod: moneyByPaymentMethod,
      fullData: {
        checkins,
        checkouts,
        allData,
      },
    };

    res.status(200).json(vehicleStats);
  } catch (error) {
    console.error("getTodayVehicleReport error:", error);
    res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

const getVehicleById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.query.staffId || req.user._id;
    const userRole = req.user.role;

    let query = { _id: id };

    // ✅ Use correct field names
    if (userRole === "admin") {
      query.adminId = userId;
    } else if (userRole === "staff") {
      query.checkInBy = userId;
    } else {
      return res.status(403).json({ message: "Invalid user role" });
    }

    const vehicle = await VehicleCheckin.findOne(query);

    if (!vehicle) {
      return res
        .status(404)
        .json({ message: "No vehicle found for your account with this ID" });
    }

    res.status(200).json({ vehicle });
  } catch (error) {
    console.error("getVehicleById error:", error);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

const getVehicleByPlate = async (req, res) => {
  try {
    const numberPlate = req.params.numberPlate.toUpperCase().replace(/\s/g, "");
    const userId = req.user._id;
    const userRole = req.user.role;

    let query = { vehicleNumber: numberPlate };

    if (userRole === "admin") {
      query.adminRefId = userId;
    } else if (userRole === "staff") {
      query.createdBy = userId;
    } else {
      return res.status(403).json({ message: "Invalid user role" });
    }

    const vehicles = await VehicleCheckin.find(query);

    if (!vehicles.length) {
      return res.status(404).json({
        message: "No vehicle found with this number plate for your account",
      });
    }

    res.status(200).json({ count: vehicles.length, vehicles });
  } catch (error) {
    console.error("getVehicleByPlate error:", error);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

// const getVehicleByToken = async (req, res) => {
//   try {
//     const { tokenId } = req.params;
//     const userId = new mongoose.Types.ObjectId(req.user._id); // ✅ Ensure it's ObjectId
//     const userRole = req.user.role;

//     let query = { tokenId };

//     if (userRole === "admin") {
//       query.adminRefId = userId;
//     } else if (userRole === "staff") {
//       query.createdBy = userId;
//     } else {
//       return res.status(403).json({ message: "Invalid user role" });
//     }

//     console.log("Query to MongoDB =>", query);

//     const vehicle = await VehicleCheckin.findOne(query);

//     if (!vehicle) {
//       return res.status(404).json({
//         message: "No vehicle found with this tokenId for your account",
//       });
//     }

//     res.status(200).json({ vehicle });
//   } catch (error) {
//     console.error("getVehicleByToken error:", error);
//     res
//       .status(500)
//       .json({ message: "Internal Server Error", error: error.message });
//   }
// };

const getVehicleByToken = async (req, res) => {
  try {
    const { tokenId } = req.params;
    const userId = new mongoose.Types.ObjectId(req.user._id);
    const userRole = req.user.role;

    let query = { tokenId };

    // ✅ Match with saved field names in Checkin
    if (userRole === "admin") {
      query.adminId = userId;
    } else if (userRole === "staff") {
      query.checkInBy = userId;
    } else {
      return res.status(403).json({ message: "Invalid user role" });
    }

    console.log("Query to MongoDB =>", query);

    const vehicle = await VehicleCheckin.findOne(query);

    if (!vehicle) {
      return res.status(404).json({
        message: "No vehicle found with this tokenId for your account",
      });
    }

    res.status(200).json({ vehicle });
  } catch (error) {
    console.error("getVehicleByToken error:", error);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

const getVehicleByNumberPlate = async (req, res) => {
  try {
    const numberPlate = req.params.numberPlate.toUpperCase().replace(/\s/g, "");
    const userId = req.user._id;

    const vehicles = await VehicleCheckin.find({
      vehicleNo: numberPlate,
      checkInBy: userId,
    });

    if (!vehicles.length) {
      return res.status(404).json({
        message: `No vehicles with this number plate for your account`,
      });
    }

    res.status(200).json({ count: vehicles.length, vehicles });
  } catch (error) {
    console.error("getVehicleByNumberPlate error:", error);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

const getRevenueReport = async (req, res) => {
  try {
    const { staffId } = req.query;
    const userId = req.user._id;
    const role = req.user.role;

    let filter = {};

    if (role === "staff") {
      filter.checkInBy = userId;
    } else if (role === "admin") {
      if (!staffId) {
        return res.status(400).json({ error: "staffId is required for admin" });
      }
      filter.checkInBy = staffId;
    }

    const vehicles = await VehicleCheckin.find(filter).sort({ date: -1 });

    const formattedVehicles = vehicles.map((v) => ({
      ...v._doc,
      date: v.date ? new Date(v.date).toISOString() : null,
    }));

    const revenue = vehicles.reduce((sum, v) => sum + v.amount, 0);

    res.json({
      role,
      totalVehicles: vehicles.length,
      revenue,
      vehicles: formattedVehicles,
    });
  } catch (err) {
    console.error("Error in getRevenueReport:", err);
    res.status(500).json({ error: "Server error" });
  }
};

export default {
  Checkin,
  Checkout,
  getCheckins,
  getCheckouts,
  getVehicleList,
  getTodayVehicle,
  getVehicleById,
  getVehicleByToken,
  getVehicleByNumberPlate,
  getRevenueReport,
  getVehicleByPlate,
};
