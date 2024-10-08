const { Web3 } = require("web3");
const EventEmbitter = require("events");
const HttpProvider = Web3.providers.HttpProvider;
const { sortObject, getTimestamp } = require("./helpers");
const crypto = require("./crypto");
const EthRpcList = require("./eth-rpc-list");
const ERC20_ABI = require("../data/ERC20-ABI.json");
const ERC721_ABI = require("../data/ERC721-ABI.json");
const { MuonAppError } = require("./errors");

const lastUsedRpcIndex = {};
const web3Instances = {};
const soliditySha3 = Web3.utils.soliditySha3;

const nameToChainIdMap = {
    local: "ganache",
    eth: 1, // Ethereum mainnet
    ropsten: 3, // Ethereum ropsten testnet
    rinkeby: 4, // Ethereum rinkeby testnet
    bsc: 56, // Binance Smart Chain mainnet
    bsctest: 97, // Binance Smart Chain testnet
    ftm: 250, // Fantom mainnet
    ftmtest: 4002, // Fantom testnet
    xdai: 100, // Xdai mainnet
    sokol: 77, // Xdai testnet
    polygon: 137, // polygon mainnet
    mumbai: 80001, // Polygon mumbai testnet
    fuji: 43113, // Avalanche Fuji Testnet
    avax: 43114, // Avalanche Mainnet
    arbitrumTestnet: 421611, //Arbitrum Testnet
    arbitrum: 42161, // Arbitrum
    metis: 1088, // Metis
    optimism: 10, // Optimism
    optimismTestnet: 420, // Optimism Testnet
};

function getNetworkId(network) {
    if (!!EthRpcList[network]) return network;
    return nameToChainIdMap[network];
}

function getWeb3(network) {
    let chainId = getNetworkId(network);
    if (chainId === undefined) return Promise.reject({ message: `invalid network "${network}"` });

    if (!web3Instances[chainId]) {
        const previusRpc = lastUsedRpcIndex[chainId] ?? -1;
        const nextRpc = (previusRpc + 1) % EthRpcList[chainId].length;
        lastUsedRpcIndex[chainId] = nextRpc;
        console.log(`eth rpc change %o`, {
            chainId,
            from: EthRpcList[chainId][previusRpc],
            to: EthRpcList[chainId][nextRpc],
        });
        web3Instances[chainId] = new Web3(new HttpProvider(EthRpcList[chainId][nextRpc]));
    }

    return Promise.resolve(web3Instances[chainId]);
}

function getWeb3Sync(network) {
    let chainId = getNetworkId(network);
    if (chainId === undefined) throw { message: `invalid network "${network}"` };

    if (!web3Instances[chainId]) {
        const nextRpc = ((lastUsedRpcIndex[chainId] ?? -1) + 1) % EthRpcList[chainId].length;
        lastUsedRpcIndex[chainId] = nextRpc;
        web3Instances[chainId] = new Web3(new HttpProvider(EthRpcList[chainId][nextRpc]));
    }

    return web3Instances[chainId];
}

function hashCallOutput(address, method, abi, result, outputFilter = [], extraParams = []) {
    let methodAbi = abi.find(({ name, type }) => name === method && type === "function");
    if (!methodAbi) {
        throw { message: `Abi of method (${method}) not found` };
    }
    let abiOutputs = methodAbi.outputs;
    if (!!outputFilter && outputFilter.length > 0) {
        abiOutputs = outputFilter.map((key) => {
            return methodAbi.outputs.find(({ name }) => name === key);
        });
    }
    // console.log('signing:',abiOutputs)
    let params = abiOutputs.map(({ name, type }) => ({
        type,
        value: !name || typeof result === "string" ? result : result[name],
    }));
    params = [{ type: "address", value: address }, ...params, ...extraParams];
    let hash = soliditySha3(...params);
    return hash;
}

const web3ProvidersSpecificErrors = [
    "CONNECTION ERROR",
    "Invalid JSON RPC response",
    "invalid json response body",
    "not authorized",
    "we can't execute this request",
    "Returned error:",
    "Returned values aren't valid",
].map((msg) => msg.toLowerCase());

function errorNeedRpcRotate(msg) {
    msg = msg.toLowerCase();
    for (const specificMsg of web3ProvidersSpecificErrors) {
        if (msg.includes(specificMsg)) return true;
    }
    return false;
}

async function wrappedCall(network, web3ApiCall, args = [], options = {}) {
    try {
        return await web3ApiCall(...args);
    } catch (e) {
        console.log('error on web3 call - ', e);
        const chainId = getNetworkId(network);
        if (options.forceRotate || errorNeedRpcRotate(e.message)) {
            console.log(`error on web3 call needs rpc rotate -`, { chainId, rpc: web3Instances[chainId].currentProvider.clientUrl }, e.message);
            delete web3Instances[chainId];
        }
        throw new MuonAppError("FAILED_TO_REACH_CHAIN", { chainId });
    }
}

