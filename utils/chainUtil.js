var hfc = require('hfc');

//var keyStore = "/tmp/keyValStore";
var keyStore = "localhost:27017/nodedb";
var caAddr = "0.0.0.0:7054";
var peerAddr = "0.0.0.0:3000";
var deployWait = 5;
var invokeWait = 1;

function getAssetChain(name) {
    var chain;
    if (!global.chainFlag) {
        console.log("new chain!");
        global.chainFlag = true;
        chain = hfc.newChain(name);
        //chain.setKeyValStore(hfc.newFileKeyValStore(keyStore));
        chain.setKeyValStore(hfc.newMongoKeyValStore(keyStore));
        chain.setMemberServicesUrl("grpc://" + caAddr);
        chain.addPeer("grpc://" + peerAddr);
        chain.setDevMode(false);
        chain.setDeployWaitTime(parseInt(deployWait));
        chain.setInvokeWaitTime(parseInt(invokeWait));
    } else {
        console.log("get chain!");
        chain = hfc.getChain(name, false);
        chain.setKeyValStore(hfc.newMongoKeyValStore(keyStore));
    }
    return chain;
}

exports.getAssetChain = getAssetChain;
