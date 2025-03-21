const express = require("express");
const axios = require("axios");
const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");

const app = express();
const port = 8080;

app.use(express.json());

app.use(function (req, res, next) {
  // CORS headers
  res.header("Access-Control-Allow-Origin", "*"); // restrict it to the required domain
  res.header("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE,OPTIONS");
  // Set custom headers for CORS
  res.header(
    "Access-Control-Allow-Headers",
    "Content-type,Accept,X-Custom-Header"
  );

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  return next();
});

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

    await axios.post(
      "https://ufhdsmqbf1.execute-api.ap-south-1.amazonaws.com/author-dashboard-staging/author-dashboard-staging",
      {
        method: "sendOTP",
        mobileno: req.body.mobile,
        otp: otp,
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

app.get("/", (_, res) => {
  res.send("Pustaka Author Dashboard API");
});

app.post("/login/sendOtp", sendOtp);

// app.listen(port, () => {
//   console.log(`Example app listening on port ${port}`);
// });

// Listen both http & https ports
const httpServer = http.createServer(app);
const httpsServer = https.createServer(
  {
    key: fs.readFileSync(
      path.resolve(__dirname, "certs/api.pustaka.co.in.key")
    ),
    ca: fs.readFileSync(
      path.resolve(__dirname, "certs/api.pustaka.co.in.ca-bundle")
    ),
    passphrase: "Ebooks@123",
    cert: fs.readFileSync(
      path.resolve(__dirname, "certs/api.pustaka.co.in.crt")
    ),
  },
  app
);

httpServer.listen(port || 8080, () => {
  console.log("HTTP Server running on port 80");
});

httpsServer.listen(443, () => {
  console.log("HTTPS Server running on port 443");
});
