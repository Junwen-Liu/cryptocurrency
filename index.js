
const bodyParser = require('body-parser');
const express = require('express');
const request = require('request');
const path = require('path');
const Blockchain = require('./blockchain');
const PubSub = require('./app/pubsub');
const TransactionPool = require('./wallet/transaction-pool');
const Wallet = require('./wallet/index');
const TransactionMiner = require('./app/transaction-miner');
const { start } = require('repl');

const isDevelopment = process.env.ENV === 'development';
const REDIS_URL = isDevelopment ?  'redis://127.0.0.1:6379' : 'redis://:p47964925f5f0e3a706ee984a9556d27c507a075068599b3fc20f0695994af7ed@ec2-54-147-160-19.compute-1.amazonaws.com:19409';
const DEFAULT_PORT = 3000;
const ROOT_NODE_ADDRESS = `http://localhost:${DEFAULT_PORT}`;


const app = express();
const blockchain = new Blockchain();
const transactionPool = new TransactionPool();
const wallet = new Wallet();
const pubsub = new PubSub({blockchain, transactionPool, redisUrl: REDIS_URL});
const transactionMiner = new TransactionMiner({blockchain, transactionPool, wallet, pubsub});


app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, './client/dist')));

app.get('/api/blocks', (req, res)=>{
    res.json(blockchain.chain);
});

app.get('/api/blocks/length', (req, res) => {
    res.json(blockchain.chain.length);
});

app.get('/api/blocks/:id', (req, res) =>{
    const {id} = req.params;
    const {length} = blockchain.chain;

    const blockReversed = blockchain.chain.slice().reverse();

    let startIndex = (id-1)*5;
    let endIndex = id*5; 

    startIndex = startIndex < length ? startIndex: length;
    endIndex = endIndex < length ? endIndex : length;

    res.json(blockReversed.slice(startIndex,endIndex));
})

app.post('/api/mine', (req, res)=>{
    const {data} = req.body;

    blockchain.addBlock({data});

    pubsub.broadcastChain();

    res.redirect('/api/blocks');
});

app.post('/api/transact',(req, res) => {
    const {amount, recipient} = req.body;

    let transaction = transactionPool.existingTransaction({inputAddress: wallet.publicKey});

    try{
        if(transaction){
            transaction.update({senderWallet: wallet, recipient, amount});
        }else{
            transaction = wallet.createTransaction({recipient, amount, chain: blockchain.chain});
        }
        
    }catch(error){
        //return will make sure rest of code does not run
        return res.status(400).json({type: 'error', message: error.message});
    }

    transactionPool.setTransaction(transaction);

    pubsub.broadcastTransaction(transaction);

    res.json({type: 'success', transaction});
});

app.get('/api/transaction-pool-map', (req, res)=>{
    res.json(transactionPool.transactionMap);
});

app.get('/api/mine-transactions', (req, res)=>{
    transactionMiner.mineTractions();

    res.redirect('/api/blocks');
});

app.get('/api/wallet-info', (req, res)=>{
    const address = wallet.publicKey;

    res.json({address,
    balance: Wallet.calculateBalance({chain: blockchain.chain, address})
    });
});

app.get('/api/known-addresses', (req, res)=>{
    const addressMap ={};

    for(let block of blockchain.chain){
        for(let transaction of block.data){
            const recipients = Object.keys(transaction.outputMap);

            recipients.forEach(recipient => addressMap[recipient] = recipient);
        }
    }

    res.json(Object.values(addressMap));
});

app.get('*', (req, res)=>{
    res.sendFile(path.join(__dirname, './client/dist/index.html'));
})

const syncWithRootState = () => {
    request({url: `${ROOT_NODE_ADDRESS}/api/blocks`}, (error, response, body)=>{
        if(!error && response.statusCode === 200){
            const rootChain = JSON.parse(body);

            console.log('replace chain on a sync with', rootChain);
            blockchain.replaceChain(rootChain);
        }
    });

    request({url: `${ROOT_NODE_ADDRESS}/api/transaction-pool-map`}, (error, response, body)=>{
        if(!error&& response.statusCode ===200){
            const rootTransactionPoolMap = JSON.parse(body);

            console.log('repalce transaction pool map on a suync with', rootTransactionPoolMap);
            transactionPool.setMap(rootTransactionPoolMap);
        }
    })
}

if(isDevelopment){
    const walletFoo = new Wallet();
const walletBar = new Wallet();

const generateWalletTransaction = ({wallet, recipient, amount}) =>{
    const transaction = wallet.createTransaction({
        recipient, amount, chain: blockchain.chain
    });

    transactionPool.setTransaction(transaction);
}

const walletAction = () => generateWalletTransaction({
    wallet, recipient: walletFoo.publicKey, amount: 5
});

const walletFooAction = () => generateWalletTransaction({
    wallet: walletFoo, recipient: walletBar.publicKey, amount: 9
});

const walletBarAction = () => generateWalletTransaction({
    wallet: walletBar, recipient: wallet.publicKey, amount: 15
})

for(let i=0; i<20; i++){
    if(i%3===0){
        walletAction();
        walletFooAction();
    }else if(i%3===1){
        walletAction();
        walletBarAction();
    }else{
        walletFooAction();
        walletBarAction();
    }

    transactionMiner.mineTractions();
}
}




let PEER_PORT;

if(process.env.GENERATE_PEER_PORT === 'true'){
    PEER_PORT = DEFAULT_PORT + Math.ceil(Math.random()*1000);
}

const PORT = process.env.PORT || PEER_PORT || DEFAULT_PORT;
app.listen(PORT, ()=>{
    console.log(`listen at localhost:${PORT}`);

    if(PORT !== DEFAULT_PORT){
        syncWithRootState();
    }
});