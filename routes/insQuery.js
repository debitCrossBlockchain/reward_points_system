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

module.exports = function (insQuery) {
    /* GET query page. */
    insQuery.route('/insQuery').get(function (req, res) {
        if (!req.session.user) { //到达路径首先判断是否已经登录
            req.session.error = "请先登录";
            res.redirect("/login"); //未登录则重定向到 /login 路径
        } else {
            if (req.session.user.type != "2") {
                req.session.user = null;
                req.session.error = "请先登录";
                res.redirect("/login");
            } else {
                res.render("insQuery", {
                    user: req.session.user.name,
                    title: '积分查询'
                }); //渲染insQuery页面
            }
        }
    });
    insQuery.route('/insQuery').post(function (req, res) {
        console.log("************query asset*************");
        var iname = req.session.user.name;
        var itoken = req.session.user.token;
        var iaddress = req.session.user.institutionAddress;
        var ajaxResult = {
            code: 1,
            tips: ""
        };

        //调用sdk
        var chain = chainUtil.getAssetChain("mychain");
        console.log("enrolling " + iname + "...");
        chain.enroll(iname, itoken, function (err, organization) {
            if (err) {
                console.log("用户登录失败");
                ajaxResult.code = 201;
                ajaxResult.tips = "用户登录失败";
                ajaxResult = JSON.stringify(ajaxResult);
                res.json(ajaxResult);
                return;
            }else{
                console.log("enroll " + iname + " ok");
                organization.getUserCert(null, function (err, organizationCert) {
                    if (err) {
                        console.log("获取证书失败");
                        ajaxResult.code = 202;
                        ajaxResult.tips = "获取证书失败";
                        ajaxResult = JSON.stringify(ajaxResult);
                        res.json(ajaxResult);
                        return;
                    }
                    var req = {
                        chaincodeID: global.CCID,
                        fcn: "getInstitutionById",
                        args: [organizationCert.encode().toString('base64'), iaddress],
                        confidential: true,
                        userCert: organizationCert
                    };
                    console.log("query begin");
                    var tx = organization.query(req);
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