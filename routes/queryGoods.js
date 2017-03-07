module.exports = function (queryGoods) {
    /* GET query address. */
    queryGoods.post("/queryGoods",
        function (req, res) {
            if (!req.session.user) { //到达路径首先判断是否已经登录
                req.session.error = "请先登录";
                res.redirect("/login"); //未登录则重定向到 /login 路径
            } else {
                if (req.session.user.type != "2") {
                    req.session.user = null;
                    req.session.error = "请先登录";
                    res.redirect("/login");
                } else {
                    console.log("************query goods*************");
                    var Goods = global.dbHandel.getModel('goods');
                    var ins = req.session.user.name;
                    Goods.find({
                        institution: ins
                    },
                    function (err, doc) {
                        var ajaxResult = {
                            code: 1,
                            tips: ""
                        };
                        if (err || !doc) {
                            ajaxResult.code = 201;
                            ajaxResult.tips = "数据库操作失败";
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