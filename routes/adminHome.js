module.exports = function (adminHome) {
    /* GET adminHome page. */
    adminHome.get("/adminHome", function (req, res) {
        if (!req.session.user) {
            req.session.error = "请先登录";
            res.redirect("/admin");
        } else {
            if (req.session.user.type != "1" && req.session.user.type != "2") {
                req.session.user = null;
                req.session.error = "请先登录";
                res.redirect("/admin");
            } else {
                res.render("adminHome", {
                    user: req.session.user.name,
                    title: '易诚互动区块链'
                });
            }
        }
    });
};