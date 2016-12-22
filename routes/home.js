module.exports = function (home) {
    /* GET home page. */
    home.get("/home", function (req, res) {
        if (!req.session.user) { //到达/home路径首先判断是否已经登录
            req.session.error = "请先登录";
            res.redirect("/login"); //未登录则重定向到 /login 路径
        } else {
            if (req.session.user.type != "3") {
                req.session.user = null;
                req.session.error = "请先登录";
                res.redirect("/login");
            } else {
                res.render("home", {
                    user: req.session.user.name,
                    title: '易诚互动区块链'
                }); //已登录则渲染home页面
            }
        }
    });
};