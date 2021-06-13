const Block = require('./block');
const {cryptoHash} = require('../util');
const { REWARD_INPUT, MINING_REWARD } = require('../config');
const Transaction = require('../wallet/transaction');
const Wallet = require('../wallet');

class BlockChain {
    constructor(){
        this.chain = [Block.genesis()];
    }

    addBlock({data}){
        const newBlock = Block.mineBlock({
            lastBlock: this.chain[this.chain.length-1],data
        });
        
        this.chain.push(newBlock);

    }

    validTransactionData({chain}){
        for(let i=1; i<chain.length; i++){
            const block = chain[i];
            const transactionSet = new Set();
            let rewardTransactionCount = 0;
        
            for (let transaction of block.data) {
                if (transaction.input.address === REWARD_INPUT.address){
                    rewardTransactionCount++;

                    if(rewardTransactionCount > 1){
                        console.error('Miner rewards exceed limit');
                        return false;
                    }

                    if(Object.values(transaction.outputMap)[0] !== MINING_REWARD){
                        console.error('Miner reward amount is invalid');
                        return false;
                    }
                }else{
                    if(!Transaction.validTransaction(transaction)){
                        console.error('invalid transaction');
                        return false;
                    }

                    const trueBalance = Wallet.calculateBalanceByTime({
                        chain,
                        address: transaction.input.address,
                        timestamp:transaction.input.timestamp
                    });

                    if( transaction.input.amount !== trueBalance){
                        console.error(`invalid input amount, inputamount: ${transaction.input.amount}, trueBalance: ${trueBalance}`);
                        return false;
                    }

                    if(transactionSet.has(transaction)){
                        console.error('a transaction appear more than once in the block');
                        return false;
                    }else{
                        transactionSet.add(transaction);
                    }
                }
            }
        }
         
        return true;
    }

    static isValidChain(chain) {
        if(JSON.stringify(chain[0]) !== JSON.stringify(Block.genesis())){
            return false;
        }

        for(let i =1; i< chain.length; i++){
            const {timestamp, lastHash, hash, data, nonce, difficulty} = chain[i];

            const actualLastHash = chain[i-1].hash;
            const lastDifficulty = chain[i-1].difficulty;

            if(lastHash!==actualLastHash) return false;

            const validatedHash = cryptoHash(timestamp, lastHash, data, nonce, difficulty);

            if(hash !== validatedHash) return false;

            if(Math.abs(lastDifficulty-difficulty)>1) return false;
        }

        return true;
    }

    replaceChain(chain, validateTransactions, onSuccess){
        if(chain.length <= this.chain.length){
             console.error('The incoming chain must be longer');
            return;
        }

        if(!BlockChain.isValidChain(chain)){
            console.error('The incoming chain must be valid');
            return;
        }

        if( validateTransactions && !this.validTransactionData({chain})){
            console.error('The incoming chain has invalid data');
            return;
        }

        if(onSuccess) onSuccess();

        console.log('replacing chain with', chain);
        this.chain = chain;
    }
}

module.exports = BlockChain;