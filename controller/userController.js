// import Admin from '../model/admin'
import Admin from "../model/admin.js";
import Price from "../model/price.js";
import Staff from "../model/staff.js";
import checkin from "../model/checkin.js";
import monthlyPass from "../model/monthlyPass.js";

import bcrypt from "bcryptjs";
// import Price from '../model/price'
import jwt from "jsonwebtoken";
const SECRET_KEY = "your_secret_key";

const updateDailyPrices = async (req, res) => {
  try {
    const { adminId, dailyPrices } = req.body;

    if (!adminId || !dailyPrices) {
      return res
        .status(400)
        .json({ error: "adminId and dailyPrices are required" });
    }

    let priceDoc = await Price.findOne({ adminId });

    if (!priceDoc) {
      // Create new document with dailyPrices
      priceDoc = new Price({ adminId, dailyPrices });
      await priceDoc.save();
      return res
        .status(201)
        .json({ message: "Daily prices created", data: priceDoc });
    }

    // Update dailyPrices if doc exists
    priceDoc.dailyPrices = dailyPrices;
    await priceDoc.save();

    return res
      .status(200)
      .json({ message: "Daily prices updated", data: priceDoc });
  } catch (err) {
    console.error("Daily Price Upsert Error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};
const updateMonthlyPrices = async (req, res) => {
  try {
    const { adminId, monthlyPrices } = req.body;

    if (!adminId || !monthlyPrices) {
      return res
        .status(400)
        .json({ error: "adminId and monthlyPrices are required" });
    }

    let priceDoc = await Price.findOne({ adminId });

    if (!priceDoc) {
      // Create new document with monthlyPrices
      priceDoc = new Price({ adminId, monthlyPrices });
      await priceDoc.save();
      return res
        .status(201)
        .json({ message: "Monthly prices created", data: priceDoc });
    }

    // Update monthlyPrices if doc exists
    priceDoc.monthlyPrices = monthlyPrices;
    await priceDoc.save();

    return res
      .status(200)
      .json({ message: "Monthly prices updated", data: priceDoc });
  } catch (err) {
    console.error("Monthly Price Upsert Error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

const getPrices = async (req, res) => {
  try {
    const user = req.user;
    const adminId = user.role === "admin" ? user._id : user.adminId;
    if (!adminId) {
      return res.status(400).json({ message: "Admin ID is required" });
    }

    const priceDoc = await Price.findOne({ adminId });

    if (!priceDoc) {
      return res.status(404).json({ message: "Price not found for the admin" });
    }
    res.status(200).json(priceDoc);
  } catch (error) {
    console.error("❌ Error in getPrice:", error.message);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

const registerAdmin = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const profileImage = req.file ? req.file.path : null; // Optional image

    // Check required fields
    if (!username || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Check for existing admin
    const existingAdmin = await Admin.findOne({
      $or: [{ username }, { email }],
    });
    if (existingAdmin) {
      return res
        .status(400)
        .json({ message: "Username or email already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new admin with optional image
    const newAdmin = new Admin({
      username,
      email,
      password: hashedPassword,
      profileImage, // Will be null if not provided
    });

    await newAdmin.save();

    // JWT token
    const token = jwt.sign(
      { id: newAdmin._id, username: newAdmin.username, role: newAdmin.role },
      SECRET_KEY,
      { expiresIn: "1d" }
    );

    // Response
    res.status(201).json({
      message: "Admin registered successfully",
      token,
      admin: {
        id: newAdmin._id,
        username: newAdmin.username,
        email: newAdmin.email,
        role: newAdmin.role,
        profileImage: newAdmin.profileImage, // could be null
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const loginUser = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res
        .status(400)
        .json({ message: "Username and password are required" });
    }

    let user = await Admin.findOne({ username });
    let role = "admin";

    if (!user) {
      user = await Staff.findOne({ username });
      role = "staff";
    }

    if (!user) {
      return res
        .status(401)
        .json({ message: "Invalid username or password (user not found)" });
    }

    // ✅ Compare with correct hashed field
    const hashed = role === "admin" ? user.password : user.hashedPassword;

    const isPasswordValid = await bcrypt.compare(password, hashed);
    if (!isPasswordValid) {
      return res
        .status(401)
        .json({ message: "Invalid username or password (wrong password)" });
    }

    const token = jwt.sign(
      { id: user._id, username: user.username, role },
      SECRET_KEY,
      { expiresIn: "1d" }
    );

    return res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        username: user.username,
        role,
        email: user.email || null,
        profileImage: user.profileImage || null,
        // Permissions: user.Permissions || []
        permissions: user.permissions, // ✅ Must be added
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

const viewProfile = async (req, res) => {
  try {
    const { _id, role } = req.user;
    let user = null;

    if (role === "admin") {
      user = await Admin.findById(_id).select("-password");
    } else if (role === "staff") {
      user = await Staff.findById(_id).select("-password");
    }
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }
    res.status(200).json({ message: "Profile fetched successfully", user });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

const getAllAdmins = async (req, res) => {
  try {
    const admins = await Admin.find({}, "-password"); // exclude password
    res.status(200).json(admins);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching admins", error: error.message });
  }
};

// Get single admin by ID
const getAdminById = async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.id, "-password");
    if (!admin) return res.status(404).json({ message: "Admin not found" });

    res.status(200).json(admin);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching admin", error: error.message });
  }
};

const updateAdmin = async (req, res) => {
  try {
    const { username, password, profileImage } = req.body;

    const updateData = {};
    if (username?.trim()) {
      updateData.username = username.trim();
    }

    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    if (profileImage?.startsWith("data:image")) {
      updateData.profileImage = profileImage; // base64
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid fields provided for update",
      });
    }

    const updatedAdmin = await Admin.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updatedAdmin) {
      return res
        .status(404)
        .json({ success: false, message: "Admin not found" });
    }

    res.status(200).json({
      success: true,
      message: "Admin updated",
      admin: updatedAdmin,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating admin",
      error: error.message,
    });
  }
};

// Delete admin
const deleteAdmin = async (req, res) => {
  try {
    const deleted = await Admin.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Admin not found" });

    res.status(200).json({ message: "Admin deleted" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error deleting admin", error: error.message });
  }
};

const getDashboardData = async (req, res) => {
  try {
    const userId = req.user._id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const admin = await Admin.findById(userId);
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    const { date } = req.query;
    const selectedDate = date ? new Date(date) : new Date();
    selectedDate.setHours(0, 0, 0, 0);
    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Check-ins
    const checkinsAggregate = await checkin.aggregate([
      {
        $match: {
          adminId: userId.toString(),
          entryDateTime: { $gte: selectedDate, $lte: endOfDay },
        },
      },
      {
        $group: {
          _id: "$vehicleType",
          count: { $sum: 1 },
          totalAmount: { $sum: "$amount" },
        },
      },
    ]);

    const checkins = {};
    const checkinsRevenue = {};
    checkinsAggregate.forEach((item) => {
      checkins[item._id] = item.count;
      checkinsRevenue[item._id] = item.totalAmount;
    });

    // Check-outs
    const checkoutsAggregate = await checkin.aggregate([
      {
        $match: {
          adminId: userId.toString(),
          isCheckedOut: true,
          CheckOutTime: { $gte: selectedDate, $lte: endOfDay },
        },
      },
      {
        $group: {
          _id: "$vehicleType",
          count: { $sum: 1 },
          totalExtraAmount: { $sum: "$extraAmount" },
        },
      },
    ]);

    const checkouts = {};
    const checkoutsRevenue = {};
    checkoutsAggregate.forEach((item) => {
      checkouts[item._id] = item.count;
      checkoutsRevenue[item._id] = item.totalExtraAmount;
    });

    const allVehicleTypes = new Set([
      ...Object.keys(checkins),
      ...Object.keys(checkouts),
    ]);

    const VehicleTotalMoney = {};
    allVehicleTypes.forEach((vt) => {
      VehicleTotalMoney[vt] =
        (checkinsRevenue[vt] || 0) + (checkoutsRevenue[vt] || 0);
    });

    // Payment method totals
    const paymentCheckinsAggregate = await checkin.aggregate([
      {
        $match: {
          adminId: userId.toString(),
          entryDateTime: { $gte: selectedDate, $lte: endOfDay },
        },
      },
      { $group: { _id: "$paymentMethod", total: { $sum: "$amount" } } },
    ]);
    const paymentFromCheckins = {};
    paymentCheckinsAggregate.forEach((item) => {
      paymentFromCheckins[item._id] = item.total;
    });

    const paymentCheckoutsAggregate = await checkin.aggregate([
      {
        $match: {
          adminId: userId.toString(),
          isCheckedOut: true,
          CheckOutTime: { $gte: selectedDate, $lte: endOfDay },
        },
      },
      { $group: { _id: "$paymentMethod", total: { $sum: "$extraAmount" } } },
    ]);
    const paymentFromCheckouts = {};
    paymentCheckoutsAggregate.forEach((item) => {
      paymentFromCheckouts[item._id] = item.total;
    });

    const allPaymentMethods = new Set([
      ...Object.keys(paymentFromCheckins),
      ...Object.keys(paymentFromCheckouts),
    ]);

    const PaymentMethod = {};
    allPaymentMethods.forEach((pm) => {
      PaymentMethod[pm] =
        (paymentFromCheckins[pm] || 0) + (paymentFromCheckouts[pm] || 0);
    });

    // Staff Performance
    const staffCheckinsAggregate = await checkin.aggregate([
      {
        $match: {
          adminId: userId.toString(),
          entryDateTime: { $gte: selectedDate, $lte: endOfDay },
        },
      },
      {
        $group: {
          _id: "$checkInBy",
          checkIns: { $sum: 1 },
          revenue: { $sum: "$amount" },
        },
      },
    ]);

    const staffCheckoutsAggregate = await checkin.aggregate([
      {
        $match: {
          adminId: userId.toString(),
          isCheckedOut: true,
          CheckOutTime: { $gte: selectedDate, $lte: endOfDay },
        },
      },
      {
        $group: {
          _id: "$checkOutBy",
          checkOuts: { $sum: 1 },
          revenue: { $sum: "$extraAmount" },
        },
      },
    ]);

    const staffPerformance = {};
    staffCheckinsAggregate.forEach((item) => {
      staffPerformance[item._id] = {
        userId: item._id,
        checkIns: item.checkIns,
        checkOuts: 0,
        revenue: item.revenue,
      };
    });

    staffCheckoutsAggregate.forEach((item) => {
      if (staffPerformance[item._id]) {
        staffPerformance[item._id].checkOuts += item.checkOuts;
        staffPerformance[item._id].revenue += item.revenue;
      } else {
        staffPerformance[item._id] = {
          userId: item._id,
          checkIns: 0,
          checkOuts: item.checkOuts,
          revenue: item.revenue,
        };
      }
    });

    const staffIds = Object.keys(staffPerformance);
    const staffFromAdmin = await Admin.find({ _id: { $in: staffIds } }).select(
      "username role"
    );
    const staffFromStaff = await Staff.find({ _id: { $in: staffIds } }).select(
      "username role"
    );

    const staffMap = {};
    [...staffFromAdmin, ...staffFromStaff].forEach((user) => {
      staffMap[user._id.toString()] = {
        username: user.username,
        role: user.role,
      };
    });

    const staffData = Object.values(staffPerformance).map((staff) => ({
      username: staffMap[staff.userId]?.username || "Unknown",
      userRole: staffMap[staff.userId]?.role || "Unknown",
      checkIns: staff.checkIns,
      checkOuts: staff.checkOuts,
      revenue: staff.revenue,
    }));

    // Transaction Logs
    const checkinLogs = await checkin
      .find({
        adminId: userId.toString(),
        entryDateTime: { $gte: selectedDate, $lte: endOfDay },
      })
      .select("name vehicleType entryDateTime checkInBy amount paymentMethod");

    const checkoutLogs = await checkin
      .find({
        adminId: userId.toString(),
        isCheckedOut: true,
        CheckOutTime: { $gte: selectedDate, $lte: endOfDay },
      })
      .select(
        "name vehicleType CheckOutTime checkOutBy extraAmount paymentMethod"
      );

    const transactionLogsRaw = [
      ...checkinLogs.map((log) => ({
        id: log._id.toString(),
        uname: log.name || "",
        type: "checkin",
        vehicleType: log.vehicleType,
        timestamp: log.entryDateTime,
        staffId: log.checkInBy,
        amount: log.amount,
        paymentMethod: log.paymentMethod,
      })),
      ...checkoutLogs.map((log) => ({
        id: log._id.toString(),
        uname: log.name || "",
        type: "checkout",
        vehicleType: log.vehicleType,
        timestamp: log.CheckOutTime,
        staffId: log.checkOutBy,
        amount: log.extraAmount,
        paymentMethod: log.paymentMethod,
      })),
    ];

    const allLogStaffIds = [
      ...new Set(transactionLogsRaw.map((log) => log.staffId?.toString())),
    ];

    const logStaffFromAdmin = await Admin.find({
      _id: { $in: allLogStaffIds },
    }).select("username role");
    const logStaffFromStaff = await Staff.find({
      _id: { $in: allLogStaffIds },
    }).select("username role");

    const logStaffMap = {};
    [...logStaffFromAdmin, ...logStaffFromStaff].forEach((user) => {
      logStaffMap[user._id.toString()] = {
        username: user.username,
        role: user.role,
      };
    });

    const transactionLogs = transactionLogsRaw.map((log) => ({
      ...log,
      staff: logStaffMap[log.staffId]?.username || "Unknown",
      userRole: logStaffMap[log.staffId]?.role || "Unknown",
    }));

    const allData = { ...checkins };

    return res.status(200).json({
      success: true,
      data: {
        date: selectedDate.toISOString().slice(0, 10),
        checkins,
        checkouts,
        allData,
        VehicleTotalMoney,
        PaymentMethod,
        staffData,
        transactionLogs,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error fetching dashboard data",
      error: error.message,
    });
  }
};

export default {
  updateMonthlyPrices,
  updateDailyPrices,
  getPrices,
  registerAdmin,
  loginUser,
  getAllAdmins,
  getAdminById,
  updateAdmin,
  deleteAdmin,
  viewProfile,
  getDashboardData,
};
