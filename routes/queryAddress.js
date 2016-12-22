module.exports = function (queryAddress) {
    /* GET query address. */
    queryAddress.post("/queryAddress",
        function (req, res) {
            if (!req.session.user) { //到达路径首先判断是否已经登录
                req.session.error = "请先登录";
                res.redirect("/login"); //未登录则重定向到 /login 路径
            } else {
                if (req.session.user.type != "3") {
                    req.session.user = null;
                    req.session.error = "请先登录";
                    res.redirect("/login");
                } else {
                    console.log("************query address*************");
                    var Address = global.dbHandel.getModel('address');
                    var uname = req.session.user.name;
                    Address.find({
                        user: uname
                    },
                    function (err, doc) {
                        var ajaxResult = {
                            code: 1,
                            tips: ""
                        };
                        if (err) {
                            console.log(err);
                            ajaxResult.code = 201;
                            ajaxResult.tips = "数据库操作失败";
                        } else if (!doc) {
                            console.log("用户未申请账户");
                            req.session.error = "用户未申请账户";
                            ajaxResult.code = 202;
                            ajaxResult.tips = "用户未申请账户";
                        } else {
                            ajaxResult.code = 200;
                            ajaxResult.tips = JSON.stringify(doc);
                        }
                        ajaxResult = JSON.stringify(ajaxResult);
                        res.json(ajaxResult);
                        return;
                    }).sort({ '_id': -1 });
                }
            }
        });
};