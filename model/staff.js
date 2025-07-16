
import mongoose from 'mongoose';


const staffSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  hashedPassword: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['staff'],
    default: 'staff'
  },
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },
  permissions: {
    type: [String],
    default: []
  },
   // 👇 Embedded building details (not reference)
  building: {
    name: { type: String, required: true },
    location: { type: String, required: true },
  },
});

const Staff = mongoose.model('Staff', staffSchema);

export default Staff; // ✅ ES Module default export
