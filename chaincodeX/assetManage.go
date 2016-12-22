package main

import (
	"crypto/x509"
	"encoding/asn1"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"sort"
	"strconv"

	"github.com/hyperledger/fabric/core/chaincode/shim"
	"github.com/hyperledger/fabric/core/crypto/primitives"
	"github.com/op/go-logging"
)

const (
	userTable         = "UserAssets"
	organizationTable = "OrganizationAssets"
)

type OutRow struct {
	Asset     string
	Expire    uint64
	Balance   uint64
	Extension string
}
type OutAll struct {
	UserBalance []OutRow
}

var myLogger = logging.MustGetLogger("assetManage")

type ByExpire []shim.Row

func (s ByExpire) Len() int {
	return len(s)
}

func (s ByExpire) Swap(i, j int) {
	s[i], s[j] = s[j], s[i]
}

func (s ByExpire) Less(i, j int) bool {
	return s[i].Columns[2].GetUint64() < s[j].Columns[2].GetUint64()
}

type AssetManageChaincode struct {
}

// Init method will be called during deployment.
// The deploy transaction metadata is supposed to contain the administrator cert
func (t *AssetManageChaincode) Init(stub shim.ChaincodeStubInterface, function string, args []string) ([]byte, error) {
	myLogger.Debug("Init...begin!")
	if len(args) != 0 {
		return nil, errors.New("Incorrect number of arguments. Expecting 0")
	}

	// Create UserAssets table
	err := stub.CreateTable(userTable, []*shim.ColumnDefinition{
		&shim.ColumnDefinition{Name: "Address", Type: shim.ColumnDefinition_STRING, Key: true},
		&shim.ColumnDefinition{Name: "Asset", Type: shim.ColumnDefinition_STRING, Key: true},
		&shim.ColumnDefinition{Name: "Expire", Type: shim.ColumnDefinition_UINT64, Key: true},
		&shim.ColumnDefinition{Name: "Balance", Type: shim.ColumnDefinition_UINT64, Key: false},
		&shim.ColumnDefinition{Name: "Extension", Type: shim.ColumnDefinition_STRING, Key: false},
	})
	if err != nil {
		return nil, errors.New("Failed create UserAssets table")
	}

	// Create OrganizationAssets table
	err = stub.CreateTable(organizationTable, []*shim.ColumnDefinition{
		&shim.ColumnDefinition{Name: "Asset", Type: shim.ColumnDefinition_STRING, Key: true},
		&shim.ColumnDefinition{Name: "Address", Type: shim.ColumnDefinition_STRING, Key: true},
		&shim.ColumnDefinition{Name: "Balance", Type: shim.ColumnDefinition_UINT64, Key: false},
	})
	if err != nil {
		return nil, errors.New("Failed create OrganizationAssets table")
	}

	// Set the role of the users that are allowed to assign assets
	// The metadata will contain the role of the users that are allowed to assign assets
	assignerRole, err := stub.GetCallerMetadata()
	if err != nil {
		return nil, fmt.Errorf("Failed get metadata:[%v]", err)
	}
	myLogger.Debugf("Assiger role is %v\n", string(assignerRole))
	if len(assignerRole) == 0 {
		return nil, errors.New("Assigner role is empty")
	}
	stub.PutState("assignerRole", assignerRole)

	myLogger.Debug("Init...done!")
	return nil, nil
}

