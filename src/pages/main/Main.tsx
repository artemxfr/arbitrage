import styles from './Main.module.css';

import {Text, Heading, Button, Flex, Box, Input} from '@chakra-ui/react';

import {
    Table,
    Thead,
    Tbody,
    Tfoot,
    Tr,
    Th,
    Td,
    TableCaption,
    TableContainer,
  } from '@chakra-ui/react'

  import {
    NumberInput,
    NumberInputField,
    NumberInputStepper,
    NumberIncrementStepper,
    NumberDecrementStepper,
  } from '@chakra-ui/react'

import { CloseIcon } from '@chakra-ui/icons'
import { useEffect, useState } from 'react';

import { Web3ReactProvider, useWeb3React } from '@web3-react/core'
import Web3 from 'web3';
import RouterABI from '../../assets/router.json';
import tokenABI from '../../assets/IERC20.json';
import { toNumber } from 'ethers';

const Router_List: {[key: string]: string} = {
    'Pancake' : '0x10ED43C718714eb63d5aA57B78B54704E256024E',
    'MDEX' : '0x7DAe51BD3E3376B8c7c4900E9107f12Be3AF1bA8',
    'SushiSwap': '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506'
}


export function Main() {

    const web3 = new Web3(window.ethereum);
    
    const [userAccount, setUserAccount] = useState<string | undefined>();
    const [tokens, setTokens] = useState<string[]>([]);
    const [tickers, setTickers] = useState<string[]>([]);
    const [routers, setRouters] = useState<string[]>([]);
    const [currentAddressEntry, setCurrentAddressEntry] = useState<string>();
    const [errorInEntry, setErrorInEntry] = useState<boolean>(false);
    const [amount, setAmount] = useState<string>("0");
    const [userBalance, setUserBalance] = useState<string>("0");
    const [errorMessage, setErrorMessage] = useState<string>("");
    const [estimatedOutput, setEstimatedOutput] = useState<number>(0);
    const [minimumReceived, setMinimumReceived] = useState<string>("");

    function addToken() {
        if (currentAddressEntry !== undefined) {
            if (Web3.utils.isAddress(currentAddressEntry)) {
                if (currentAddressEntry === tokens[tokens.length - 1]) {
                    setErrorInEntry(true);
                    setErrorMessage("Address cannot be the same as previous token");
                    return;
                };
                setErrorInEntry(false);
                setErrorMessage("");
                setCurrentAddressEntry("");
                setTokens((tokens) => [
                    ...tokens,
                    currentAddressEntry
                ])
                setRouters((routers) => [
                    ...routers,
                    'Pancake'
                ])
                if (tokens.length === 1 || userBalance === "0") {
                    getUserBalance();
                }
                getTicker(currentAddressEntry);
                if (tokens.length > 1) {
                    getEstimatedOutput();
                }
            } else {
                setErrorMessage("Not valid token address");
                setErrorInEntry(true);
            }
        }
    }

    async function getEstimatedOutput(){
        try {
            if (tokens.length < 2) {
                setEstimatedOutput(0);
                return
            };

            // TODO: Rework logic to take new contract for every input
            var estOutput = [0, web3.utils.toWei(''+amount, 'ether')];
            for (let i = 0; i < tokens.length - 1; i ++) {
                const router_contract = new web3.eth.Contract(
                    RouterABI,
                    Router_List[routers[i]]
                ); 
                estOutput = await router_contract.methods.getAmountsOut(estOutput[estOutput.length-1], [tokens[i], tokens[i+1]]).call();
            }
            setEstimatedOutput(estOutput[estOutput.length - 1]);
        } catch (e) {
            console.log(e);
            setEstimatedOutput(0);
        }

    }

    function deleteFromList(key : number) {
        if (key > -1) {
            setTokens((tokens) => [
                ...tokens.slice(0, key),
                ...tokens.slice(key + 1)
            ])
            setTickers((tickers) => [
                ...tickers.slice(0, key),
                ...tickers.slice(key + 1)
            ])
            setRouters((routers) => [
                ...routers.slice(0, key),
                ...routers.slice(key+1)
            ])
        }
        if (tokens.length === 0) {
            setUserBalance('0');
        }
        if (tokens.length > 1 ) {
            getEstimatedOutput();
        }
    }

    async function connect() {
        if (window.ethereum) {
            const accounts = await window.ethereum.request({
                method: 'eth_requestAccounts',
            })
            setUserAccount(accounts[0]);
        } else {
            return;
        }
    }

    async function getUserBalance() {
        if (tokens.length > 0 && userAccount !== undefined) {
            try {
                const first_token = new web3.eth.Contract(
                    tokenABI,
                    tokens[0]
                ); 
                const balance = await first_token.methods.balanceOf(userAccount).call();
                setUserBalance(balance);
            } catch (e) {
                console.log(e);
            }
        }
    }

    async function sendTx() {
        try {
            setErrorMessage("");
            if (tokens.length < 2) {
                setErrorMessage("Not Enough tokens, at least 2");
                return;
            }
            const first_token = new web3.eth.Contract(
                tokenABI,
                tokens[0]
            ); 
            const allowance = await first_token.methods.allowance(userAccount, '0x10ED43C718714eb63d5aA57B78B54704E256024E').call();
            if (allowance / 10**18 < parseInt(amount)) {
                alert("Not enough allowance!");
                return;
            };
            const deadline = Math.round(Date.now()) + 100;
            const router_contract = new web3.eth.Contract(
                RouterABI,
                '0x10ED43C718714eb63d5aA57B78B54704E256024E'
            ); 
            const tx = await router_contract.methods.swapExactTokensForTokens(
                web3.utils.toWei(''+amount, 'ether'),
                web3.utils.toWei(''+minimumReceived, 'ether'),
                tokens,
                userAccount,
                deadline
            ).send({'from' : userAccount});
            window.alert('TX hash is '+tx.hash);
        } catch (e) {
            alert(e.message);
        }        
    }

    async function handleValueChange(newAmount : string) {
        setAmount(newAmount);
        getEstimatedOutput();
    }

    function addToTokensFromList(tokenAddress : string) {
        if (tokenAddress !== undefined) {
            if (Web3.utils.isAddress(tokenAddress)) {
                if (tokenAddress === tokens[tokens.length - 1]) {
                    setErrorMessage("Address cannot be the same as previous token");
                    return;
                };
                setErrorMessage("");
                setTokens((tokens) => [
                    ...tokens,
                    tokenAddress
                ])
                setRouters((routers) => [
                    ...routers,
                    'Pancake'
                ])
                if (tokens.length === 1 || userBalance === '0') {
                    getUserBalance();
                }
                getTicker(tokenAddress);
            }
        }
    }

    async function getTicker(address : string) {
        const aToken = new web3.eth.Contract(
            tokenABI,
            address
        ); 
        const ticker = await aToken.methods.symbol().call();
        setTickers((tickers) => [
            ...tickers,
            ticker
        ])
    }

    function deleteAllTokens() {
        setTokens(new Array<string>());
        setTickers(new Array<string>());
        setRouters(new Array<string>());
    }

    function handleMaxAmount() {
        setAmount(() => web3.utils.fromWei(''+userBalance, 'ether'));
    }

    function changeRouterForIndex(index : number, router : string) {
        setRouters((routers) => [
            ...routers.slice(0, index),
            router,
            ...routers.slice(index + 1)
        ])
    }

    return (
        <>
        <Flex className={styles.body} style={{flexDirection: 'column'}}>
            <Box className={styles.header}>
                <Heading>PancakeSwap Multi-Token Swap</Heading>
                <Text>Please select or add tokens that you wish to swap and click the button.</Text>
                <Flex style={{flexDirection: 'column', justifyContent: 'center', alignItems: 'center', marginTop: '5%', marginBottom: '5%'}}>
                {userAccount !== undefined ? (
                        <>
                            <Text marginBottom={'1%'}>Your address: <a href={'https://bscscan.com/address/'+userAccount} target={'_blank'}>{userAccount.slice(0,6)}...{userAccount.slice(38,42)}</a></Text>
                            <Flex>
                                <Box>
                                    <Text style={{textAlign: 'left'}}>Value:</Text>
                                    <NumberInput>
                                        <NumberInputField
                                            type={'text'}
                                            value={amount}
                                            onChange={(e) => handleValueChange(e.target.value)}
                                            placeholder={'Input Value'}
                                        />
                                    </NumberInput>
                                </Box>
                                <Box style={{marginLeft: '5%'}}>
                                    <Text style={{textAlign: 'left'}}>Minumum Received:</Text>
                                    <NumberInput>
                                        <NumberInputField
                                            value={minimumReceived}
                                            onChange={(e) => setMinimumReceived(e.target.value)}
                                            placeholder={'Input Value'}
                                        />
                                    </NumberInput>
                                </Box>
                                
                            </Flex>
                            {userBalance !== undefined ? (
                                <Text textAlign={'left'} marginTop={'1%'}>
                                    Your balance:
                                    <a href='#' onClick={handleMaxAmount}>
                                        {Math.round(parseInt(web3.utils.fromWei(''+userBalance, 'ether')) * 100) / 100}
                                    </a>
                                </Text>) : (null)} 
                            <Text textAlign={'left'}>Estimated Output:<b>{' '}
                                {
                                estimatedOutput > 0 ? (web3.utils.fromWei(''+estimatedOutput, 'ether')+' '+tickers[tickers.length-1]) : (0)
                                }
                                </b>
                            </Text>
                            <Button 
                                colorScheme={'red'} 
                                onClick={sendTx} 
                                marginTop={'1%'}
                            >
                                Send!
                            </Button>
                        </>
                    ) : (<Button colorScheme={'yellow'} onClick={connect}>Connect</Button>)}
                </Flex>
            </Box>
            <Flex style={{textAlign: 'center', flexDirection: 'column'}} borderTop={'1px solid white'}>
                <Text marginTop={'5%'} marginBottom={'1%'}>Popular Tokens</Text>
                <Flex style={{justifyContent: "space-around"}} marginBottom={'5%'}>
                    <Button onClick={() => addToTokensFromList("0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56")} colorScheme={'yellow'}>BUSD</Button>
                    <Button onClick={() => addToTokensFromList("0x55d398326f99059fF775485246999027B3197955")} colorScheme={'yellow'}>USDT</Button>
                    <Button onClick={() => addToTokensFromList("0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c")} colorScheme={'yellow'}>BNB</Button>
                    <Button onClick={() => addToTokensFromList("0x2170ed0880ac9a755fd29b2688956bd959f933f8")} colorScheme={'yellow'}>ETH</Button>
                    <Button onClick={() => addToTokensFromList("0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82")} colorScheme={'yellow'}>CAKE</Button>
                </Flex>
                    <Flex style={{marginBottom: "5%"}}>
                        <TableContainer style={{width: "100%"}}>
                            <Table variant='unstyled' border={'0px'}>
                                <Thead>
                                <Tr>
                                    <Th>Token Address</Th>
                                    <Th textAlign={'center'}><a href='#' onClick={() => deleteAllTokens()}>Delete All</a></Th>
                                    <Th textAlign={'center'}>Router</Th>
                                </Tr>
                                </Thead>
                                <Tbody>
                                    {tokens?.map((token, index) => 
                                    <>
                                        <Tr key={index}>
                                            <Td>
                                                {tickers[index]} ({token})
                                            </Td>
                                            <Td textAlign={'center'}><a href='#' onClick={() => deleteFromList(index)}><CloseIcon /></a></Td>
                                            <Td></Td>
                                        </Tr>
                                        {index < tickers.length - 1 ? (
                                            <Tr>
                                                <Td></Td>
                                                <Td></Td>
                                                <Td> 
                                                    <Button 
                                                        colorScheme={'yellow'}
                                                        variant={routers[index] === 'Pancake' ? 'solid' : 'ghost'}
                                                        onClick={() => changeRouterForIndex(index, 'Pancake')}
                                                    >
                                                        PancakeSwap
                                                    </Button>
                                                    <Button 
                                                        colorScheme={'yellow'} 
                                                        variant={routers[index] === 'MDEX' ? 'solid' : 'ghost'}
                                                        onClick={() => changeRouterForIndex(index, 'MDEX')}
                                                    >
                                                        MDEX
                                                    </Button>
                                                    <Button 
                                                        colorScheme={'yellow'} 
                                                        variant={routers[index] === 'SushiSwap' ? 'solid' : 'ghost'}
                                                        onClick={() => changeRouterForIndex(index, 'SushiSwap')}
                                                    >
                                                        SushiSwap
                                                    </Button>
                                                </Td>
                                            </Tr>
                                        ) : (
                                            null
                                        )}
                                        
                                    </>
                                    )}
                                </Tbody>    
                            </Table>
                        </TableContainer>                    
                    </Flex>
                    <Flex>
                        <Input 
                            value={currentAddressEntry} 
                            onChange={(e) => setCurrentAddressEntry(e.target.value)} 
                            className={errorInEntry ? (styles.inputError) : (undefined)}
                            placeholder='Enter Token Address'/>
                        <Button onClick={addToken} colorScheme={'green'}>Add</Button>
                        
                    </Flex>
                    {errorMessage !== "" ? (<Text textAlign={'left'} color={'red'}>{errorMessage}</Text>) : (null)}
                  
            </Flex>
        </Flex>
        </>
    )
}