function getTokenInfo(address, network) {
    return getWeb3(network).then(async (web3) => {
        let contract = new web3.eth.Contract(ERC20_ABI, address);
        return {
            symbol: await wrappedCall(network, contract.methods.symbol().call),
            name: await wrappedCall(network, contract.methods.name().call),
            decimals: await wrappedCall(contract.methods.decimals().call),
        };
    });
}
function getNftInfo(address, network) {
    return getWeb3(network).then(async (web3) => {
        let contract = new web3.eth.Contract(ERC721_ABI, address);
        return {
            symbol: await wrappedCall(network, contract.methods.symbol().call),
            name: await wrappedCall(network, contract.methods.name().call),
        };
    });
}

function getTransaction(txHash, network) {
    return getWeb3(network).then((web3) => wrappedCall(network, web3.eth.getTransaction.bind(web3), [txHash]));
}

function getTransactionReceipt(txHash, network) {
    return getWeb3(network).then((web3) => wrappedCall(network, web3.eth.getTransactionReceipt.bind(web3), [txHash]));
}

/**
 * Call a smart contract method
 * @param {string} contractAddress - Smart contract address
 * @param {string} methodName - Smart contract method name
 * @param {any} params - Call params
 * @param {object} abi - Smart contract ABI object
 * @param {string} network - Chain ID
 * @param {object} options - Options
 * @param {boolean, undefined} options.forceRotate - rotate RPC provider when any error happened.
 * @returns {Promise<any>}
 */
function call(contractAddress, methodName, params, abi, network, blockNumber = "latest", options = {}) {
    return getWeb3(network).then((web3) => {
        let contract = new web3.eth.Contract(abi, contractAddress);
        return wrappedCall(network, contract.methods[methodName](...params).call, [undefined, blockNumber], options);
    });
}

function read(contractAddress, property, params, abi, network) {
    return getWeb3(network).then((web3) => {
        let contract = new web3.eth.Contract(abi, contractAddress);
        return contract.methods[property].call(...params);
    });
}

function getBlock(network, blockHashOrBlockNumber) {
    return getWeb3(network).then((web3) => {
        return wrappedCall(network, web3.eth.getBlock.bind(web3), [blockHashOrBlockNumber]);
    });
}

function getBlockNumber(network) {
    return getWeb3(network).then((web3) => {
        return wrappedCall(network, web3.eth.getBlockNumber.bind(web3));
    });
}

function getPastEvents(network, contractAddress, abi, event, options) {
    return getWeb3(network).then((web3) => {
        let contract = new web3.eth.Contract(abi, contractAddress);
        return wrappedCall(network, contract.getPastEvents.bind(contract), [event, options]);
    });
}

const subscribeLogEvent = (network, contractAddress, contractAbi, eventName, interval = 5000) => {
    let subscribe = new Subscribe(network, contractAddress, contractAbi, eventName, interval);
    return subscribe;
};

class Subscribe extends EventEmbitter {
    constructor(network, contractAddress, abi, eventName, interval = 15000) {
        super();
        let web3 = getWeb3Sync(network);
        let contract = new web3.eth.Contract(abi, contractAddress);

        this.web3 = web3;
        this.network = network;
        this.interval = interval;
        this.contract = contract;
        this.lastBlock = -1;
        this.eventName = eventName;
        this._handler = this._handler.bind(this);

        this.timeout = setTimeout(this._handler, interval);
    }

    async _handler() {
        if (this.lastBlock < 0) {
            let lastBlock = (await this.web3.eth.getBlockNumber()) - 9000;
            console.log(`watch ${this.network}:${this.contract._address} (${this.eventName}) from block ${lastBlock}`);
            this.lastBlock = lastBlock;
        }

        let { contract, eventName, lastBlock, network } = this;
        contract.getPastEvents(
            eventName,
            {
                // filter: {id: id},
                fromBlock: lastBlock,
                toBlock: "latest",
            },
            (error, result) => {
                if (!error) {
                    let txs = [];
                    if (result.length > 0) {
                        let lastBlock = Math.max(...result.map(({ blockNumber }) => blockNumber));
                        this.lastBlock = lastBlock + 1;
                        txs = result.map(({ transactionHash, returnValues, blockNumber }) => ({
                            blockNumber,
                            transactionHash,
                            returnValues,
                        }));
                        this.emit("event", txs, network, contract._address);
                    }
                } else {
                    this.emit("error", error, network, contract._address);
                }
            }
        );
        setTimeout(this._handler, this.interval);
    }
}

module.exports = {
    getWeb3,
    getNetworkId,
    getBlock,
    getBlockNumber,
    getPastEvents,
    getWeb3Sync,
    hashCallOutput,
    soliditySha3,
    getTransaction,
    getTransactionReceipt,
    call,
    read,
    subscribeLogEvent,
    getTokenInfo,
    getNftInfo,
};