func (t *AssetManageChaincode) issue(stub shim.ChaincodeStubInterface, args []string) ([]byte, error) {
	myLogger.Debug("Issue...begin!")
	/*
		args[0]     organization address
		args[1]     asset name
		args[2]     asset amount
	*/
	if len(args) != 3 {
		return nil, errors.New("Incorrect number of arguments. Expecting 3")
	}

	amount, err := strconv.ParseUint(args[2], 10, 0)
	if err != nil {
		return nil, errors.New("Amount is not a int64")
	}

	// Recover the role that is allowed to make assignments
	assignerRole, err := stub.GetState("assignerRole")
	if err != nil {
		return nil, errors.New("Failed getState")
	}
	callerRole, err := stub.ReadCertAttribute("role")
	if err != nil {
		return nil, errors.New("Failed readCertAttribute")
	}
	caller := string(callerRole[:])
	assigner := string(assignerRole[:])
	if caller != assigner {
		myLogger.Debugf("Caller is not assigner - caller %v assigner %v\n", caller, assigner)
		return nil, fmt.Errorf("The caller does not have the rights to invoke assign. Expected role [%v], caller role [%v]", assigner, caller)
	}

	//Verify asset name
	var columns []shim.Column
	col := shim.Column{Value: &shim.Column_String_{String_: args[1]}}
	columns = append(columns, col)
	rowChannel, err := stub.GetRows(organizationTable, columns)
	if err != nil {
		return nil, errors.New("Failed query address")
	}
	var rows []shim.Row
	for {
		select {
		case row, ok := <-rowChannel:
			if !ok {
				rowChannel = nil
			} else {
				rows = append(rows, row)
			}
		}
		if rowChannel == nil {
			break
		}
	}
	flagAddress := false
	if len(rows) == 0 {
		flagAddress = true
	}
	if len(rows) == 1 && rows[0].Columns[1].GetString_() == args[0] {
		flagAddress = true
	}

	//Insert or Replace the issueRow
	if flagAddress {
		_, err = insertOrUpdateIssue(stub, args[0], args[1], amount, "add")
		if err != nil {
			return nil, errors.New("Failed change issueRow")
		}
		myLogger.Debug("Issue...done!")
		return nil, nil
	} else {
		return nil, errors.New("Asset has been issued")
	}
}

func (t *AssetManageChaincode) assign(stub shim.ChaincodeStubInterface, args []string) ([]byte, error) {
	myLogger.Debug("Assign...begin!")
	/*
		args[0]     organization tcert
		args[1]     organization address
		args[2]     user address
		args[3]     asset name
		args[4]     asset expire
		args[5]     asset amount
		args[6]     asset extension
	*/
	if len(args) != 7 {
		return nil, errors.New("Incorrect number of arguments. Expecting 6")
	}

	expire, err := strconv.ParseUint(args[4], 10, 0)
	if err != nil {
		return nil, errors.New("expire is not a int64")
	}
	amount, err := strconv.ParseUint(args[5], 10, 0)
	if err != nil {
		return nil, errors.New("Amount is not a int64")
	}

	// Verify the identity of the caller
	owner, err := base64.StdEncoding.DecodeString(args[0])
	if err != nil {
		return nil, errors.New("Failed decode owner")
	}
	ok, err := t.isCaller(stub, owner)
	if err != nil {
		return nil, errors.New("Failed check asset owner identity")
	}
	if !ok {
		return nil, errors.New("The caller is not the owner of the asset")
	}

	//Verify address
	//	var argsVerify []string
	//	argsVerify = append(argsVerify, "assign")
	//	argsVerify = append(argsVerify, args...)
	//	address, err := t.verify(stub, argsVerify)
	//	if err != nil {
	//		return nil, errors.New("Failed check owner address")
	//	}
	address := args[1]

	//Replace the issueRow
	_, err = insertOrUpdateIssue(stub, address, args[3], amount, "cut")
	if err != nil {
		return nil, errors.New("Failed change issueRow")
	}

	//Insert or Replace the assetRow
	_, err = insertOrUpdateAsset(stub, args[2], args[3], expire, amount, args[6], "add")
	if err != nil {
		return nil, errors.New("Failed change assetRow")
	}

	myLogger.Debug("Assign...done!")
	return nil, err
}

