import { getAllProjects, getLanding } from "../models/projectModel.js";
import { contactFormLocals } from "./enquiryController.js";

export const renderMain = async (req, res) => {
    try {
        const projects = await getAllProjects();
        const landing = await getLanding();
        res.render("main.ejs", { projects, landing, contactForm: contactFormLocals("home") });
    } catch (error) {
        console.log("Can't load the main page: " + error.message);
    };
};