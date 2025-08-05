import express from "express";
import APIRouter from "./routes/APIRouter.js";
import mongoose from "mongoose";
import morgan from "morgan";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(morgan("tiny"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Routes
app.use("/", APIRouter);
const PORT = process.env.PORT || 5000;

// Database Connection
const ConnectDB = async () => {
  try {
    const connect = await mongoose.connect(process.env.MONGODB_URI);
    console.log("DB Connected Successfully");
  } catch (error) {
    console.log("Error connecting to database");
    console.log(error);
    process.exit(1);
  }
};
ConnectDB();
app.listen(PORT, () => {
  console.log("Server is Running on Port", PORT);
});
