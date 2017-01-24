var hfc = require('hfc');
var chainUtil = require('../utils/chainUtil');
var async = require('async');

//结果排序
// function getSortFun(order, sortBy) {
//     var ordAlpah = (order == 'asc') ? '>' : '<';
//     var sortFun = new Function('a', 'b', 'return a.' + sortBy + ordAlpah + 'b.' + sortBy + '?1:-1');
//     return sortFun;
// }

//sdk query结果转化为正常数字
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

module.exports = function (institution) {
    institution.route('/institution').get(function (req, res) {
        if (!req.session.user) { //到达路径首先判断是否已经登录
            req.session.error = "请先登录";
            res.redirect("/login"); //未登录则重定向到 /admin 路径
        } else {
            if (req.session.user.type != "1") {
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
                        res.render("institution", {
                            user: req.session.user.name,
                            title: '机构管理',
                            institutionList: []
                        }); //渲染institution页面
                    } else {
                        res.render("institution", {
                            user: req.session.user.name,
                            title: '机构管理',
                            institutionList: doc
                        }); //渲染institution页面
                    }
                }).sort({ '_id': -1 });
            }
        }
    });
    institution.route('/institution').post(function (req, res) {
        console.log("************query asset*************");
        var Asset = global.dbHandel.getModel('asset');
        var User = global.dbHandel.getModel('users');
        var uname = req.body.institution;
        var token = "";
        var address = "";
        var ajaxResult = {
            code: 1,
            tips: ""
        };

        async.auto({
            //查询资产
            getAsset: function (cb) {
                Asset.find({
                    institution: uname
                },
                function (err, doc) {
                    if (err) {
                        cb(err);
                    } else if (!doc) {
                        cb("no asset");
                    } else {
                        cb(null, doc);
                    }
                });
            },
            //查询机构信息
            getIns: function (cb) {
                User.findOne({
                    name: uname
                },
                function (err, doc) {
                    if (err) {
                        cb(err);
                    } else if (!doc) {
                        cb("no institution");
                    } else {
                        cb(null, doc);
                    }
                });
            },
            //调用sdk
            callSDK: ['getAsset', 'getIns',
            function (arg, cb) {
                docAsset = arg.getAsset;
                docIns = arg.getIns;
                token = docIns.token;
                address = docIns.institutionAddress;
                var chain = chainUtil.getAssetChain("mychain");
                console.log("enrolling " + uname + "...");
                chain.enroll(uname, token, function (err, organization) {
                    if (err) {
                        cb(err);
                    }else{
                        console.log("enroll " + uname + " ok");
                        organization.getUserCert(null, function (err, organizationCert) {
                            if (err) {
                                cb(err);
                            }else{
                                var req = {
                                    chaincodeID: global.CCID,
                                    fcn: "getInstitutionById",
                                    args: [organizationCert.encode().toString('base64'), address],
                                    confidential: true,
                                    userCert: organizationCert
                                };
                                console.log("query begin");
                                var tx = organization.query(req);
                                tx.on('complete', function (results) {
                                    console.log("query complete");
                                    cb(null,ascToStr(results.result));
                                });
                                tx.on('error', function (error) {
                                    cb("error");
                                });
                            }
                        });
                    }
                });                                
            }]
        },
        function (err, results) {
            if (err != null) {
                console.log("机构积分查询失败");
                console.log(err);
                ajaxResult.code = 201;
                ajaxResult.tips = "机构积分查询失败";
                ajaxResult = JSON.stringify(ajaxResult);
                res.json(ajaxResult);
                return;
            } else {
                console.log("机构积分查询成功");
                console.log(results.callSDK);
                ajaxResult.code = 200;
                ajaxResult.tips = results.callSDK;
                ajaxResult = JSON.stringify(ajaxResult);
                res.json(ajaxResult);
                return;
            }
        });
    });
};