// This service acts as the External Interface layer for SMS/OTP Providers
// Market Standard simulation for Twilio, Fast2SMS, or AWS SNS

exports.sendOtpSms = async (mobileNumber, otpCode) => {
    try {
        console.log(`[EXTERNAL SMS GATEWAY] Sending OTP ${otpCode} to Mobile: ${mobileNumber}`);
        // In production, integrate your preferred SMS provider here:
        // Example (Twilio): 
        // await twilioClient.messages.create({ body: `Your Treeniti OTP is ${otpCode}`, from: '+1...', to: `+91${mobileNumber}` });
        
        return { success: true, message: 'OTP Sent successfully' };
    } catch (error) {
        console.error('[EXTERNAL SMS GATEWAY] Error:', error.message);
        throw new Error('Failed to send OTP via SMS Provider');
    }
};
