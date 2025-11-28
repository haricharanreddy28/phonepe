const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const axios = require('axios');
const crypto = require('crypto');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

// PhonePe API Credentials (PRODUCTION)
const MERCHANT_ID = "SU2510162031036614659826";
const SALT_KEY = "e4589c44-3967-4573-ab82-8f378ddc0a48";
const SALT_INDEX = 1;
const PHONEPE_HOST_URL = "https://api.phonepe.com/apis/hermes"; // Production URL

// Domain for Redirects/Callbacks
const BASE_URL = "http://www.bargtechnologies.in";

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/pay', async (req, res) => {
    try {
        const { name, mobile, amount, MUID } = req.body;

        // Unique Transaction ID
        const merchantTransactionId = 'MT' + Date.now();
        const userId = 'MUID' + Date.now();

        const data = {
            merchantId: MERCHANT_ID,
            merchantTransactionId: merchantTransactionId,
            merchantUserId: userId,
            amount: amount * 100, // Amount in paise
            redirectUrl: `${BASE_URL}/status/${merchantTransactionId}`,
            redirectMode: "POST", // Or "REDIRECT"
            callbackUrl: `${BASE_URL}/callback`,
            mobileNumber: mobile,
            paymentInstrument: {
                type: "PAY_PAGE"
            }
        };

        const payload = JSON.stringify(data);
        const payloadMain = Buffer.from(payload).toString('base64');
        const keyIndex = SALT_INDEX;
        const string = payloadMain + '/pg/v1/pay' + SALT_KEY;
        const sha256 = crypto.createHash('sha256').update(string).digest('hex');
        const checksum = sha256 + '###' + keyIndex;

        // Production URL
        const prod_URL = `${PHONEPE_HOST_URL}/pg/v1/pay`;

        const options = {
            method: 'POST',
            url: prod_URL,
            headers: {
                'accept': 'application/json',
                'Content-Type': 'application/json',
                'X-VERIFY': checksum
            },
            data: {
                request: payloadMain
            }
        };

        const response = await axios.request(options);

        if (response.data.success) {
            // Redirect user to PhonePe payment page
            return res.json({ success: true, url: response.data.data.instrumentResponse.redirectInfo.url });
        } else {
            return res.json({ success: false, message: "Payment initiation failed" });
        }

    } catch (error) {
        console.error("Payment Initiation Error:", error.message);
        if (error.response) {
            console.error("PhonePe Error Data:", error.response.data);
            console.error("PhonePe Error Status:", error.response.status);
            console.error("PhonePe Error Headers:", error.response.headers);
            return res.status(error.response.status).json({
                success: false,
                message: error.response.data.message || "Payment initiation failed at PhonePe"
            });
        }
        res.status(500).json({ success: false, message: error.message });
    }
});

app.post('/status/:txnId', async (req, res) => {
    const merchantTransactionId = req.params.txnId;
    const merchantId = MERCHANT_ID;

    const keyIndex = SALT_INDEX;
    const string = `/pg/v1/status/${merchantId}/${merchantTransactionId}` + SALT_KEY;
    const sha256 = crypto.createHash('sha256').update(string).digest('hex');
    const checksum = sha256 + '###' + keyIndex;

    const options = {
        method: 'GET',
        url: `${PHONEPE_HOST_URL}/pg/v1/status/${merchantId}/${merchantTransactionId}`,
        headers: {
            'accept': 'application/json',
            'Content-Type': 'application/json',
            'X-VERIFY': checksum,
            'X-MERCHANT-ID': `${merchantId}`
        }
    };

    try {
        const response = await axios.request(options);
        if (response.data.success === true) {
            // Redirect to success page
            res.redirect('/success.html');
        } else {
            // Redirect to failure page
            res.redirect('/failure.html');
        }
    } catch (error) {
        console.error(error);
        res.redirect('/failure.html');
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
