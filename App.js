import React, { useEffect, useState } from 'react';
import type { Node } from 'react';
import {
  Button,
  Linking,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Text,
  useColorScheme,
} from 'react-native';
import { Colors } from 'react-native/Libraries/NewAppScreen';
import BackgroundTimer from 'react-native-background-timer';

import MetaMaskSDK from '@metamask/sdk';

import { ethers } from 'ethers';

// Create an instance of MetaMask SDK
const sdk = new MetaMaskSDK({
  openDeeplink: (link) => {
    Linking.openURL(link);
  },
  timer: BackgroundTimer,
  dappMetadata: {
    name: 'React Native Test Dapp',
    url: 'example.com',
  },
});

// Get the Ethereum provider from MetaMask SDK
const ethereum = sdk.getProvider();

// Create a Web3 provider using the Ethereum provider
const provider = new ethers.providers.Web3Provider(ethereum);

const App: () => Node = () => {
  const [response, setResponse] = useState();
  const [account, setAccount] = useState();
  const [chain, setChain] = useState();
  const [balance, setBalance] = useState();

  const isDarkMode = useColorScheme() === 'dark';

  const backgroundStyle = {
    backgroundColor: isDarkMode ? Colors.darker : Colors.lighter,
  };
  const textStyle = {
    color: isDarkMode ? Colors.lighter : Colors.darker,
    margin: 10,
    fontSize: 16,
  };

  // Function to fetch the account balance
  const getBalance = async () => {
    if (!ethereum.selectedAddress) {
      return;
    }
    const bal = await provider.getBalance(ethereum.selectedAddress);
    setBalance(ethers.utils.formatEther(bal));
  };

  useEffect(() => {
    // Listen for changes in the connected chain
    ethereum.on('chainChanged', (chain) => {
      console.log(chain);
      setChain(chain);
    });

    // Listen for changes in the connected accounts
    ethereum.on('accountsChanged', (accounts) => {
      console.log(accounts);
      setAccount(accounts?.[0]);

      // Update the balance when the connected account changes
      getBalance();
    });
  }, []);

  // Function to connect to MetaMask
  const connect = async () => {
    try {
      const result = await ethereum.request({ method: 'eth_requestAccounts' });
      console.log('RESULT', result?.[0]);
      setAccount(result?.[0]);

      // Update the balance when connected successfully
      getBalance();
    } catch (e) {
      console.log('ERROR', e);
    }
  };

  // Example request to add a custom chain to MetaMask
  const exampleRequest = async () => {
    try {
      const result = await ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: '0x89',
            chainName: 'Polygon',
            blockExplorerUrls: ['https://polygonscan.com'],
            nativeCurrency: { symbol: 'MATIC', decimals: 18 },
            rpcUrls: ['https://polygon-rpc.com/'],
          },
        ],
      });
      console.log('RESULT', result);
      setResponse(result);
    } catch (e) {
      console.log('ERROR', e);
    }
  };

  // Function to sign a message using MetaMask
  const sign = async () => {
    // Define the message parameters
    const msgParams = JSON.stringify({
      domain: {
        // Defining the chain aka Rinkeby testnet or Ethereum Main Net
        chainId: parseInt(ethereum.chainId, 16),
        // Give a user friendly name to the specific contract you are signing for.
        name: 'Ether Mail',
        // If name isn't enough add verifying contract to make sure you are establishing contracts with the proper entity
        verifyingContract: '0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC',
        version: '1', // Latest version of the message schema
      },

      // Defining the message signing data content.
      message: {
        // Define the message content
        contents: 'Hello, Bob!',
        attachedMoneyInEth: 4.2,
        from: {
          name: 'Cow',
          wallets: [
            '0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826',
            '0xDeaDbeefdEAdbeefdEadbEEFdeadbeEFdEaDbeeF',
          ],
        },
        to: [
          {
            name: 'Bob',
            wallets: [
              '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB',
              '0xB0BdaBea57B0BDABeA57b0bdABEA57b0BDabEa57',
              '0xB0B0b0b0b0b0B000000000000000000000000000',
            ],
          },
        ],
      },
      primaryType: 'Mail', // Refers to the keys of the 'types' object below
      types: {
        // TODO: Clarify if EIP712Domain refers to the domain the contract is hosted on
        EIP712Domain: [
          { name: 'name', type: 'string' },
          { name: 'version', type: 'string' },
          { name: 'chainId', type: 'uint256' },
          { name: 'verifyingContract', type: 'address' },
        ],
        // Not an EIP712Domain definition
        Group: [
          { name: 'name', type: 'string' },
          { name: 'members', type: 'Person[]' },
        ],
        // Refer to PrimaryType
        Mail: [
          { name: 'from', type: 'Person' },
          { name: 'to', type: 'Person[]' },
          { name: 'contents', type: 'string' },
        ],
        // Not an EIP712Domain definition
        Person: [
          { name: 'name', type: 'string' },
          { name: 'wallets', type: 'address[]' },
        ],
      },
    });

    const from = ethereum.selectedAddress;
    const params = [from, msgParams];
    const method = 'eth_signTypedData_v4';

    const resp = await ethereum.request({ method, params });
    setResponse(resp);
  };

  // Function to send a transaction using MetaMask
  const sendTransaction = async () => {
    const to = '0x0000000000000000000000000000000000000000';
    const transactionParameters = {
      to, // Required except during contract publications.
      from: ethereum.selectedAddress, // Must match the user's active address.
      value: '0x5AF3107A4000', // Only required to send ether to the recipient from the initiating external account.
    };

    try {
      // txHash is a hex string
      // As with any RPC call, it may throw an error
      const txHash = await ethereum.request({
        method: 'eth_sendTransaction',
        params: [transactionParameters],
      });

      setResponse(txHash);
    } catch (e) {
      console.log(e);
    }
  };

  return (
    <SafeAreaView style={backgroundStyle}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={backgroundStyle}
      >
        <Button title={account ? 'Connected' : 'Connect'} onPress={connect} />
        <Button title="Sign" onPress={sign} />
        <Button title="Send transaction" onPress={sendTransaction} />
        <Button title="Add chain" onPress={exampleRequest} />

        <Text style={textStyle}>{chain && `Connected chain: ${chain}`}</Text>
        <Text style={textStyle}>
          {' '}
          {account && `Connected account: ${account}\n\n`}
          {account && balance && `Balance: ${balance} ETH`}
        </Text>
        <Text style={textStyle}>
          {' '}
          {response && `Last request response: ${response}`}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

export default App;
