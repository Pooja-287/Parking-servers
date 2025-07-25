// Monthly Pass reminder logic (manual testing)
import monthlyPass from "../model/monthlyPass.js";
import { sendWhatsAppMessage } from "../utils/sendWhatsAppMessage.js";

export const testReminder = async (req, res) => {
  const today = new Date();
  const twoDaysLater = new Date();
  twoDaysLater.setDate(today.getDate() + 2); // 2 naal apram

  const formatDate = (date) =>
    new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const targetDate = formatDate(twoDaysLater);

  try {
    const expiringPasses = await monthlyPass.find({
      isExpired: false,
      endDate: {
        $gte: targetDate,
        $lt: new Date(targetDate.getTime() + 24 * 60 * 60 * 1000),
      },
    });

    const results = [];

    for (const pass of expiringPasses) {
      const message = 📢 Reminder: Your Monthly Parking Pass will expire soon!\n\nName: ${pass.name}\nVehicle: ${pass.vehicleNo}\nExpiry Date: ${pass.endDate.toDateString()};
      await sendWhatsAppMessage(pass.mobile, message);
      results.push({ mobile: pass.mobile, status: "Message sent" });
    }

    res.status(200).json({
      message: "Manual reminder test complete",
      sentTo: results,
    });
  } catch (err) {
    res.status(500).json({ message: "Error during test reminder", error: err.message });
  }
};