/* eslint-disable no-await-in-loop, no-use-before-define, no-lonely-if, import/no-dynamic-require, global-require */
/* eslint-disable no-console, no-inner-declarations, no-undef, import/no-unresolved, no-restricted-syntax */
const path = require("path");
const fs = require("fs");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const { ethers } = require("hardhat");
const { expect } = require("chai");

const networkIDRootChain = 0;
const networkIDChildChain = 1;

async function main() {
  // bridge address
  //let BRIDGE_ADDRESS = process.env.ROOTCHAIN_BRIDGE_ADDRESS;
  let BRIDGE_ADDRESS = process.env.BRIDGE_ADDRESS;

  // Load providers for both networks
  let rootchainProvider = new ethers.providers.JsonRpcProvider(
    process.env.ROOTCHAIN_URL
  );
  let childchainProvider = new ethers.providers.JsonRpcProvider(
    process.env.CHILDCHAIN_URL
  );

  // Get deployers for both networks
  let deployerRootchain;
  let deployerChildChain;

  if (process.env.PRIVATE_KEY_ROOTCHAIN && process.env.PRIVATE_KEY_CHILDCHAIN) {
    // Load deployer
    deployerRootchain = new ethers.Wallet(
      process.env.PRIVATE_KEY_ROOTCHAIN,
      rootchainProvider
    );
    deployerChildChain = new ethers.Wallet(
      process.env.PRIVATE_KEY_CHILDCHAIN,
      childchainProvider
    );
    console.log(`Deployer Rootchain: ${deployerRootchain.address}`);
    console.log(`Deployer ChildChain: ${deployerChildChain.address}`);
  } else {
    throw new Error("PRIVATE_KEY not found in .env file");
  }

  // Token params
  const name = "customTokenName";
  const symbol = "CTN";
  const initialAccount = deployerRootchain.address;
  const initialBalance = ethers.utils.parseEther("1000000000");

  // deploy root chain token
  const erc20RootchainFactory = await ethers.getContractFactory(
    "CustomERC20Mainnet",
    deployerRootchain
  );
  const erc20RootchainToken = await erc20RootchainFactory.deploy(
    name,
    symbol,
    initialAccount,
    initialBalance
  );
  await erc20RootchainToken.deployed();
  console.log(`erc20RootchainToken deployed at ${erc20RootchainToken.address}`);
  console.log(`Getting the balance of the user ${initialAccount}`);
  console.log(`Balance ${await erc20RootchainToken.balanceOf(initialAccount)}`);

  /*
   * We need to predict the rest of address in order to make the deployments
   * in production this could be done either using create2 patterns or with an initialize function
   */
  // Predict Childchain address
  const nonceChildChain = Number(
    await childchainProvider.getTransactionCount(deployerChildChain.address)
  );
  console.log("nonceChildChain", nonceChildChain);

  const predictERC20BridgeChildChain = ethers.utils.getContractAddress({
    from: deployerRootchain.address,
    nonce: nonceChildChain,
  });
  console.log("predictERC20BridgeChildChain", predictERC20BridgeChildChain);
  const predictErc20ChildChainToken = ethers.utils.getContractAddress({
    from: deployerRootchain.address,
    nonce: nonceChildChain + 1,
  });
  console.log("predictErc20ChildChainToken", predictErc20ChildChainToken);

  // deploy Rootchain erc20 bridge
  const ERC20BridgeRootchainFactory = await ethers.getContractFactory(
    "ERC20BridgeNativeChain",
    deployerRootchain
  );
  const ERC20BridgeRootChain = await ERC20BridgeRootchainFactory.deploy(
    BRIDGE_ADDRESS,
    predictERC20BridgeChildChain,
    networkIDChildChain,
    erc20RootchainToken.address
  );
  await ERC20BridgeRootChain.deployed();
  console.log(
    `ERC20BridgeRootChain deployed at ${ERC20BridgeRootChain.address}`
  );

  // deploy ChildChain  erc20 bridge
  const ERC20BridgeChildChainFactory = await ethers.getContractFactory(
    "ERC20BridgeNonNativeChain",
    deployerChildChain
  );
  const ERC20BridgeChildChain = await ERC20BridgeChildChainFactory.deploy(
    BRIDGE_ADDRESS,
    ERC20BridgeRootChain.address,
    networkIDRootChain,
    predictErc20ChildChainToken
  );
  await ERC20BridgeChildChain.deployed();
  console.log(
    `ERC20BridgeChildChain deployed at ${ERC20BridgeChildChain.address}`
  );

  // deploy child chain token
  const erc20ChildChainTokenFactory = await ethers.getContractFactory(
    "CustomERC20Wrapped",
    deployerChildChain
  );
  const erc20ChildChainToken = await erc20ChildChainTokenFactory.deploy(
    name,
    symbol,
    initialAccount,
    initialBalance,
    predictERC20BridgeChildChain
  );
  await erc20ChildChainToken.deployed();
  console.log(
    `erc20ChildChainToken deployed at ${erc20ChildChainToken.address}`
  );

  expect(predictERC20BridgeChildChain).to.be.equal(
    ERC20BridgeChildChain.address
  );
  expect(predictErc20ChildChainToken).to.be.equal(erc20ChildChainToken.address);

  const outputJson = {
    ERC20BridgeRootChain: ERC20BridgeRootChain.address,
    ERC20BridgeChildChain: ERC20BridgeChildChain.address,
    erc20RootchainToken: erc20RootchainToken.address,
    erc20ChildChainToken: erc20ChildChainToken.address,
    deployerAddress: deployerRootchain.address || deployerChildChain.address,
    tokenName: name,
    tokenSymbol: symbol,
    tokenInitialBalance: initialBalance.toString(),
  };
  const pathOutputJson = path.join(__dirname, "./ERC20Bridge_output.json");

  fs.writeFileSync(pathOutputJson, JSON.stringify(outputJson, null, 1));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
