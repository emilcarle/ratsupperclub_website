import { getAllProjects, getLanding } from "../models/projectModel.js";

export const renderMain = async (req, res) => {
    try {
        const projects = await getAllProjects();
        const landing = await getLanding();
        res.render("main.ejs", { projects, landing });
    } catch (error) {
        console.log("Can't load the main page: " + error.message);
    };
};