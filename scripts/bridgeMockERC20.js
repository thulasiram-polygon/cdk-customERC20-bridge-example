/* eslint-disable no-await-in-loop, no-use-before-define, no-lonely-if, import/no-dynamic-require, global-require */
/* eslint-disable no-console, no-inner-declarations, no-undef, import/no-unresolved, no-restricted-syntax */
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const { ethers } = require("hardhat");

const pathdeployeERC20Bridge = path.join(
  __dirname,
  "../deployment/ERC20Bridge_output.json"
);
const deploymentERC20Bridge = require(pathdeployeERC20Bridge);

async function main() {
  // Load deployer

  // Load providers for root chain
  let rootchainProvider = new ethers.providers.JsonRpcProvider(
    process.env.ROOTCHAIN_URL
  );

  // Get deployers for root chain
  let deployerRootchain;

  if (process.env.PRIVATE_KEY_ROOTCHAIN) {
    // Load deployer
    deployerRootchain = new ethers.Wallet(
      process.env.PRIVATE_KEY_ROOTCHAIN,
      rootchainProvider
    );
    console.log(`Deployer Rootchain: ${deployerRootchain.address}`);
  } else {
    throw new Error("PRIVATE_KEY not found in .env file");
  }

  const ERC20BridgeContractAddress = deploymentERC20Bridge.ERC20BridgeRootChain;
  const erc20TokenAddress = deploymentERC20Bridge.erc20RootchainToken;
  console.log("ERC20BridgeContractAddress: ", ERC20BridgeContractAddress);
  console.log("erc20TokenAddress: ", erc20TokenAddress);

  const erc20BridgeFactory = await ethers.getContractFactory(
    "ERC20BridgeNativeChain",
    deployerRootchain
  );
  const erc20BridgeContract = erc20BridgeFactory.attach(
    ERC20BridgeContractAddress
  );

  // Approve tokens
  const tokenFactory = await ethers.getContractFactory(
    "CustomERC20Mainnet",
    deployerRootchain
  );
  const tokenContract = tokenFactory.attach(erc20TokenAddress);

  const tokenAmount = ethers.utils.parseEther("1");
  const destinationUserAddress = deployerRootchain.address;
  console.log("destinationUserAddress: ", destinationUserAddress);

  // check the balance of the user tokens

  const name = await tokenContract.name();
  console.log("name: ", `Name ${name}`);
  console.log(
    "user balance: ",
    (await tokenContract.balanceOf(deployerRootchain.address)).toString()
  );
  await tokenContract.approve(ERC20BridgeContractAddress, tokenAmount);

  console.log("approved tokens");

  const tx = await erc20BridgeContract.bridgeToken(
    destinationUserAddress,
    tokenAmount,
    true
  );

  console.log("Tx Hash", (await tx.wait()).transactionHash);

  console.log("Bridge done succesfully");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
