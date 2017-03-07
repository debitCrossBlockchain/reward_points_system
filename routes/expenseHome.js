var hfc = require('hfc');
var chainUtil = require('../utils/chainUtil');

module.exports = function (expenseHome) {
    /* GET query page. */
    expenseHome.route('/expenseHome').get(function (req, res) {
        if (!req.session.user) { //到达路径首先判断是否已经登录
            req.session.error = "请先登录";
            res.redirect("/login"); //未登录则重定向到 /login 路径
        } else {
            if (req.session.user.type != "3") {
                req.session.user = null;
                req.session.error = "请先登录";
                res.redirect("/login");
            } else {
                console.log("************query institution*************");
                var User = global.dbHandel.getModel('users');
                User.find({
                    type: "2"
                },
                function (err, doc) {
                    if (err || !doc) {
                        console.log("数据库操作失败");
                        res.render("expenseHome", {
                            user: req.session.user.name,
                            title: '积分购',
                            insList: []
                        }); //渲染expenseHome页面
                    } else {
                        res.render("expenseHome", {
                            user: req.session.user.name,
                            title: '积分购',
                            insList: doc
                        }); //渲染expenseHome页面
                    }
                }).sort({ '_id': -1 });
            }
        }
    });
};