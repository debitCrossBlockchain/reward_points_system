module.exports = { 
    users:{
        type:{type:String,required:true}, //1:超级管理员 2:机构 3:普通用户
        name:{type:String,required:true},
        password:{type:String,required:true},
        token:{type:String},
        institution:{type:String},
        institutionToken:{type:String},
        institutionAddress:{type:String} //机构存机构自身的账户，普通用户存上级机构的账户
    },
    address:{ 
        user:{type:String,required:true},
        address:{type:String,required:true},
        time:{type:String}
    },
    tid:{ 
        user:{type:String,required:true},
        address:{type:String,required:true},
        tid:{type:String,required:true},
        tips:{type:String},
        time:{type:String}
    },
    asset:{ 
        institution:{type:String,required:true},
        asset:{type:String,required:true},        
        expire:{type:String,required:true}
    },
};