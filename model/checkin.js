import mongoose from "mongoose";

const vehicleCheckinSchema = new mongoose.Schema(
  {
    tokenId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      default: "",
    },
    vehicleNo: {
      type: String,
      required: true,
    },
    vehicleType: {
      type: String,
      required: true,
    },
    mobile: {
      type: String,
      required: true,
      match: /^[6-9]\d{9}$/,
    },
    paymentMethod: {
      type: String,
      required: true,
    },
    paidDays: {
      type: Number,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    perDayRate: {
      type: Number,
      required: true,
    },
    entryDateTime: {
      type: Date,
      default: Date.now,
    },
    CheckOutTime: {
      type: Date,
    },
    totalDays: {
      type: Number,
      default: 0,
    },
    extraDays: {
      type: Number,
      default: 0,
    },
    extraAmount: {
      type: Number,
      default: 0,
    },
    isCheckedOut: {
      type: Boolean,
      default: false,
    },
    checkInBy: {
      type: String,
      required: true,
    },
    checkOutBy: {
      type: String,
      default: "",
    },
    adminId: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

const VehicleCheckin = mongoose.model("VehicleCheckin", vehicleCheckinSchema);
export default VehicleCheckin;
