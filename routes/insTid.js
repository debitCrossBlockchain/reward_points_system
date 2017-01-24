var http = require('http');

module.exports = function(insTid) {
    /* GET tid page. */
    insTid.route('/insTid').get(function (req, res) {
        if (!req.session.user) { //到达路径首先判断是否已经登录
            req.session.error = "请先登录";
            res.redirect("/login"); //未登录则重定向到 /login 路径
        } else {
            if (req.session.user.type != "2") {
                req.session.user = null;
                req.session.error = "请先登录";
                res.redirect("/login");
            } else {
                console.log("************query tid*************");
                var Tid = global.dbHandel.getModel('tid');
                var uname = req.session.user.name;
                Tid.find({
                    user: uname
                },
                function (err, doc) {
                    if (err || !doc) {
                        console.log("数据库操作失败");
                        res.render("insTid", {
                            user: req.session.user.name,
                            title: '交易记录'
                        }); //渲染tid页面
                    } else {
                        res.render("insTid", {
                            user: req.session.user.name,
                            title: '交易记录',
                            tidList: doc
                        }); //渲染tid页面
                    }
                }).sort({ '_id': -1 });
            }
        }
    });

    /* GET "tiddetail" page. */
    insTid.get('/insTiddetail', function (req, res, next) {
        if (!req.session.user) {
            req.session.error = "请先登录";
            res.redirect("/login"); //未登录则重定向到 /login 路径
        } else {
            //获取get参数
            var tid = req.query.tid;
            var opt = {
                method: "GET",
                host: "127.0.0.1",
                port: 7000,
                path: '/transactions/' + tid
            };
            //http请求
            var req = http.request(opt, function (serverFeedback) {
                serverFeedback.setEncoding('utf8');
                if (serverFeedback.statusCode == 200) {
                    var body = "";
                    serverFeedback.on('data', function (chunk) {
                        body += chunk;
                    });
                    serverFeedback.on('end', function () {
                        resData = JSON.parse(body);
                        res.render('insTiddetail', {
                            title: "交易记录",
                            jsonRes: resData
                        });
                        return;
                    });
                } else {
                    res.send(250, "error");
                    return;
                }
            });
            req.on('error', function (e) {
                console.log("Got error: " + e.message);
                res.send(500, "error");
            });
            req.end();
        }
    });
};