  // import Razorpay from "razorpay";
  // import crypto from "crypto";
  // import VehicleCheckin from '../model/checkin.js'; // ✅ Correct import

  // const razorpay = new Razorpay({
  //   key_id: process.env.RAZORPAY_KEY_ID,
  //   key_secret: process.env.RAZORPAY_SECRET
  // });

  // // 🔹 Create Razorpay order
  // const createOrder = async (req, res) => {
  //   const { amount, currency = "INR", receipt } = req.body;

  //   try {
  //     const options = {
  //       amount: amount * 100,
  //       currency,
  //       receipt: receipt || "receipt#1",
  //     };

  //     const order = await razorpay.orders.create(options);
  //     res.status(201).json({ success: true, order });

  //   } catch (error) {
  //     res.status(500).json({ success: false, message: error.message });
  //   }
  // };

  // // 🔹 Verify Razorpay payment signature
  // const verifyPayment = async (req, res) => {
  //   const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  //   const sign = crypto
  //     .createHmac("sha256", process.env.RAZORPAY_SECRET)
  //     .update(`${razorpay_order_id}|${razorpay_payment_id}`)
  //     .digest("hex");

  //   if (sign === razorpay_signature) {
  //     res.status(200).json({ success: true, message: "Payment verified successfully" });
  //   } else {
  //     res.status(400).json({ success: false, message: "Payment verification failed" });
  //   }
  // };

  // // 🔹 Store payment mode after checkout
  // const MakePayment = async (req, res) => {
  //   console.log("Incoming request to MakePayment:", req.body); // ✅ Add this
  //   try {
  //     const { tokenId, paymentMode } = req.body;

  //     if (!tokenId || !paymentMode) {
  //       return res.status(400).json({ message: "tokenId and paymentMode are required" });
  //     }

  //     if (!['cash', 'upi', 'card'].includes(paymentMode)) {
  //       return res.status(400).json({ message: "Invalid payment mode" });
  //     }

  //     const vehicle = await VehicleCheckin.findOne({ tokenId });

  //     if (!vehicle) {
  //       return res.status(404).json({ message: "No vehicle found with this tokenId" });
  //     }

  //     if (!vehicle.isCheckedOut) {
  //       return res.status(400).json({ message: "Please checkout before making payment" });
  //     }

  //     if (vehicle.paymentMode) {
  //       return res.status(400).json({ message: "Payment already completed" });
  //     }

  //     vehicle.paymentMode = paymentMode;
  //     await vehicle.save();

  //     res.status(200).json({
  //       message: "Payment successful",
  //       paymentDetails: {
  //         tokenId,
  //         amountPaid: vehicle.totalAmount,
  //         paymentMode
  //       }
  //     });

  //   } catch (error) {
  //     console.error("Payment error:", error);
  //     res.status(500).json({ message: "Internal Server Error", error: error.message });
  //   }
  // };

  // export default {
  //   createOrder,
  //   verifyPayment,
  //   MakePayment,
  // };
