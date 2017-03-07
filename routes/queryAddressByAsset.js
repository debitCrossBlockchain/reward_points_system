module.exports = function (queryAddressByAsset) {
    /* GET query address. */
    queryAddressByAsset.post("/queryAddressByAsset",
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
                    console.log("************query Address*************");
                    var Address = global.dbHandel.getModel('address');
                    var ins = req.session.user.name;
                    var target = req.body.target;
                    var asset = req.body.asset;
                    Address.find({
                        user: target,
                        institution: ins,
                        asset: asset
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