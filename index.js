const express = require("express");
const cors = require("cors");
const axios = require("axios");
const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const Razorpay = require("razorpay");

const app = express();
const port = 8080;

app.use(express.json());

app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://staging.pustaka.co.in",
      "https://pustaka.co.in",
      "https://www.staging.pustaka.co.in",
      "https://www.pustaka.co.in",
    ],
    credentials: true,
  })
);

// Add comprehensive request logging middleware
app.use((req, res, next) => {
  console.log("=== Incoming Request ===");
  console.log(`${req.method} ${req.url}`);
  console.log(`Origin: ${req.headers.origin}`);
  console.log(`User-Agent: ${req.headers["user-agent"]}`);
  console.log(`Headers:`, req.headers);
  console.log("========================");
  next();
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
      "https://fwy28o8vc7.execute-api.ap-south-1.amazonaws.com/author-dashboard-new/author-dashboard",
      {
        method: "storeOTP",
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

const createRazorpaySubscription = async (req, res) => {
  try {
    // Log incoming request data for debugging
    const { staging, user_id, plan_id } = req.body;
    const razorpay = new Razorpay({
      key_id: staging ? "rzp_test_oS7OCD1EIJ8OLz" : "rzp_live_LwjeAdh4Cmzo2r",
      key_secret: staging
        ? "ILW9pthkjkCsGxfX9wBLT565"
        : "pTq6afX5nLSd8ChnijPUoZjv",
    });

    // Validate that the plan exists in the Razorpay account before creating a subscription
    try {
      await razorpay.plans.fetch(plan_id);
    } catch (planErr) {
      console.error(
        "Plan fetch failed for plan_id=",
        plan_id,
        planErr && planErr.error ? planErr.error : planErr
      );
      // Return a clearer message to the client for debugging
      return res.status(400).json({
        status: 0,
        message:
          "Plan not found in Razorpay. Check plan_id and environment (staging/live).",
        debug: planErr && planErr.error ? planErr.error : String(planErr),
      });
    }

    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    const { data: profileData } = await axios.post(
      "https://1m2dc0uz5l.execute-api.ap-south-1.amazonaws.com/staging/api",
      {
        method: "getprofile",
        user_id: parseInt(req.body.user_id),
        language_id: 0,
      }
    );
    let currentPlanData;
    if (
      req.body.planType === "ebook" &&
      profileData.result.ebook_plan.plan_status === "Active"
    ) {
      currentPlanData = profileData.result.ebook_plan;
    } else if (
      req.body.planType === "audiobook" &&
      profileData.result.audiobook_plan.plan_status === "Active"
    ) {
      currentPlanData = profileData.result.audiobook_plan;
    }

    // * note: total_count should be below: December 31, 2120 12:00:00 AM.
    var total_count = 1;
    if (plan_id == "plan_RHk0jj4v7x4ZHP" || plan_id == "plan_QAvjloCitlily0") {
      total_count = 4;
    }

    let currentRazorpaySubscription = null;

    if (currentPlanData && currentPlanData.order_id) {
      const currentSubscription = await razorpay.subscriptions.fetch(
        currentPlanData.original_order_id
      );
      if (currentSubscription.status === "active") {
        currentRazorpaySubscription = currentSubscription.id;
      }
    }

    var options = {
      plan_id: plan_id,
      total_count: total_count,
      offer_id: null,
      notes: {
        user_id: user_id,
        type: currentRazorpaySubscription ? "update" : "subscription",
        prev_subscription_id: currentRazorpaySubscription
          ? currentRazorpaySubscription
          : null,
      },
    };

    const razorpaySubscription = await razorpay.subscriptions.create(options);
    const razorpayPlan = await razorpay.plans.fetch(plan_id);

    res.json({
      status: 1,
      subscriptionData: razorpaySubscription,
      planData: razorpayPlan,
    });
  } catch (error) {
    console.error(error);
    res.json({ status: 0, message: error.message });
  }
};

const cancelRazorpaySubscription = async (req, res) => {
  try {
    const { subscriptionId, staging } = req.body;
    const razorpay = new Razorpay({
      key_id: staging ? "rzp_test_oS7OCD1EIJ8OLz" : "rzp_live_LwjeAdh4Cmzo2r",
      key_secret: staging
        ? "ILW9pthkjkCsGxfX9wBLT565"
        : "pTq6afX5nLSd8ChnijPUoZjv",
    });

    razorpay.subscriptions
      .cancel(subscriptionId, {
        cancel_at_cycle_end: 0,
      })
      .then((result) => {
        console.log(result);
        if (result.id && result.id.length > 0) {
          res.json({
            status: 1,
            result: result,
          });
        }
      })
      .catch((error) => {
        console.error(error);
        res.json({ status: 0, message: error.message });
      });
  } catch (error) {
    console.error(error);
    res.json({ status: 0, message: error.message });
  }
};

app.get("/", (_, res) => {
  res.send("Pustaka Author Dashboard API");
});

// Explicit OPTIONS handlers for debugging
app.options("/razorpay/createSubscription", (req, res) => {
  console.log("OPTIONS request for createSubscription");
  res.sendStatus(200);
});

app.options("/login/sendOtp", (req, res) => {
  console.log("OPTIONS request for sendOtp");
  res.sendStatus(200);
});

app.options("/razorpay/cancelSubscription", (req, res) => {
  console.log("OPTIONS request for cancelSubscription");
  res.sendStatus(200);
});

app.post("/login/sendOtp", sendOtp);
app.post("/razorpay/createSubscription", createRazorpaySubscription);
app.post("/razorpay/cancelSubscription", cancelRazorpaySubscription);

// Catch-all route to debug any unmatched requests
app.all("*", (req, res) => {
  console.log(`Unmatched route: ${req.method} ${req.url}`);
  res.status(404).json({ message: "Route not found" });
});

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
  console.log(`HTTP Server running on port ${port || 8080}`);
  console.log(`HTTP Server accessible at: http://localhost:${port || 8080}`);
});

httpsServer.listen(443, () => {
  console.log("HTTPS Server running on port 443");
  console.log("HTTPS Server accessible at: https://api.pustaka.co.in");
});
