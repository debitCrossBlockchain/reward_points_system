package main

import (
	"errors"
	"os"

	"github.com/hyperledger/fabric/core/chaincode"
	"github.com/hyperledger/fabric/core/chaincode/platforms"
	"github.com/hyperledger/fabric/core/container"
	"github.com/hyperledger/fabric/core/crypto"
	"github.com/hyperledger/fabric/core/peer"
	pb "github.com/hyperledger/fabric/protos"
	"github.com/op/go-logging"
	"github.com/spf13/viper"
	"golang.org/x/net/context"
	"google.golang.org/grpc"
)

var (
	logger = logging.MustGetLogger("TEST")

	peerClientConn *grpc.ClientConn
	serverClient   pb.PeerClient

	jim     crypto.Client
	jimCert crypto.CertificateHandler
)

func init() {

	format := logging.MustStringFormatter(`[%{module}] %{time:2006-01-02 15:04:05} [%{level}] [%{longpkg} %{shortfile}] { %{message} }`)

	backendConsole := logging.NewLogBackend(os.Stderr, "", 0)
	backendConsole2Formatter := logging.NewBackendFormatter(backendConsole, format)

	logging.SetBackend(backendConsole2Formatter)
	logging.SetLevel(logging.INFO, "TEST")

	viper.SetConfigName("core")
	viper.AddConfigPath("./")
	viper.SetConfigType("yaml")

	if err := viper.ReadInConfig(); err != nil {
		logger.Fatalf("Fatal error when reading %s config file: %s\n", "core.yaml", err)
	}
}

func main() {

	if err := InitClient(); err != nil {
		logger.Fatal("initClient", err)
	}

	if err := Deploy(); err != nil {
		logger.Fatal("initClient", err)
	}

}

func InitClient() (err error) {

	logger.Info("-----------  InitClient -------------")

	viper.Set("ledger.blockchain.deploy-system-chaincode", "false")
	viper.Set("peer.validator.validity-period.verification", "false")

	peerClientConn, err = peer.NewPeerClientConnection()
	if err != nil {
		logger.Error("error connection to server at host:port", viper.GetString("peer.address"))
		return
	}
	serverClient = pb.NewPeerClient(peerClientConn)

	crypto.Init()

	if err = crypto.RegisterClient("jim", nil, "jim", "6avZQLwcUe9b"); err != nil {
		logger.Error("crypto.RegisterClient", err)
		return

	}

	jim, err = crypto.InitClient("jim", nil)
	if err != nil {
		logger.Error("crypto.InitClient", err)
		return
	}

	jimCert, err = jim.GetTCertificateHandlerNext()
	if err != nil {
		logger.Error("GetTCertificateHandlerNext", err)
		return
	}

	return
}

func Deploy() (e error) {

	logger.Info("-----------  Deploy -------------")

	jimCert, e = jim.GetTCertificateHandlerNext()
	if e != nil {
		logger.Error("GetTCertificateHandlerNext", e)
		return
	}

	spec := &pb.ChaincodeSpec{
		Type:                 1,
		ChaincodeID:          &pb.ChaincodeID{Path: "github.com/bonus"},
		CtorMsg:              &pb.ChaincodeInput{Function: "init", Args: []string{"0", "000"}},
		Metadata:             jimCert.GetCertificate(),
		ConfidentialityLevel: pb.ConfidentialityLevel_CONFIDENTIAL,
	}

	// First build the deployment spec
	cds, err := getChaincodeBytes(spec)
	if e = err; err != nil {
		logger.Error("Error getting deployment spec", err)
		return
	}

	transaction, err := jim.NewChaincodeDeployTransaction(cds, cds.ChaincodeSpec.ChaincodeID.Name)
	if e = err; err != nil {
		logger.Error("Error deploying chaincode", err)
		return
	}

	resp, err := processTransaction(transaction)
	if e = err; err != nil {
		logger.Error("processTransaction", err)
		return
	}

	logger.Info("resp", resp.String())

	chaincodeName := cds.ChaincodeSpec.ChaincodeID.Name
	logger.Info("ChaincodeName", chaincodeName)

	return
}

func getChaincodeBytes(spec *pb.ChaincodeSpec) (*pb.ChaincodeDeploymentSpec, error) {
	mode := viper.GetString("chaincode.mode")
	var codePackageBytes []byte
	if mode != chaincode.DevModeUserRunsChaincode {
		logger.Debug("Received build request for chaincode spec", spec)
		var err error
		if err = checkSpec(spec); err != nil {
			return nil, err
		}

		codePackageBytes, err = container.GetChaincodePackageBytes(spec)
		if err != nil {
			logger.Error("Error getting chaincode package bytes", err)
			return nil, err
		}
	}
	chaincodeDeploymentSpec := &pb.ChaincodeDeploymentSpec{ChaincodeSpec: spec, CodePackage: codePackageBytes}
	return chaincodeDeploymentSpec, nil
}

func checkSpec(spec *pb.ChaincodeSpec) error {
	// Don't allow nil value
	if spec == nil {
		return errors.New("Expected chaincode specification, nil received")
	}

	platform, err := platforms.Find(spec.Type)
	if err != nil {
		logger.Error("Failed to determine platform type", err)
		return err
	}

	return platform.ValidateSpec(spec)
}

func processTransaction(tx *pb.Transaction) (*pb.Response, error) {
	return serverClient.ProcessTransaction(context.Background(), tx)
}
