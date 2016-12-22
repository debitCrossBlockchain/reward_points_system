module.exports = function(admin) {
    //管理员功能
    /* GET admin page. */
    admin.route('/admin').get(function (req, res) {
        res.render('admin', {
            title: '管理员登录'
        });
    });
    admin.route('/admin').post(function (req, res) { // 从此路径检测到post方式则进行post数据的处理操作
        console.log("************admin login*************");
        //get User info
        var User = global.dbHandel.getModel('users');
        var uname = req.body.uname;
        User.findOne({
            name: uname
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
            } else if (!doc) { //查询不到用户名匹配信息，则用户名不存在
                console.log("用户名不存在");
                req.session.error = "用户名不存在";
                ajaxResult.code = 202;
                ajaxResult.tips = "用户名不存在";
            } else {
                if (req.body.upwd != doc.password) { //查询到匹配用户名的信息，但相应的password属性不匹配
                    console.log("密码错误");
                    req.session.error = "密码错误";
                    ajaxResult.code = 203;
                    ajaxResult.tips = "密码错误";
                } else if (doc.type != "1" && doc.type != "2") {
                    console.log("不是管理员");
                    req.session.error = "不是管理员";
                    ajaxResult.code = 204;
                    ajaxResult.tips = "不是管理员";
                } else { //信息匹配成功，则将此对象（匹配到的user) 赋给session.user，并返回成功
                    req.session.user = doc;
                    ajaxResult.code = 200;
                }
            }
            ajaxResult = JSON.stringify(ajaxResult);
            res.json(ajaxResult);
            return;
        });
    });
};