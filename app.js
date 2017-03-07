var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var multer = require('multer');
var mongoose = require('mongoose');
var session = require('express-session');
var ejs = require('ejs');

var index = require('./routes/index');
var users = require('./routes/users');
var home = require('./routes/home');
var logout = require('./routes/logout');
var login = require('./routes/login');
var register = require('./routes/register');
var userAddress = require('./routes/userAddress');
var queryAddress = require('./routes/queryAddress');
var assign = require('./routes/assign');
var transfer = require('./routes/transfer');
var query = require('./routes/query');
var uuid = require('./routes/uuid');
var adminHome = require('./routes/adminHome');
var deploy = require('./routes/deploy');
var institution = require('./routes/institution');
var insRegister = require('./routes/insRegister');
var issue = require('./routes/issue');
var restTest = require('./routes/restTest');
var insHome = require('./routes/insHome');
var insQuery = require('./routes/insQuery');
var insTid = require('./routes/insTid');
var expense = require('./routes/expense');
var queryAsset = require('./routes/queryAsset');
var queryAssetByAddress = require('./routes/queryAssetByAddress');
var expenseHome = require('./routes/expenseHome');
var goods = require('./routes/goods');
var queryGoods = require('./routes/queryGoods');
var queryGoodsPrice = require('./routes/queryGoodsPrice');
var autoFillTransferForm = require('./routes/autoFillTransferForm');
var queryAddressByAsset = require('./routes/queryAddressByAsset');

var app = express();

//db
global.dbHandel = require('./database/dbHandel');
//global.db = mongoose.createConnection("mongodb://shensh:123$%^shensh@localhost:27027/ynetbcdb");
var config = require('./config.js');

global.chainFlag = false;
global.CCID = "";
global.adminName = config.adminName;
global.adminToken = config.adminToken;
global.affiliation = config.affiliation;

//从数据库获取CCID
var Asset = global.dbHandel.getModel('asset');
Asset.findOne({
    institution: "&^%"
},
function (err, doc) {
    if (err || !doc) {
        console.log("从配置文件读取CCID");
        global.CCID = config.CCID;
    } else {
        console.log("从数据库读取CCID");
        global.CCID = doc.asset;      
    }
});

//将yc_admin管理员Token写库
var Users = global.dbHandel.getModel('users');
var conditions = { type: "1" };
var update = { $set: { name: global.adminName, password: "admin", token: global.adminToken } };
var options = { upsert: true };
Users.update(conditions, update, options,
function (err) {
    if (err) {
        console.log("yc_admin管理员Token写库失败");
    } else {
        console.log("yc_admin管理员Token写库成功");
    }
});

app.use(session({
    secret: 'secret',
    resave: true,
    saveUninitialized: true,
    cookie: { /*secure: true ,*/ maxAge: 1000 * 60 * 30 }
}));

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
// app.engine('.html', ejs.__express);
// app.set('view engine', 'html');

// uncomment after placing your favicon in /public
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));


///路由管理表
index(app); 
users(app); 
home(app); 
logout(app); 
login(app); 
register(app); 
userAddress(app); 
queryAddress(app); 
assign(app); 
transfer(app); 
query(app);
uuid(app);
restTest(app);
queryAsset(app);
queryAssetByAddress(app);
expense(app);
expenseHome(app);
queryGoodsPrice(app);
autoFillTransferForm(app);

//管理员功能
adminHome(app);
deploy(app);
institution(app);
insRegister(app);
issue(app);
insHome(app);
insQuery(app);
insTid(app);
goods(app);
queryGoods(app);
queryAddressByAsset(app);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});

//module.exports = app;
app.listen(9999);
