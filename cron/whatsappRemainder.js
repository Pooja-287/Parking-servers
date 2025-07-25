import cron from "node-cron";
import monthlyPass from "../model/monthlyPass.js";
import { sendExpiryReminderMessage } from "../utils/sendWhatsAppMessage.js";

cron.schedule("40 15 * * *", async () => {
  try {
    console.log("🔔 Running expiry reminder check...");

    const twoDaysLater = new Date();
    twoDaysLater.setDate(twoDaysLater.getDate() + 2);
    twoDaysLater.setHours(0, 0, 0, 0);

    const nextDay = new Date(twoDaysLater);
    nextDay.setDate(nextDay.getDate() + 1);

    const expiringPasses = await monthlyPass.find({
      endDate: { $gte: twoDaysLater, $lt: nextDay },
      isExpired: false,
    });

    for (const pass of expiringPasses) {
      const endDateStr = pass.endDate.toISOString().split("T")[0];
      const renewLink = ` https://react-parking-one.vercel.app/extend/${pass._id}`;

      await sendExpiryReminderMessage(
        pass.mobile,
        pass.name,
        pass.vehicleNo,
        endDateStr,
        renewLink
      );
    }

    console.log(`📤 Sent ${expiringPasses.length} expiry reminders`);
  } catch (error) {
    console.error("❌ Error in reminder cron:", error.message);
  }
});
