import express from "express";
import vehicleController from "../controller/vehicleController.js";
import userController from "../controller/userController.js";
import {
  verifyToken,
  verifyStaff,
  isAdmin,
} from "../middleware/verifyToken.js";
import staffController from "../controller/staffController.js";
import passController from "../controller/passController.js";
import upload from "../middleware/upload.js";
import { checkPermission } from "../middleware/checkPermission.js";

const router = express.Router();

// POST: Scan QR and perform checkout
// router.post("/api/checkin", verifyToken,checkPermission("checkin"), vehicleController.Checkin);
// router.post("/api/checkout", verifyToken,checkPermission("checkout"), vehicleController.Checkout);
router.post("/api/checkin", verifyToken, vehicleController.Checkin);
router.post("/api/checkout", verifyToken, vehicleController.Checkout);
router.post("/api/checkins", verifyToken, vehicleController.getCheckins);

router.post("/api/checkouts", verifyToken, vehicleController.getCheckouts);
router.get("/api/checkins", verifyToken, vehicleController.getCheckins);
router.get("/api/checkouts", verifyToken, vehicleController.getCheckouts);

router.post("/api/checkouts", verifyToken, vehicleController.getCheckouts);
router.get(
  "/api/getTodayVehicle",
  verifyToken,
  vehicleController.getTodayVehicle
);

// New routes
router.get(
  "/api/vehicle/:numberPlate",
  verifyToken,
  vehicleController.getVehicleByNumberPlate
);
router.get("/api/vehiclelist", verifyToken, vehicleController.getVehicleList);
router.get(
  "/api/getVehicleById/:id",
  verifyToken,
  vehicleController.getVehicleById
);
router.get(
  "/api/getVehicleByToken/:tokenId",
  verifyToken,
  vehicleController.getVehicleByToken
);
router.get(
  "/api/getVehicleByPlate/:numberPlate",
  verifyToken,
  vehicleController.getVehicleByPlate
);
router.get(
  "/api/getRevenueReport",
  verifyToken,
  vehicleController.getRevenueReport
);

// Route: /api/ping
router.get("/api/ping", (req, res) => {
  res.send("Server is alive!");
});


// Admin-only
router.post("/api/create/:id", verifyToken, staffController.createStaff);
router.get("/api/all", verifyToken, staffController.getAllStaffs);
router.put("/api/update/:staffId", verifyToken, staffController.updateStaff);
router.delete("/api/delete/:staffId", verifyToken, staffController.deleteStaff);
router.get(
  "/api/staff/permissions",
  verifyToken,
  checkPermission("smartGetStaffPermissions"),
  staffController.smartGetStaffPermissions
);
router.get(
  "/api/staff/permissions/:staffId",
  verifyToken,
  checkPermission("smartGetStaffPermissions"),
  isAdmin,
  staffController.smartGetStaffPermissions
);
router.put(
  "/api/updatePermissions/:staffId",
  verifyToken,
  checkPermission("updateStaffPermissions"),
  isAdmin,
  staffController.updateStaffPermissions
);
router.post(
  "/api/setPermissions/:staffId",
  verifyToken,
  checkPermission("setStaffPermissions"),
  isAdmin,
  staffController.setStaffPermissions
);
router.get("/api/profile", verifyToken, userController.viewProfile);

// Staff-only
router.get(
  "/api/today-checkins",
  verifyStaff,
  staffController.getStaffTodayVehicles
);
router.get(
  "/api/today-revenue",
  verifyStaff,
  staffController.getStaffTodayRevenue
);


router.post(
  "/api/register",
  upload.single("profileImage"),
  userController.registerAdmin
);
router.post(
  "/api/loginUser",
  upload.single("profileImage"),
  userController.loginUser
);
router.get("/api/getAllAdmins", verifyToken, userController.getAllAdmins);
router.get("/api/getAdminById/:id", verifyToken, userController.getAdminById);
router.put("/api/updateAdmin/:id", verifyToken, userController.updateAdmin);
router.delete(
  "/api/deleteAdmin/delete/:id",
  verifyToken,
  userController.deleteAdmin
);
router.post("/api/addPrice/daily", verifyToken, userController.addDailyPrices);
router.post(
  "/api/addPrice/monthly",
  verifyToken,
  userController.addMonthlyPrices
);
router.put(
  "/api/updatePrice/daily",
  verifyToken,
  userController.updateDailyPrices
);
router.put(
  "/api/updatePrice/monthly",
  verifyToken,
  userController.updateMonthlyPrices
);
router.get("/api/getPrices/:adminId", verifyToken, userController.getPrices);

router.post(
  "/api/createMonthlyPass",
  verifyToken,
  passController.createMonthlyPass
);
router.get("/api/getMontlyPass/:id", verifyToken, passController.getMontlyPass);
router.put("/api/extendPass/:id", verifyToken, passController.extendPass);

router.get(
  "/api/getDashboardData",
  verifyToken,
  userController.getDashboardData
);

export default router;
