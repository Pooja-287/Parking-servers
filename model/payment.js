import mongoose from 'mongoose';
import VehicleCheckin from './checkin';

const paymentSchema = new mongoose.Schema({
    VehicleCheckin: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'VehicleCheckin',
        required: true
    },
    amountPaid:{
     type:Number,
     required:true
    },
    paymentMode: {
        type: String,
        enum:['cash', 'card', 'upi'],
        required:true
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'paid', 'failed'],
        default: 'pending'
    },
    transactionId: {
        type: String
    },
    paidAt: {
        type: Date,
        default: Date.now
    },
    //who processed the payment

    processedBy: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'processedByRole'
    },
},{
    timestamps: true
});

const Payment = mongoose.model('Payment', paymentSchema);
export default Payment;