var hfc = require('hfc');
var chainUtil = require('../utils/chainUtil');
var async = require('async');

//query结果转化为正确json格式字符串
function ascToStr(inStr) {
    var len = inStr.length;
    if (len % 2 !== 0) {
        return "";
    }
    var charCode;
    var outStr = [];
    for (var i = 0; i < len; i = i + 2) {
        charCode = parseInt(inStr.substr(i, 2), 16);
        outStr.push(String.fromCharCode(charCode));
    }
    return outStr.join("");
}

module.exports = function (query) {
    /* GET query page. */
    query.route('/query').get(function (req, res) {
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
                    if (err || !doc) {
                        console.log("数据库操作失败");
                        res.render("query", {
                            user: req.session.user.name,
                            title: '积分查询',
                            addressList: []
                        }); //渲染assign页面
                    } else {
                        res.render("query", {
                            user: req.session.user.name,
                            title: '积分查询',
                            addressList: doc
                        }); //渲染assign页面
                    }
                }).sort({ '_id': -1 });
            }
        }
    });
    query.route('/query').post(function (req, res) {
        console.log("************query asset*************");
        var uname = req.session.user.name;
        var token = req.session.user.token;
        var address = req.body.address;
        var ajaxResult = {
            code: 1,
            tips: ""
        };

        //从数据库获取CCID
        var Asset = global.dbHandel.getModel('asset');
        if (global.CCID === "") {
            Asset.findOne({
                institution: "&^%"
            },
            function (err, doc) {
                if (err || !doc) {
                    console.log("从数据库获取CCID失败");
                    ajaxResult.code = 300;
                    ajaxResult.tips = "从数据库获取CCID失败";
                    ajaxResult = JSON.stringify(ajaxResult);
                    res.json(ajaxResult);
                    return;
                } else {
                    global.CCID = doc.asset;
                }
            });
        }        

        //调用sdk
        var chain = chainUtil.getAssetChain("mychain");
        console.log("enrolling " + uname + "...");
        chain.enroll(uname, token, function (err, user) {
            if (err) {
                console.log("用户登录失败");
                ajaxResult.code = 201;
                ajaxResult.tips = "用户登录失败";
                ajaxResult = JSON.stringify(ajaxResult);
                res.json(ajaxResult);
                return;
            }else{
                console.log("enroll " + uname + " ok");
                user.getUserCert(null, function (err, userCert) {
                    if (err) {
                        console.log("获取证书失败");
                        ajaxResult.code = 202;
                        ajaxResult.tips = "获取证书失败";
                        ajaxResult = JSON.stringify(ajaxResult);
                        res.json(ajaxResult);
                        return;
                    }
                    console.log("query begin");
                    var req = {
                        chaincodeID: global.CCID,
                        fcn: "getUserById",
                        args: [userCert.encode().toString('base64'), address],
                        confidential: true,
                        userCert: userCert
                        
                    };
                    var tx = user.query(req);
                    tx.on('complete', function (results) {
                        console.log("query complete");
                        console.log(ascToStr(results.result));
                        ajaxResult.code = 200;
                        ajaxResult.tips = ascToStr(results.result);
                        ajaxResult = JSON.stringify(ajaxResult);
                        res.json(ajaxResult);
                        return;
                    });
                    tx.on('error', function (error) {
                        console.log("query error");
                        ajaxResult.code = 203;
                        ajaxResult.tips = "积分查询失败";
                        ajaxResult = JSON.stringify(ajaxResult);
                        res.json(ajaxResult);
                        return;
                    });
                });
            }
        });
    });
};