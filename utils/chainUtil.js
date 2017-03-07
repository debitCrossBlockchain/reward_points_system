var hfc = require('hfc');
var config = require('../config.js');

function getAssetChain(name) {
    var chain;
    if (!global.chainFlag) {
        console.log("new chain!");
        global.chainFlag = true;
        chain = hfc.newChain(name);
        if(config.keyStoreType === "file"){
            chain.setKeyValStore(hfc.newFileKeyValStore(config.keyStore));
        }else{
            chain.setKeyValStore(hfc.newMongoKeyValStore(config.keyStore));
        }
        chain.setMemberServicesUrl("grpc://" + config.caAddr);
        chain.addPeer("grpc://" + config.peerAddr);
        chain.setDevMode(config.devMode);
        chain.setDeployWaitTime(parseInt(config.deployWait));
        chain.setInvokeWaitTime(parseInt(config.invokeWait));
    } else {
        console.log("get chain!");
        chain = hfc.getChain(name, false);
        if(config.keyStoreType === "file"){
            chain.setKeyValStore(hfc.newFileKeyValStore(config.keyStore));
        }else{
            chain.setKeyValStore(hfc.newMongoKeyValStore(config.keyStore));
        }
    }
    return chain;
}

exports.getAssetChain = getAssetChain;