func (t *AssetManageChaincode) transfer(stub shim.ChaincodeStubInterface, args []string) ([]byte, error) {
	myLogger.Debug("Transfer...begin!")
	/*
		args[0]     owner tcert
		args[1]     owner address
		args[2]     asset name
		args[3]     asset amount
		args[4]     target address
	*/
	if len(args) != 5 {
		return nil, errors.New("Incorrect number of arguments. Expecting 4")
	}
	amountTemp, err := strconv.ParseUint(args[3], 10, 0)
	if err != nil {
		return nil, errors.New("Amount is not a int64")
	}

	// Verify the identity of the caller
	// Only the owner can transfer one of his assets
	owner, err := base64.StdEncoding.DecodeString(args[0])
	if err != nil {
		return nil, errors.New("Failed decode owner")
	}
	ok, err := t.isCaller(stub, owner)
	if err != nil {
		return nil, errors.New("Failed check asset owner identity")
	}
	if !ok {
		return nil, errors.New("The caller is not the owner of the asset")
	}

	//Verify address
	//	var argsVerify []string
	//	argsVerify = append(argsVerify, "transfer")
	//	argsVerify = append(argsVerify, args...)
	//	address, err := t.verify(stub, argsVerify)
	//	if err != nil {
	//		return nil, errors.New("Failed check owner address")
	//	}
	address := args[1]

	//Query owner balance
	var columns []shim.Column
	col1 := shim.Column{Value: &shim.Column_String_{String_: address}}
	col2 := shim.Column{Value: &shim.Column_String_{String_: args[2]}}
	columns = append(columns, col1)
	columns = append(columns, col2)
	rowChannel, err := stub.GetRows(userTable, columns)
	if err != nil {
		return nil, errors.New("Failed query owner balance")
	}
	var allRows []shim.Row
	for {
		select {
		case row, ok := <-rowChannel:
			if !ok {
				rowChannel = nil
			} else {
				allRows = append(allRows, row)
			}
		}
		if rowChannel == nil {
			break
		}
	}

	//Sort owner balance by expire
	sort.Sort(ByExpire(allRows))

	//Begin transfer
	lastBalance := uint64(0)
	var rows []shim.Row
	for _, row := range allRows {
		rows = append(rows, row)
		balance := row.Columns[3].GetUint64()
		if amountTemp <= balance {
			lastBalance = balance
			break
		}
		amountTemp = amountTemp - balance
	}
	lastIndex := len(rows) - 1
	if amountTemp > lastBalance {
		return nil, errors.New("There is not enough amount")
	}

	if lastIndex > 0 {
		for _, row := range rows[:lastIndex] {
			err = stub.DeleteRow(
				userTable,
				[]shim.Column{
					shim.Column{Value: &shim.Column_String_{String_: address}},
					shim.Column{Value: &shim.Column_String_{String_: args[2]}},
					shim.Column{Value: &shim.Column_Uint64{Uint64: row.Columns[2].GetUint64()}}},
			)
			if err != nil {
				return nil, errors.New("Failed delete owner assetRow")
			}
			_, err = insertOrUpdateAsset(stub, args[4], args[2], row.Columns[2].GetUint64(), row.Columns[3].GetUint64(), row.Columns[4].GetString_(), "add")
			if err != nil {
				return nil, errors.New("Failed change target assetRow")
			}
		}
		if amountTemp == lastBalance {
			err = stub.DeleteRow(
				userTable,
				[]shim.Column{
					shim.Column{Value: &shim.Column_String_{String_: address}},
					shim.Column{Value: &shim.Column_String_{String_: args[2]}},
					shim.Column{Value: &shim.Column_Uint64{Uint64: rows[lastIndex].Columns[2].GetUint64()}}},
			)
			if err != nil {
				return nil, errors.New("Failed delete owner assetRow")
			}
		} else {
			_, err = insertOrUpdateAsset(stub, address, args[2], rows[lastIndex].Columns[2].GetUint64(), amountTemp, rows[lastIndex].Columns[4].GetString_(), "cut")
			if err != nil {
				return nil, errors.New("Failed change owner assetRow")
			}
		}
		_, err = insertOrUpdateAsset(stub, args[4], args[2], rows[lastIndex].Columns[2].GetUint64(), amountTemp, rows[lastIndex].Columns[4].GetString_(), "add")
		if err != nil {
			return nil, errors.New("Failed change target assetRow")
		}
	} else if amountTemp > 0 && amountTemp <= lastBalance {
		if amountTemp == lastBalance {
			err = stub.DeleteRow(
				userTable,
				[]shim.Column{
					shim.Column{Value: &shim.Column_String_{String_: address}},
					shim.Column{Value: &shim.Column_String_{String_: args[2]}},
					shim.Column{Value: &shim.Column_Uint64{Uint64: rows[0].Columns[2].GetUint64()}}},
			)
			if err != nil {
				return nil, errors.New("Failed delete owner assetRow")
			}
		} else {
			_, err = insertOrUpdateAsset(stub, address, args[2], rows[0].Columns[2].GetUint64(), amountTemp, rows[0].Columns[4].GetString_(), "cut")
			if err != nil {
				return nil, errors.New("Failed change owner assetRow")
			}
		}
		_, err = insertOrUpdateAsset(stub, args[4], args[2], rows[0].Columns[2].GetUint64(), amountTemp, rows[0].Columns[4].GetString_(), "add")
		if err != nil {
			return nil, errors.New("Failed update user's balance.")
		}
	}

	myLogger.Debug("Transfer...done!")
	return nil, nil
}

