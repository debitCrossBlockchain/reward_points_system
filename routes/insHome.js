module.exports = function (insHome) {
    /* GET adminHome page. */
    insHome.get("/insHome", function (req, res) {
        if (!req.session.user) {
            req.session.error = "请先登录";
            res.redirect("/login");
        } else {
            if (req.session.user.type != "2") {
                req.session.user = null;
                req.session.error = "请先登录";
                res.redirect("/login");
            } else {
                res.render("insHome", {
                    user: req.session.user.name,
                    title: '易诚互动区块链'
                });
            }
        }
    });
};