var uuid = require('node-uuid');

module.exports = function(userAddress) {
    /* Get userAddress page.*/
    userAddress.route('/userAddress').get(function(req, res) {
        if (!req.session.user) { //到达/userAddress路径首先判断是否已经登录
            req.session.error = "请先登录";
            res.redirect("/login"); //未登录则重定向到 /login 路径
        } else {
            if (req.session.user.type != "3") {
                req.session.user = null;
                req.session.error = "请先登录";
                res.redirect("/login");
            } else {
                res.render("userAddress", {
                    user: req.session.user.name,
                    title: '账户管理'
                }); //已登录则渲染页面
            }
        }
    });
    userAddress.route('/userAddress').post(function (req, res) {
        console.log("************apply for address*************");
        var uname = req.session.user.name;
        var token = req.session.user.token;
        var ajaxResult = {
            code: 1,
            tips: ""
        };
        var Address = global.dbHandel.getModel('address');
        Address.create({
            "user": uname,
            "address": uuid.v4(),
            "time": new Date().toLocaleString()
        },
        function (err, results) {
            if (err) {
                console.log(err);
                ajaxResult.code = 201;
                ajaxResult.tips = "数据库操作失败";
            } else {
                console.log(results);
                ajaxResult.code = 200;
            }
            ajaxResult = JSON.stringify(ajaxResult);
            res.json(ajaxResult);
            return;
        });
    });
};