func (t *AssetManageChaincode) isCaller(stub shim.ChaincodeStubInterface, certificate []byte) (bool, error) {
	myLogger.Debug("Check caller...Begin!")

	// In order to enforce access control, we require that the
	// metadata contains the signature under the signing key corresponding
	// to the verification key inside certificate of
	// the payload of the transaction (namely, function name and args) and
	// the transaction binding (to avoid copying attacks)

	// Verify \sigma=Sign(certificate.sk, tx.Payload||tx.Binding) against certificate.vk
	// \sigma is in the metadata

	//	sigma, err := stub.GetCallerMetadata()
	//	if err != nil {
	//		return false, errors.New("Failed get metadata")
	//	}

	sigma, err := stub.GetCallerMetadata()
	if err != nil {
		return false, errors.New("Failed get metadata")
	}
	payload, err := stub.GetPayload()
	if err != nil {
		return false, errors.New("Failed get payload")
	}
	binding, err := stub.GetBinding()
	if err != nil {
		return false, errors.New("Failed get binding")
	}

	ok, err := stub.VerifySignature(
		certificate,
		sigma,
		append(payload, binding...),
	)
	if err != nil {
		myLogger.Errorf("Failed checking signature [%s]", err)
		return ok, err
	}
	if !ok {
		myLogger.Error("Invalid signature")
	}

	myLogger.Debug("Check caller...Verified!")
	return ok, err
}

func (t *AssetManageChaincode) verify(stub shim.ChaincodeStubInterface, argsVerify []string) (string, error) {
	myLogger.Debug("Verify and make address...Begin!")

	//get metadata
	metadata, err := stub.GetCallerMetadata()
	if err != nil {
		return "", errors.New("Failed get metadata")
	}
	var metaRaw [][]byte
	_, err = asn1.Unmarshal(metadata, &metaRaw)
	if err != nil {
		return "", errors.New("Failed unmarshal metadata")
	}

	//get pk
	pkRaw := metaRaw[1]
	pk, err := x509.ParsePKIXPublicKey(pkRaw)
	if err != nil {
		return "", errors.New("Failed get pk")
	}

	//get signature
	sign := metaRaw[2]

	//get args
	argsRaw, err := asn1.Marshal(argsVerify)
	if err != nil {
		return "", errors.New("Failed get args")
	}

	//verify
	ok, err := primitives.ECDSAVerify(pk, argsRaw, sign)
	if err != nil {
		myLogger.Errorf("Failed check signature [%s]", err)
		return "", err
	}
	if !ok {
		myLogger.Error("Invalid signature")
		return "", errors.New("Invalid signature")
	}

	//make address
	hash := primitives.Hash(pkRaw)
	address := hex.EncodeToString(hash)

	myLogger.Debug("Verify and make address...done!")
	return address, err
}

