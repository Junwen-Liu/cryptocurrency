class Block {
    //the advantaage of wrapping the arguments as key-value pair in {} and as object, is we don't need to remember the order of them
  constructor({timestamp, lastHash, hash, data}) {
    this.timestamp = timestamp;
    this.lastHash = lastHash;
    this.hash = hash;
    this.data = data;
  }
}

const block1 = new Block({
    timestamp: '01/01/01', 
    lastHash:'foo-lasthash', 
    hash:'foo-hash', 
    data:'foo-data'});

console.log(block1);
