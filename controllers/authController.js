const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { db } = require("../config/firebase");

// SIGNUP
const signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();

    // Check if user already exists in Firebase Firestore (case-insensitive check)
    let existingUserSnapshot = await db
      .collection("users")
      .where("email", "==", cleanEmail)
      .limit(1)
      .get();

    if (!existingUserSnapshot.empty) {
      return res.status(400).json({
        message: "User already exists with this email",
      });
    }

    // Double check with case-insensitive scan
    const allUsersSnap = await db.collection("users").get();
    const alreadyExists = allUsersSnap.docs.some(
      (doc) => (doc.data().email || "").trim().toLowerCase() === cleanEmail
    );

    if (alreadyExists) {
      return res.status(400).json({
        message: "User already exists with this email",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user in Firebase Firestore
    const userRef = await db.collection("users").add({
      name: cleanName,
      email: cleanEmail,
      password: hashedPassword,
      createdAt: new Date(),
    });

    // Generate JWT Token immediately upon signup
    const token = jwt.sign(
      {
        userId: userRef.id,
      },
      process.env.JWT_SECRET || "default_splitwise_secret",
      {
        expiresIn: "7d",
      }
    );

    const userObj = {
      _id: userRef.id,
      id: userRef.id,
      name: cleanName,
      email: cleanEmail,
    };

    res.status(201).json({
      message: "Account created successfully",
      token,
      user: userObj,
    });
  } catch (error) {
    console.error("Signup error:", error);

    res.status(500).json({
      message: error.message || "Failed to create account",
    });
  }
};

// LOGIN
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Find user in Firebase Firestore
    let userSnapshot = await db
      .collection("users")
      .where("email", "==", cleanEmail)
      .limit(1)
      .get();

    let userDoc = null;

    if (!userSnapshot.empty) {
      userDoc = userSnapshot.docs[0];
    } else {
      // Fallback: check case-insensitively across existing users
      const allUsersSnap = await db.collection("users").get();
      userDoc = allUsersSnap.docs.find(
        (doc) => (doc.data().email || "").trim().toLowerCase() === cleanEmail
      );
    }

    if (!userDoc) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const userData = userDoc.data();

    const user = {
      _id: userDoc.id,
      id: userDoc.id,
      ...userData,
    };

    // Compare password
    const passwordMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatch) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    // Generate JWT
    const token = jwt.sign(
      {
        userId: user.id,
      },
      process.env.JWT_SECRET || "default_splitwise_secret",
      {
        expiresIn: "7d",
      }
    );

    res.json({
      message: "Login successful",
      token,
      user: {
        _id: user.id,
        id: user.id,
        name: user.name || "",
        email: user.email || "",
        upiId: user.upiId || "",
        phone: user.phone || "",
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    res.status(500).json({
      message: error.message || "Login failed",
    });
  }
};

module.exports = {
  signup,
  login,
};