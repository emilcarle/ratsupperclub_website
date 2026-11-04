import { savePageView } from "../models/adminModel.js";

export const pageView = async (req, res, next) => {
  try {
    // Ezeket soha ne számoljuk
    if (
      req.path.startsWith("/admin") ||
      req.path.startsWith("/api") ||
      req.path.includes(".")
    ) {
      return next();
    }

    const allowedPaths = [
      "/",
      "/contact",
      "/legal-notice",
      "/privacy"
    ];

    const isProjectPage = req.path.startsWith("/projects/");

    if (!allowedPaths.includes(req.path) && !isProjectPage) {
      return next();
    }

    await savePageView(req.path);

  } catch (err) {
    console.error("Page view error:", err);
  }

  next();
};