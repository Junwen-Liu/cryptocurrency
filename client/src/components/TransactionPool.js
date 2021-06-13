import React, {Component} from 'react';
import {Button} from 'react-bootstrap';
import {Link, withRouter} from 'react-router-dom';
import Transaction from './Transaction';

const POLL_INTERVAL_MS = 1000;

class TransactionPool extends Component {
    state = {transactionPoolMap: {}}

    fetchTransactionPoolMap = () =>{
        fetch(`${document.location.origin}/api/transaction-pool-map`)
        .then(response=>response.json())
        .then(json=>this.setState({transactionPoolMap: json}));
    }

    fetchMinetransactions = () => {
        fetch(`${document.location.origin}/api/mine-transactions`)
        .then(response=>{
            if(response.status === 200){
                alert('success');
                this.props.history.push('/blocks');
            }else{
                alert('The mine-transaction block request did not coplete.');
            }
        });
    }

    componentDidMount(){
        this.fetchTransactionPoolMap();

        this.fetchPoolMapInterval = setInterval(() => {
            this.fetchTransactionPoolMap();
        }, (POLL_INTERVAL_MS));
    }

    componentWillUnmount(){
        clearInterval(this.fetchPoolMapInterval);
    }

    render(){
        return(
            <div className='TransactionPool'>
                <div><Link to='/'>Home</Link></div>
                <h3>Transaction Pool</h3>
                {
                    Object.values(this.state.transactionPoolMap).map(transaction=>{
                        return(
                            <div key={transaction.id}>
                                <hr/>
                                <Transaction transaction={transaction}/>
                            </div>
                        )
                    })
                }
                <br/>
                <Button variant="danger" onClick={this.fetchMinetransactions}>Mine the transaction</Button>
            </div>
        )
    }
}


export default withRouter(TransactionPool);