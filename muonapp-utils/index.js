const axios = require("axios");
const { Web3 } = require("web3");
const tron = require("./utils/tron");
const { flatten, groupBy } = require("lodash");
const { BigNumber } = require("bignumber.js");
const BN = require("bn.js");
const { toBaseUnit } = require("./utils/crypto");
const { timeout, floatToBN, toBN } = require("./utils/helpers");
const util = require("ethereumjs-util");
const ws = require("ws");
const ethSigUtil = require("eth-sig-util");
const {
    getBlock: ethGetBlock,
    getBlockNumber: ethGetBlockNumber,
    getPastEvents: ethGetPastEvents,
    read: ethRead,
    call: ethCall,
    getTokenInfo: ethGetTokenInfo,
    getNftInfo: ethGetNftInfo,
    hashCallOutput: ethHashCallOutput,
} = require("./utils/eth");

const soliditySha3 = require("./utils/soliditySha3");

const { multiCall } = require("./utils/multicall");
const { BNSqrt } = require("./utils/bn-sqrt");
const { schnorrVerifyWithNonceAddress } = require("../utils");

const { apmAgent, withSpan } = require("./utils/apm");
const { ApmMetadataError } = require("./utils/errors");

module.exports = {
    axios,
    Web3,
    flatten,
    groupBy,
    tron,
    ws,
    timeout,
    BN,
    BigNumber,
    toBN,
    floatToBN,
    multiCall,
    ethGetBlock,
    ethGetBlockNumber,
    ethGetPastEvents,
    ethRead,
    ethCall,
    ethGetTokenInfo,
    ethGetNftInfo,
    ethHashCallOutput,
    toBaseUnit,
    soliditySha3,
    ecRecover: util.ecrecover,
    recoverTypedSignature: ethSigUtil.recoverTypedSignature,
    recoverTypedMessage: ethSigUtil.recoverTypedMessage,
    BNSqrt: BNSqrt,
    schnorrVerifyWithNonceAddress,
    apmAgent,
    withSpan,
    ApmMetadataError,
};
