import { configDotenv } from "dotenv";
import express from "express";
import expressLayouts from "express-ejs-layouts";
import pageRoutes from "./routes/pageRoutes.js";
import "./db.js";
import session from "express-session";

configDotenv();

const app = express();
const port = process.env.APP_PORT;
const host = process.env.APP_HOST; // e.g. 127.0.0.1 on staging; unset = all interfaces

app.set("view engine", "ejs");
app.set("layout", false);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.text());
app.use(express.static("public"));
app.use(expressLayouts);
app.use((req, res, next) => {
  res.locals.currentPath = req.path;
  next();
});

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: false // prod: true (https)
  }
}));

app.use("/", pageRoutes);

app.listen(port, host, () => {
  console.log(`The server is running on ${host ?? "all interfaces"}:${port}`);
});