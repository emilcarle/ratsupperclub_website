import { contactFormLocals } from "./enquiryController.js";

export const renderContact = (req, res) => {
    try {
        res.render("contact.ejs", { contactForm: contactFormLocals("contact") });
    } catch (error) {
        console.log("Can't load the contact page: " + error.message);
    };
};
