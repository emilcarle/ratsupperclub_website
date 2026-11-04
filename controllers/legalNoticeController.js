export const renderLegalNotice = (req, res) => {
    try {
        res.render("legal-notice.ejs");
    } catch (error) {
        console.log("Can't load the legal notice page: " + error.message);
    };
};
