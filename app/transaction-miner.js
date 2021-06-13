const Transaction = require('../wallet/transaction');

class TransactionMiner{

    constructor({blockchain, transactionPool, wallet, pubsub}){
        this.blockchain = blockchain,
        this.transactionPool = transactionPool,
        this.wallet = wallet,
        this.pubsub = pubsub;
    }

    mineTractions(){
        //get the valid transcations from transaction pool
        const validTransactions = this.transactionPool.validTransactionsInPool();

        //if(validTransactions.length !== 0){

            //generate the miner's reward
        validTransactions.push(
            Transaction.rewardTransaction({minerWallet: this.wallet})
        )
        

        //add a block consisting of these transations to the block chain
        this.blockchain.addBlock({data: validTransactions});

        //broadcast the updated blockchain
        this.pubsub.broadcastChain();

        //clear the pool
        this.transactionPool.clear();
        // }else{
        //     alert("Can not mine an empty transaction pool");
        // }
        
    }
}

module.exports = TransactionMiner;