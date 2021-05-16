import React from "react";

// We'll use web3 to interact with the Ethereum network and our contract
import Web3 from "web3";
// We import the contract's artifacts and address here, as we are going to be

import LotteryArtifact from "../contract/Lottery.json";
import contractAddress from "../contract/contract-address.json";

// All the logic of this dapp is contained in the Dapp component.
// These other components are just presentational ones: they don't have any
// logic. They just render HTML.
import { NoWalletDetected } from "./NoWalletDetected";
import { ConnectWallet } from "./ConnectWallet";
import { Loading } from "./Loading";
import { Transfer } from "./Transfer";
import { TransactionErrorMessage } from "./TransactionErrorMessage";
import { BetResultMessage } from "./BetResultMessage";
import { WaitingForTransactionMessage } from "./WaitingForTransactionMessage";
import { NoTokensMessage } from "./NoTokensMessage";
import BigNumber from "bignumber.js";


// This is the Hardhat Network id, you might change it in the hardhat.config.js
// Here's a list of network ids https://docs.metamask.io/guide/ethereum-provider.html#properties
// to use when deploying to other networks.
const NETWORK_ID = '1337';

// This is an error code that indicates that the user canceled a transaction
const ERROR_CODE_TX_REJECTED_BY_USER = 4001;

const BET_AMOUNT = 1*10^18;


export class App extends React.Component {
  constructor(props) {
    super(props);

    // We store multiple things in Dapp's state.
    // You don't need to follow this pattern, but it's an useful example.
    this.initialState = {
      ethBalance: undefined,
      ethSymbol: "ETH",
      jackpot: undefined,
      // The info of the token (i.e. It's Name and symbol)
      tokenData: undefined,
      // The user's address and balance
      selectedAddress: undefined,
      balance: undefined,
      // The ID about transactions being sent, and any possible error with them
      txBeingSent: undefined,
      transactionError: undefined,
      networkError: undefined,
      betResult: undefined,
    };

    this.state = this.initialState;
  }

  render() {
    // Ethereum wallets inject the window.ethereum object. If it hasn't been
    // injected, we instruct the user to install MetaMask.
    if (window.ethereum === undefined) {
      return <NoWalletDetected />;
    }

    // The next thing we need to do, is to ask the user to connect their wallet.
    // When the wallet gets connected, we are going to save the users's address
    // in the component's state. So, if it hasn't been saved yet, we have
    // to show the ConnectWallet component.
    //
    // Note that we pass it a callback that is going to be called when the user
    // clicks a button. This callback just calls the _connectWallet method.
    if (!this.state.selectedAddress) {
      return (
        <ConnectWallet
          connectWallet={() => this._connectWallet()}
          networkError={this.state.networkError}
          dismiss={() => this._dismissNetworkError()}
        />
      );
    }

    // If the token data or the user's balance hasn't loaded yet, we show
    // a loading component.
    if (!this.state.ethSymbol || !this.state.ethBalance) {
      return <Loading />;
    }

    // If everything is loaded, we render the application.
    return (
      <div className="container p-4" style={{backgroundColor:"lightgrey",marginTop:"100px"}}>
        <div className="row">
          <div className="col-12">
            <h1>
              Lottery in Ethereum ({this.state.ethSymbol})
            </h1>
            <p>
              Welcome <b>{this.state.selectedAddress}</b>, <br/>you have{" "}
              <b>
                {this._provider.utils.fromWei(this.state.ethBalance)} {this.state.ethSymbol}
              </b>
              .
            </p>
          </div>
        </div>

        <hr />

        <div className="row">
          <div className="col-12">
            {/*
              Sending a transaction isn't an immidiate action. You have to wait
              for it to be mined.
              If we are waiting for one, we show a message here.
            */}
            {this.state.txBeingSent && (
              <WaitingForTransactionMessage txHash={this.state.txBeingSent} />
            )}

            {/*
              Sending a transaction can fail in multiple ways.
              If that happened, we show a message here.
            */}
            {this.state.transactionError && (
              <TransactionErrorMessage
                message={this._getRpcErrorMessage(this.state.transactionError)}
                dismiss={() => this._dismissTransactionError()}
              />
            )}

            {this.state.betResult && (
              <BetResultMessage
                message={this.state.betResult}
                dismiss={() => this._dismissBetResult()}
              />
            )}
          </div>
        </div>

        <div className="row">
          <div className="col-12">
            {new BigNumber(this.state.ethBalance).lt(BET_AMOUNT) && (
                <NoTokensMessage selectedAddress={this.state.selectedAddress} />
            )}

            {new BigNumber(this.state.ethBalance).gt(BET_AMOUNT) && (
                <Transfer
                    transferTokens={(num) =>
                        this._placeBet(num)
                    }
                    tokenSymbol={this.state.ethSymbol}
                />
            )}
          </div>
        </div>
      </div>
    );
  }

  componentWillUnmount() {
    // We poll the user's balance, so we have to stop doing that when Dapp
    // gets unmounted
    this._stopPollingData();
  }

