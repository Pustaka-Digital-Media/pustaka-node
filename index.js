const express = require("express");
const axios = require("axios");
const md5 = require("md5");

const app = express();
const port = 8080;

app.use(express.json());

const generateOtp = () => {
  const digits = "0123456789";
  const otpLength = 4;

  let otp = "";

  for (let i = 1; i <= otpLength; i++) {
    const index = Math.floor(Math.random() * digits.length);
    otp = otp + digits[index];
  }

  return otp;
};

const sendOtp = async (req, res) => {
  try {
    const otp = generateOtp();
    const response = await axios.post(
      "https://restapi.smscountry.com/v0.1/Accounts/ZuBPJ14zqzxPVThkm5mh/SMSes/",
      {
        Text: `${otp} is the OTP to login into Pustaka. Valid for 5 mins. Do not share it with anyone. - Pustaka`,
        Number: `91${req.body.mobile}`,
        SenderId: "PUSTKA",
        DRNotifyUrl: "https://www.domainname.com/notifyurl",
        DRNotifyHttpMethod: "POST",
        Tool: "API",
      },
      {
        headers: {
          Authorization:
            "Basic WnVCUEoxNHpxenhQVlRoa201bWg6aERNQk9iR2RsRnF1Q1RRcFVKTlUzamROcU9peFNLUndSSmZ2ZWd3Sg==",
        },
      }
    );
    console.log(response.data);

    const hashedOtp = md5(otp);
    await axios.post(
      "https://ufhdsmqbf1.execute-api.ap-south-1.amazonaws.com/author-dashboard-staging/author-dashboard-staging",
      {
        method: "sendOTP",
        mobileno: req.body.mobile,
        otp: hashedOtp,
      }
    );

    return res.json({
      status: 1,
      verifyOtp: true,
      data: {},
    });
  } catch (error) {
    return res.json({
      status: 0,
      verifyOtp: false,
      message:
        "Error Occurred, please try again later. Please contact support@regionalstorytellers.com if the issue persists.",
    });
  }
};

app.post("/login/sendOtp", sendOtp);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
