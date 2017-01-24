var hfc = require('hfc');
var chainUtil = require('../utils/chainUtil');

module.exports = function (deploy) {
    /* GET assign page. */
    deploy.route('/deploy').get(function (req, res) {
        if (!req.session.user) { //到达路径首先判断是否已经登录
            req.session.error = "请先登录";
            res.redirect("/login"); //未登录则重定向到 /admin 路径
        } else {
            if (req.session.user.type != "1") {
                req.session.user = null;
                req.session.error = "请先登录";
                res.redirect("/login");
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

        var Asset = global.dbHandel.getModel('asset');
        var conditions;
        var update;
        var options; 

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
                    chaincodePath: path
                };
                var tx = admin.deploy(deployRequest);
                tx.on('submitted', function (results) {
                    console.log("CC部署成功");
                    global.CCID = results.chaincodeID;
                    conditions = { institution: "&^%" };
                    update = { $set: { asset: global.CCID } };
                    options = { upsert: true };
                    Asset.update(conditions, update, options,
                    function (err) {
                        if (err) {
                            ajaxResult.code = 200;
                            ajaxResult.tips = "CC部署成功，但CCID存库失败，请联系相关人员解决";
                            ajaxResult = JSON.stringify(ajaxResult);
                            res.json(ajaxResult);
                            return;
                        } else {
                            ajaxResult.code = 200;
                            ajaxResult.tips = results.chaincodeID;
                            ajaxResult = JSON.stringify(ajaxResult);
                            res.json(ajaxResult);
                            return;
                        }
                    });
                });
                tx.on('error', function (error) {
                    console.log("CC部署失败");
                    global.CCID = "";
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