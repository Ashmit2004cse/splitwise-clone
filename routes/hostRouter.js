const express = require("express");
const path = require("path");

const hostRouter = express.Router();

hostRouter.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "views", "home.html"));
});

hostRouter.get("/home", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "views", "home.html"));
});

hostRouter.get("/userPage", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "views", "userPage.html"));
});

hostRouter.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "views", "userPage.html"));
});

hostRouter.get("/signup", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "views", "userPage.html"));
});

hostRouter.get("/dashboard", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "views", "dashboard.html"));
});

hostRouter.get("/app", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "views", "dashboard.html"));
});

module.exports = hostRouter;