func insertOrUpdateIssue(stub shim.ChaincodeStubInterface, address string, asset string, amount uint64, op string) (bool, error) {

	//query and insert
	var columns []shim.Column
	col1 := shim.Column{Value: &shim.Column_String_{String_: asset}}
	col2 := shim.Column{Value: &shim.Column_String_{String_: address}}
	columns = append(columns, col1)
	columns = append(columns, col2)
	row, err := stub.GetRow(organizationTable, columns)
	if err != nil {
		return false, errors.New("Failed query organization balance row")
	}
	if len(row.GetColumns()) == 0 && op == "add" {
		myLogger.Debug("Start insert issueRow...")
		ok, err := stub.InsertRow(
			organizationTable,
			shim.Row{
				Columns: []*shim.Column{
					&shim.Column{Value: &shim.Column_String_{String_: asset}},
					&shim.Column{Value: &shim.Column_String_{String_: address}},
					&shim.Column{Value: &shim.Column_Uint64{Uint64: amount}}},
			})
		if !ok || err != nil {
			return false, errors.New("Failed insert issueRow")
		}
		myLogger.Debug("Insert issueRow done...")
		return true, nil
	}

	//replace
	balance := row.Columns[2].GetUint64()
	myLogger.Debug("Start replace issueRow...")
	if op == "add" {
		balance += amount
	} else {
		if amount >= balance {
			return false, errors.New("There is not enough amount")
		}
		balance -= amount
	}
	ok, err := stub.ReplaceRow(
		organizationTable,
		shim.Row{
			Columns: []*shim.Column{
				&shim.Column{Value: &shim.Column_String_{String_: asset}},
				&shim.Column{Value: &shim.Column_String_{String_: address}},
				&shim.Column{Value: &shim.Column_Uint64{Uint64: balance}}},
		})
	if !ok || err != nil {
		return false, errors.New("Failed replace issueRow")
	}
	myLogger.Debug("Replace issueRow done...")

	return true, nil
}

func insertOrUpdateAsset(stub shim.ChaincodeStubInterface, address string, asset string, expire uint64, amount uint64, extension string, op string) (bool, error) {

	//query and insert
	var columns []shim.Column
	col1 := shim.Column{Value: &shim.Column_String_{String_: address}}
	col2 := shim.Column{Value: &shim.Column_String_{String_: asset}}
	col3 := shim.Column{Value: &shim.Column_Uint64{Uint64: expire}}
	columns = append(columns, col1)
	columns = append(columns, col2)
	columns = append(columns, col3)
	row, err := stub.GetRow(userTable, columns)
	if err != nil {
		return false, errors.New("Failed query user balance row")
	}
	if len(row.GetColumns()) == 0 && op == "add" {
		myLogger.Debug("Start insert assetRow...")
		ok, err := stub.InsertRow(
			userTable,
			shim.Row{
				Columns: []*shim.Column{
					&shim.Column{Value: &shim.Column_String_{String_: address}},
					&shim.Column{Value: &shim.Column_String_{String_: asset}},
					&shim.Column{Value: &shim.Column_Uint64{Uint64: expire}},
					&shim.Column{Value: &shim.Column_Uint64{Uint64: amount}},
					&shim.Column{Value: &shim.Column_String_{String_: extension}}},
			})
		if !ok || err != nil {
			return false, errors.New("Failed insert assetRow")
		}
		myLogger.Debug("Insert assetRow done...")
		return true, nil
	}

	//replace
	balance := row.Columns[3].GetUint64()
	myLogger.Debug("Start replace assetRow...")
	if op == "add" {
		balance += amount
	} else {
		if amount > balance {
			return false, errors.New("There is not enough amount")
		}
		balance -= amount
	}
	ok, err := stub.ReplaceRow(
		userTable,
		shim.Row{
			Columns: []*shim.Column{
				&shim.Column{Value: &shim.Column_String_{String_: address}},
				&shim.Column{Value: &shim.Column_String_{String_: asset}},
				&shim.Column{Value: &shim.Column_Uint64{Uint64: expire}},
				&shim.Column{Value: &shim.Column_Uint64{Uint64: balance}},
				&shim.Column{Value: &shim.Column_String_{String_: extension}}},
		})
	if !ok || err != nil {
		return false, errors.New("Failed replace assetRow")
	}
	myLogger.Debug("Replace assetRow done...")

	return true, nil
}

