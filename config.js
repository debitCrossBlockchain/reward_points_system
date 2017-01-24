var config = {
    //keyStoreType: "file",
    keyStoreType: "mongo",
    //keyStore: "/tmp/keyValStore",
    //keyStore: "shensh:123$%^shensh@localhost:27027/nodedb",
    keyStore: "localhost:27017/nodedb",
    //ynetbcdb: "mongodb://shensh:123$%^shensh@localhost:27027/ynetbcdb",
    ynetbcdb: "mongodb://localhost:27017/ynetbcdb",
    devMode: false,
    caAddr: "grpc://0.0.0.0:7054",
    peerAddr: "grpc://0.0.0.0:3000",
    deployWait: 5,
    invokeWait: 1,
    adminName: "yc_admin",
    adminToken: "uCaKQkyzqigj",
    affiliation: "yc",
    CCID: ""
};
module.exports = config;