  async _connectWallet() {
    // This method is run when the user clicks the Connect. It connects the
    // dapp to the user's wallet, and initializes it.

    // To connect to the user's wallet, we have to run this method.
    // It returns a promise that will resolve to the user's address.
    const [selectedAddress] = await window.ethereum.enable();

    // Once we have the address, we can initialize the application.

    // First we check the network
    if (!this._checkNetwork()) {
      return;
    }

    this._initialize(selectedAddress);

    // We reinitialize it whenever the user changes their account.
    window.ethereum.on("accountsChanged", ([newAddress]) => {
      this._stopPollingData();
      // `accountsChanged` event can be triggered with an undefined newAddress.
      // This happens when the user removes the Dapp from the "Connected
      // list of sites allowed access to your addresses" (Metamask > Settings > Connections)
      // To avoid errors, we reset the dapp state
      if (newAddress === undefined) {
        return this._resetState();
      }

      this._initialize(newAddress);
    });

    // We reset the dapp state if the network is changed
    window.ethereum.on("networkChanged", ([networkId]) => {
      this._stopPollingData();
      this._resetState();
    });
  }

  _initialize(userAddress) {
    // This method initializes the dapp

    // We first store the user's address in the component's state
    this.setState({
      selectedAddress: userAddress,
    });


    // Fetching the token data and the user's balance are specific to this
    // sample project, but you can reuse the same initialization pattern.
    this._intializeEthers();
    this._getTokenData();
    this._startPollingData();
  }

  async _intializeEthers() {

    let web3 = window.web3

    if (typeof web3 !== 'undefined') {
      // Injected Web3 detected. Use Mist/MetaMask's provider.
      web3 = new Web3(web3.currentProvider)
    } else {
      // No web3 instance injected, using Local web3.
      const provider = new Web3.providers.HttpProvider(window.ethereum)
      web3 = new Web3(provider)
    }
    this._provider= web3

    this._lottery = new this._provider.eth.Contract(
        LotteryArtifact.abi,
      contractAddress.Lottery,
        {from:this._provider.defaultAccount}
    );

  }


  // The next to methods are needed to start and stop polling data. While
  // the data being polled here is specific to this example, you can use this
  // pattern to read any data from your contracts.
  //
  // Note that if you don't need it to update in near real time, you probably
  // don't need to poll it. If that's the case, you can just fetch it when you
  // initialize the app, as we do with the token data.
  _startPollingData() {
    this._pollDataInterval = setInterval(() => this._updateEthBalance(), 5000);
    // We run it once immediately so we don't have to wait for it
    this._updateEthBalance();
  }

  _stopPollingData() {
    clearInterval(this._pollDataInterval);
    this._pollDataInterval = undefined;
  }

  // The next two methods just read from the contract and store the results
  // in the component state.
  async _getTokenData() {

    const that =this
   await that._lottery.methods.total().call().then(function (jackpot) {
      that.setState({ jackpot });
    });

  }

  async _updateEthBalance() {
    var ethBalance =await this._provider.eth.getBalance(this.state.selectedAddress);
    console.log("Eth balance "+ethBalance);
    ethBalance=ethBalance.toString()
    this.setState({ethBalance });
  }

  // This method sends an ethereum transaction to Lottery contract.
  async _placeBet(num) {

    try {

      this._dismissTransactionError();
      this._dismissBetResult();

      var that =this
     const nonce=await that._provider.eth.getTransactionCount(this.state.selectedAddress) + 1
      await that._lottery.methods.bet(num).send({from:this.state.selectedAddress,value:this._provider.utils.toWei("1"),nonce:nonce+100
      }).then(function(receipt){
        console.log(receipt)
        // The receipt, contains a status flag, which is 0 to indicate an error.
        if (receipt.status === 0) {
          // We can't know the exact error that make the transaction fail once it
          // was mined, so we throw this generic one.
          throw new Error("Transaction failed");
        }
        var theEvent = receipt.events
        console.log(JSON.stringify(theEvent))
        theEvent=theEvent.Lost||theEvent.Win
        if(theEvent.event === 'Win'){
          let lotNumber = theEvent.returnValues.lotNumber;
          let level = theEvent.returnValues.level;
          let amount = theEvent.returnValues.amount;
          this.setState({ betResult: "Bingo！！！You win "+level+" prize, total amount is "+amount+". Lot number is: "+lotNumber });
        }else if(theEvent.event === 'Lost'){
          let lotNumber = theEvent.returnValues.lotNumber;
          that.setState({ betResult: "Sorry！！！You lost. Lot number is: "+lotNumber});
        }
      });



    } catch (error) {
      // We check the error code to see if this error was produced because the
      // user rejected a tx. If that's the case, we do nothing.
      if (error.code === ERROR_CODE_TX_REJECTED_BY_USER) {
        return;
      }

      // Other errors are logged and stored in the Dapp's state. This is used to
      // show them to the user, and for debugging.
      console.error(error);
      this.setState({ transactionError: error });
    } finally {
      // If we leave the try/catch, we aren't sending a tx anymore, so we clear
      // this part of the state.
      this.setState({ txBeingSent: undefined });
    }
  }

  // This method just clears part of the state.
  _dismissTransactionError() {
    this.setState({ transactionError: undefined });
  }

  // This method just clears part of the state.
  _dismissBetResult() {
    this.setState({ betResult: undefined });
  }

  // This method just clears part of the state.
  _dismissNetworkError() {
    this.setState({ networkError: undefined });
  }


  // This is an utility method that turns an RPC error into a human readable
  // message.
  _getRpcErrorMessage(error) {
    if (error.data) {
      return error.data.message;
    }

    return error.message;
  }

  // This method resets the state
  _resetState() {
    this.setState(this.initialState);
  }

  // This method checks if Metamask selected network is Localhost:8545
  _checkNetwork() {
    if (window.ethereum.networkVersion === NETWORK_ID) {
      return true;
    }

    console.log("Network Id: "+window.ethereum.networkVersion);

    this.setState({
      networkError: 'Please connect Metamask to Localhost:8545'
    });

    return false;
  }
}