// Invoke will be called for every transaction.
// Supported functions are the following:
// "assign(asset, owner)": to assign ownership of assets. An asset can be owned by a single entity.
// Only an administrator can call this function.
// "transfer(asset, newOwner)": to transfer the ownership of an asset. Only the owner of the specific
// asset can call this function.
// An asset is any string to identify it. An owner is representated by one of his ECert/TCert.
func (t *AssetManageChaincode) Invoke(stub shim.ChaincodeStubInterface, function string, args []string) ([]byte, error) {
	myLogger.Debugf("Invoke [%s]", function)
	// Handle different functions
	if function == "issue" {
		// Assign ownership
		return t.issue(stub, args)
	} else if function == "assign" {
		// Assign ownership
		return t.assign(stub, args)
	} else if function == "transfer" {
		// Transfer ownership
		return t.transfer(stub, args)
	}
	return nil, errors.New("Received unknown function invocation")
}

// Query callback representing the query of a chaincode
// Supported functions are the following:
// "query(asset)": returns the owner of the asset.
// Anyone can invoke this function.
func (t *AssetManageChaincode) Query(stub shim.ChaincodeStubInterface, function string, args []string) ([]byte, error) {
	myLogger.Debugf("Query [%s]", function)
	if function == "user" {
		var columns []shim.Column
		col1 := shim.Column{Value: &shim.Column_String_{String_: args[0]}}
		col2 := shim.Column{Value: &shim.Column_String_{String_: args[1]}}
		columns = append(columns, col1)
		columns = append(columns, col2)
		rowChannel, err := stub.GetRows(userTable, columns)
		if err != nil {
			return nil, errors.New("Failed query user row")
		}
		var rows []shim.Row
		for {
			select {
			case row, ok := <-rowChannel:
				if !ok {
					rowChannel = nil
				} else {
					rows = append(rows, row)
				}
			}
			if rowChannel == nil {
				break
			}
		}
		if len(rows) == 0 {
			return nil, errors.New("Can't find asset")
		}
		jsonRespPe := &OutAll{}
		var jsonRow OutRow
		for _, row := range rows {
			jsonRow.Asset = row.Columns[1].GetString_()
			jsonRow.Expire = row.Columns[2].GetUint64()
			jsonRow.Balance = row.Columns[3].GetUint64()
			jsonRow.Extension = row.Columns[4].GetString_()
			jsonRespPe.UserBalance = append(jsonRespPe.UserBalance, jsonRow)
		}
		jsonResp, err := json.Marshal(jsonRespPe)
		if err != nil {
			return nil, errors.New("Failed marshal jsonResp")
		}
		myLogger.Debug(jsonRespPe)
		return jsonResp, nil
	} else if function == "organization" {
		var columns []shim.Column
		col1 := shim.Column{Value: &shim.Column_String_{String_: args[1]}}
		col2 := shim.Column{Value: &shim.Column_String_{String_: args[0]}}
		columns = append(columns, col1)
		columns = append(columns, col2)
		row, err := stub.GetRow(organizationTable, columns)
		if err != nil {
			return nil, errors.New("Failed query organization balance row")
		}
		if len(row.GetColumns()) == 0 {
			return nil, errors.New("Can't find asset")
		}
		resp := strconv.FormatUint(row.Columns[2].GetUint64(), 10)
		myLogger.Debug("amount:",resp)
		return []byte(resp), nil
	}
	return nil, errors.New("Received unknown function invocation")
}

func main() {
	primitives.SetSecurityLevel("SHA3", 256)
	err := shim.Start(new(AssetManageChaincode))
	if err != nil {
		fmt.Printf("Error starting AssetManageChaincode: %s", err)
	}
}
