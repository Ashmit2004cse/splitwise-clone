const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const groupRoutes = require("./routes/groupRoutes");
const expenseRoutes = require("./routes/expenseRoutes");
const settlementRoutes = require("./routes/settlementRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const hostRouter = require("./routes/hostRouter");

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static assets (CSS, images, JS) from public directory
app.use(express.static(path.join(__dirname, "public")));

// Web page routes (Home, UserPage/Login/Signup, Dashboard)
app.use("/", hostRouter);

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/settlements", settlementRoutes);
app.use("/api/payments", paymentRoutes);

// Backward compatibility for /routes path prefix
app.use("/routes/auth", authRoutes);
app.use("/routes/users", userRoutes);
app.use("/routes/groups", groupRoutes);
app.use("/routes/expenses", expenseRoutes);
app.use("/routes/settlements", settlementRoutes);
app.use("/routes/payments", paymentRoutes);

// Contact form handler for landing page
app.post("/contact", (req, res) => {
  const { name, email, message } = req.body;
  console.log(`[Contact Form] From: ${name} (${email}) - Message: ${message}`);
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <title>Message Received</title>
        <style>
          body { font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f8f8fc; }
          .card { background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); text-align: center; max-width: 450px; }
          h2 { color: #6c4cff; }
          a { display: inline-block; margin-top: 20px; padding: 10px 20px; background: #6c4cff; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="card">
          <h2>Message Received!</h2>
          <p>Thank you <strong>${name || "Friend"}</strong>! We have received your message and our team will get back to you shortly.</p>
          <a href="/">Back to Home</a>
        </div>
      </body>
    </html>
  `);
});

// Global 404 handler for API routes
app.use("/api", (req, res) => {
  res.status(404).json({ message: "API endpoint not found" });
});

// MongoDB connection helper for local & serverless (Vercel)
const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) return;
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected successfully");
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
  }
};

// Ensure DB connection before handling requests
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    next(err);
  }
});

const PORT = process.env.PORT || 5000;
// In local development or standalone server, start HTTP listener
if (!process.env.VERCEL) {
  connectDB().then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  });
}

module.exports = app;