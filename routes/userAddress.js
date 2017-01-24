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
                console.log("************query institution*************");
                var User = global.dbHandel.getModel('users');
                User.find({
                    type: "2"
                },
                function (err, doc) {
                    if (err || !doc) {
                        console.log("数据库操作失败");
                        res.render("userAddress", {
                            user: req.session.user.name,
                            title: '账户管理',
                            insList: []
                        }); //渲染assign页面
                    } else {
                        res.render("userAddress", {
                            user: req.session.user.name,
                            title: '账户管理',
                            insList: doc
                        }); //渲染assign页面
                    }
                }).sort({ '_id': -1 });
            }
        }
    });
    userAddress.route('/userAddress').post(function (req, res) {
        console.log("************apply for address*************");
        var uname = req.session.user.name;
        var ins = req.body.ins;
        var asset = req.body.asset;
        var ajaxResult = {
            code: 1,
            tips: ""
        };
        // var cryptoPrimitives = new crypto.Crypto("SHA3", 256);
        // var keyPair = cryptoPrimitives.ecdsaKeyGen();
        // var sk = cryptoPrimitives.ecdsaKeyFromPrivate(keyPair.prvKeyObj.prvKeyHex, 'hex');
        // var pk = cryptoPrimitives.ecdsaKeyFromPublic(keyPair.pubKeyObj.pubKeyHex, 'hex');
        // var address = cryptoPrimitives.hash(pk);
        var Address = global.dbHandel.getModel('address');
        Address.create({
            "user": uname,
            "address": uuid.v4(),
            "institution":ins,
            "asset":asset,
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