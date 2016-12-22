var hfc = require('hfc');
var chainUtil = require('../utils/chainUtil');

module.exports = function (deploy) {
    /* GET assign page. */
    deploy.route('/deploy').get(function (req, res) {
        if (!req.session.user) { //到达路径首先判断是否已经登录
            req.session.error = "请先登录";
            res.redirect("/admin"); //未登录则重定向到 /admin 路径
        } else {
            if (req.session.user.type != "1" && req.session.user.type != "2") {
                req.session.user = null;
                req.session.error = "请先登录";
                res.redirect("/admin");
            } else {
                res.render("deploy", {
                    user: req.session.user.name,
                    title: 'CC部署'
                }); //渲染deploy页面
            }
        }
    });
    deploy.route('/deploy').post(function (req, res) {
        console.log("************deploy*************");
        var uname = req.session.user.name;
        var token = req.session.user.token;
        var path = req.body.path;
        var ajaxResult = {
            code: 1,
            tips: ""
        };

        //调用sdk
        var chain = chainUtil.getAssetChain("mychain");
        console.log("enrolling " + uname + "...");
        chain.enroll(uname, token, function (err, admin) {
            if (err) {
                console.log("超级管理员登录失败");
                ajaxResult.code = 201;
                ajaxResult.tips = "超级管理员登录失败";
                ajaxResult = JSON.stringify(ajaxResult);
                res.json(ajaxResult);
                return;
            }
            console.log("enroll " + uname + " ok");
            admin.getUserCert(null, function (err, adminCert) {
                if (err) {
                    console.log("获取超级管理员证书失败");
                    ajaxResult.code = 202;
                    ajaxResult.tips = "获取超级管理员证书失败";
                    ajaxResult = JSON.stringify(ajaxResult);
                    res.json(ajaxResult);
                    return;
                }
                var deployRequest = {
                    fcn: "init",
                    args: [],
                    confidential: true,
                    metadata: new Buffer("assigner"),
                    chaincodePath: path
                };
                var tx = admin.deploy(deployRequest);
                tx.on('complete', function (results) {
                    console.log("CC部署成功");
                    ajaxResult.code = 200;
                    ajaxResult.tips = results.chaincodeID;
                    ajaxResult = JSON.stringify(ajaxResult);
                    res.json(ajaxResult);
                    return;
                });
                tx.on('error', function (error) {
                    console.log("CC部署失败");
                    ajaxResult.code = 203;
                    ajaxResult.tips = "CC部署失败";
                    ajaxResult = JSON.stringify(ajaxResult);
                    res.json(ajaxResult);
                    return;
                });
            });
        });
    });
};