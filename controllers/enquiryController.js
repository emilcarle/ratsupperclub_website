// The contact form (RAT Module 1, M1.01): what the form template needs to
// render, and the POST /contact handler that receives a submission.
//
// The browser already checks the fields, but anyone can bypass that, so the
// server checks everything again here.

import crypto from "node:crypto";
import { deliverEnquiry } from "../services/enquiryDelivery.js";

// The copy comes word for word from the change request.
const MESSAGES = {
    required: "Please complete this field.",
    email: "Please check the email address.",
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Same limits as the maxlength attributes in views/partials/contact-form.ejs.
const MAX_LENGTH = { name: 200, email: 254, organisation: 200, message: 5000 };

// Spam protection, invisible to visitors:
// 1. Honeypot: a field hidden from people ("website") that bots fill in.
// 2. Minimum fill time: each rendered form carries a signed timestamp, and a
//    form sent back faster than a person could fill it in is a bot.
// 3. A site-wide cap on enquiries per hour. It isn't per visitor because the
//    production Nginx doesn't pass the visitor's IP to the app, so every
//    request looks like it comes from 127.0.0.1.
// Submissions caught by 1 or 2 get a fake "success" reply, so bots learn nothing.
const MIN_FILL_MS = 3000;
const MAX_PER_HOUR = 20;
const recentSubmissions = []; // timestamps (ms) of accepted submissions

// The signing key. Read when needed rather than at import time, because
// .env is loaded after the route modules are imported.
const fallbackSecret = crypto.randomBytes(32).toString("hex");
const signingKey = () => process.env.SESSION_SECRET || fallbackSecret;

function sign(timestamp) {
    return crypto.createHmac("sha256", signingKey()).update(`enquiry:${timestamp}`).digest("base64url");
}

function issueFormToken() {
    const timestamp = Date.now().toString();
    return `${timestamp}.${sign(timestamp)}`;
}

// Returns the form's age in ms, or null if the token is missing or forged.
function formAge(token) {
    if (typeof token !== "string") return null;
    const [timestamp, signature] = token.split(".");
    if (!/^\d+$/.test(timestamp ?? "") || !signature) return null;

    const expected = Buffer.from(sign(timestamp));
    const given = Buffer.from(signature);
    if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) return null;

    return Date.now() - Number(timestamp);
}

// Everything views/partials/contact-form.ejs needs. `source` is "home" or
// "contact", and records which of the two forms an enquiry came from.
export function contactFormLocals(source, state = {}) {
    return {
        source,
        token: issueFormToken(),
        calendlyUrl: process.env.CALENDLY_URL || "",
        status: state.status || null, // null | "success" | "error"
        values: state.values || {},
        errors: state.errors || {},
    };
}

function validate(body) {
    const text = (value) => (typeof value === "string" ? value.trim() : "");
    const values = {
        name: text(body.name),
        email: text(body.email),
        organisation: text(body.organisation),
        message: text(body.message),
        consent: body.consent === "yes",
    };

    const errors = {};
    for (const field of ["name", "email", "organisation", "message"]) {
        if (!values[field]) errors[field] = MESSAGES.required;
    }
    if (values.email && !EMAIL_PATTERN.test(values.email)) errors.email = MESSAGES.email;
    if (!values.consent) errors.consent = MESSAGES.required;

    // Longer than the form allows: only scripts get here, so no field message.
    const tooLong = Object.keys(MAX_LENGTH).some((field) => values[field].length > MAX_LENGTH[field]);

    return { values, errors, tooLong };
}

function underHourlyCap() {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    while (recentSubmissions.length && recentSubmissions[0] < oneHourAgo) recentSubmissions.shift();
    return recentSubmissions.length < MAX_PER_HOUR;
}

// POST /contact
// With JavaScript, the form is sent in the background (fetch, header
// X-Requested-With) and gets JSON back. Without JavaScript, it's a normal
// form post and gets the /contact page back, showing the result.
export const submitEnquiry = async (req, res) => {
    const body = req.body ?? {};
    const source = body.source === "home" ? "home" : "contact";
    const { values, errors, tooLong } = validate(body);

    const reply = (httpStatus, status, fieldErrors = {}) => {
        if (req.xhr) {
            return res.status(httpStatus).json({ ok: status === "success", errors: fieldErrors });
        }
        const state = { status, values: status === "success" ? {} : values, errors: fieldErrors };
        return res.status(httpStatus).render("contact.ejs", { contactForm: contactFormLocals(source, state) });
    };

    try {
        // Spam: pretend it worked.
        const age = formAge(body.token);
        if (typeof body.website === "string" && body.website.trim() !== "") {
            console.log("[enquiry] Spam caught by the honeypot; ignored.");
            return reply(200, "success");
        }
        if (age !== null && age < MIN_FILL_MS) {
            console.log(`[enquiry] Spam caught: form sent ${age} ms after loading; ignored.`);
            return reply(200, "success");
        }
        if (age === null) {
            console.log("[enquiry] Rejected: missing or invalid form token.");
            return reply(400, "error");
        }

        if (Object.keys(errors).length > 0) return reply(400, "error", errors);
        if (tooLong) return reply(400, "error");

        if (!underHourlyCap()) {
            console.error(`[enquiry] Rejected: more than ${MAX_PER_HOUR} enquiries in the last hour.`);
            return reply(503, "error");
        }
        recentSubmissions.push(Date.now());

        const { delivered } = await deliverEnquiry({
            name: values.name,
            email: values.email,
            organisation: values.organisation,
            message: values.message,
            source,
            receivedAt: new Date(),
        });

        return delivered ? reply(200, "success") : reply(503, "error");
    } catch (error) {
        console.error("[enquiry] Failed: " + error.message);
        return reply(500, "error");
    }
};
