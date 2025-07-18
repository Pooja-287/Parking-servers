import VehicleCheckin from "../model/checkin.js";
import Price from "../model/price.js";
import uploadQR from "../utils/ImageLinker.js";
import QRCode from "qrcode";
import { v4 as uuidv4 } from "uuid";
import Staff from "../model/staff.js";
import mongoose from "mongoose";
import { sendWhatsAppTemplate } from "../utils/sendWhatsAppTemplate.js";

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
    const {
      name,
      vehicleNo,
      vehicleType,
      mobile,
      paymentMethod,
      days,
    } = req.body;

    const user = req.user;

    // ✅ Validate required fields
    if (!name || !vehicleType || !vehicleNo || !mobile || !paymentMethod || !days) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // ✅ Clean & validate vehicle number
    const cleanedPlate = vehicleNo.replace(/\s/g, "").toUpperCase();

    if (vehicleNo !== cleanedPlate) {
      return res.status(400).json({
        message: "Number plate must be in UPPERCASE without spaces.",
      });
    }

    // ✅ Clean vehicle type safely
    const cleanedType = (vehicleType || "").trim().toLowerCase();

    const userRole = user.role;
    const checkInBy = user._id;
    const adminId = userRole === "admin" ? checkInBy : user.adminId;

    // ✅ Fetch price document
    const priceDoc = await Price.findOne({ adminId });

    // 🪵 Debug logs
    console.log("🧾 priceDoc:", priceDoc);
    console.log("🚗 vehicleType:", cleanedType);
    console.log("🔑 dailyPrices keys:", Object.keys(priceDoc?.dailyPrices || {}));
    console.log("💰 rate value:", priceDoc?.dailyPrices?.[cleanedType]);

    // ✅ Guard clause for missing dailyPrices
    if (!priceDoc || typeof priceDoc.dailyPrices !== "object") {
      return res.status(400).json({
        message: "Daily prices are not set for this admin.",
      });
    }

    // ✅ Get rate for cleaned vehicle type
    const rateStr = priceDoc.dailyPrices[cleanedType];

    if (!rateStr || rateStr === "0") {
      return res.status(400).json({
        message: `Daily price for "${cleanedType}" is missing or zero.`,
      });
    }

    const rate = Number(rateStr);

    if (isNaN(rate)) {
      return res.status(400).json({
        message: `Rate for "${cleanedType}" is not a valid number.`,
      });
    }

    // ✅ Check if already checked in
    const alreadyCheckedIn = await VehicleCheckin.findOne({
      vehicleNo: cleanedPlate,
      isCheckedOut: false,
    });

    if (alreadyCheckedIn) {
      return res.status(400).json({
        message: `Vehicle ${cleanedPlate} is already checked in since ${convertToISTString(
          alreadyCheckedIn.createdAt
        )}`,
      });
    }

    // ✅ Generate token & QR
    const tokenId = uuidv4();
    const qrCode = await QRCode.toDataURL(tokenId);

    // ✅ Save check-in data
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
      qrCode,
      isCheckedOut: false,
    });

    await newCheckin.save();

    return res.status(201).json({
      message: "✅ Vehicle checked in successfully",
      tokenId,
    });
  } catch (error) {
    console.error("❌ Check-in error:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};





const Checkout = async (req, res) => {
  try {
    const { tokenId } = req.body;
    const user = req.user;

    if (!tokenId) {
      return res.status(400).json({ message: "tokenId is required" });
    }

    // 1. Find check-in record
    const vehicle = await VehicleCheckin.findOne({ tokenId });

    if (!vehicle) {
      return res
        .status(404)
        .json({ message: "No check-in found with this tokenId" });
    }

    if (vehicle.isCheckedOut) {
      return res.status(400).json({
        message: "Vehicle is already checked out",
        exitTimeIST: convertToISTString(vehicle.exitDateTime),
      });
    }

    // 2. Get adminId from user (middleware)
    const userRole = user.role;
    const userId = user._id;
    const adminId = userRole === "admin" ? userId : user.adminId;

    // 3. Get pricing info
    const priceData = await Price.findOne({ adminId });

    if (!priceData || typeof priceData.dailyPrices !== "object") {
      return res.status(404).json({ message: "No daily pricing info found for this admin" });
    }

    // ✅ Clean vehicleType before using it as key
    const vehicleType = (vehicle.vehicleType || "").trim().toLowerCase();

    // ✅ Get rate from dailyPrices
    const priceStr = priceData.dailyPrices?.[vehicleType];
    const price = Number(priceStr);

    if (!priceStr || isNaN(price)) {
      return res.status(400).json({ message: `Invalid or missing price for ${vehicleType}` });
    }

    // 4. Calculate charges
    const exitTime = new Date();
    const entryTime = new Date(vehicle.entryDateTime);
    const timeDiffMs = exitTime - entryTime;
    const minutesUsed = timeDiffMs / (1000 * 60);

    let totalAmount = 0;
    let readableDuration = "";

    // Default to perDay pricing
    const priceType = priceData.priceType || "perDay";

    if (priceType === "perHour") {
      const pricePerMinute = price / 60;
      const chargeableMinutes = Math.max(1, Math.ceil(minutesUsed));
      totalAmount = parseFloat((chargeableMinutes * pricePerMinute).toFixed(2));
      readableDuration = `${chargeableMinutes} minute${chargeableMinutes > 1 ? "s" : ""}`;
    } else {
      const days = timeDiffMs / (1000 * 60 * 60 * 24);
      const chargeableDays = Math.max(1, Math.ceil(days));
      totalAmount = chargeableDays * price;
      readableDuration = `${chargeableDays} day${chargeableDays > 1 ? "s" : ""}`;
    }

    // 5. Update checkout details
    vehicle.exitDateTime = exitTime;
    vehicle.totalAmount = totalAmount;
    vehicle.totalParkedHours = (timeDiffMs / (1000 * 60 * 60)).toFixed(2);
    vehicle.isCheckedOut = true;
    vehicle.checkedOutBy = user.name || user.username || "Unknown";
    vehicle.checkedOutByRole = userRole;

    await vehicle.save();

    // 6. Respond with receipt
    res.status(200).json({
      message: "✅ Vehicle checked out successfully",
      receipt: {
        name: vehicle.name,
        mobileNumber: vehicle.mobile,
        vehicleType: vehicle.vehicleType,
        numberPlate: vehicle.vehicleNo,
        table: {
          entryTime: entryTime.toLocaleTimeString(),
          exitTime: exitTime.toLocaleTimeString(),
          timeUsed: readableDuration,
          priceType: priceType,
          price: `₹${price}`,
          amountPaid: `₹${totalAmount}`,
        },
      },
    });
  } catch (error) {
    console.error("❌ Checkout error:", error);
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

    if (role === 'staff') {
      filter.checkInBy = userId;
    } else if (role === 'admin') {
      if (!staffId) {
        return res.status(400).json({ error: 'staffId is required for admin' });
      }
      filter.checkInBy = staffId;
    }

    const vehicles = await VehicleCheckin.find(filter).sort({ date: -1 });

    const formattedVehicles = vehicles.map(v => ({
      ...v._doc,
      date: v.date ? new Date(v.date).toISOString() : null
    }));

    const revenue = vehicles.reduce((sum, v) => sum + v.amount, 0);

    res.json({
      role,
      totalVehicles: vehicles.length,
      revenue,
      vehicles: formattedVehicles,
    });
  } catch (err) {
    console.error('Error in getRevenueReport:', err);
    res.status(500).json({ error: 'Server error' });
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
