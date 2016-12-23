var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var models = require("./models");
conn = mongoose.createConnection("mongodb://localhost:27017/ynetbcdb");

for(var m in models){ 
    conn.model(m,new Schema(models[m]),m);
}

module.exports = { 
    getModel: function(type){ 
        return _getModel(type);
    }
};

var _getModel = function(type){ 
    return conn.model(type);
};