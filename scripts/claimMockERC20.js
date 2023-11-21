/* eslint-disable no-await-in-loop */
/* eslint-disable no-console, no-inner-declarations, no-undef, import/no-unresolved */

const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });
const { ethers } = require("hardhat");
const AXIOS = require("axios");

const mekrleProofString = "/merkle-proof";
const getClaimsFromAcc = "/bridges/";

const pathdeployeERC20Bridge = path.join(
  __dirname,
  "../deployment/ERC20Bridge_output.json"
);
const deploymentERC20Bridge = require(pathdeployeERC20Bridge);

async function main() {
  const CHILD_CHAIN_URL = process.env.CHILDCHAIN_URL;
  const CHILD_CHAIN_BRIDGE_URL = process.env.CHILD_CHAIN_BRIDGE_API_URL;
  const BRIDGE_ADDRESS = process.env.BRIDGE_ADDRESS;

  // Load providers for chaild chain
  let chaildChainProvider = new ethers.providers.JsonRpcProvider(
    CHILD_CHAIN_URL
  );

  // Get deployers for chaild chain
  let deployerChaildChain;

  if (process.env.PRIVATE_KEY_CHILDCHAIN) {
    // Load deployer
    deployerChaildChain = new ethers.Wallet(
      process.env.PRIVATE_KEY_CHILDCHAIN,
      chaildChainProvider
    );
    console.log(`Deployer ChaildChain: ${deployerChaildChain.address}`);
  } else {
    throw new Error("PRIVATE_KEY not found in .env file");
  }

  let chaildChainERC20BridgeContractAddress =
    deploymentERC20Bridge.ERC20BridgeChildChain;

  const axios = AXIOS.default.create({
    baseURL: CHILD_CHAIN_BRIDGE_URL,
  });

  const bridgeChaildChainFactory = await ethers.getContractFactory(
    "PolygonZkEVMBridge",
    deployerChaildChain
  );
  const bridgeChaildChain = bridgeChaildChainFactory.attach(BRIDGE_ADDRESS);

  const depositAxions = await axios.get(
    getClaimsFromAcc + chaildChainERC20BridgeContractAddress,
    { params: { limit: 100, offset: 0 } }
  );
  console.log("depositAxions: ", depositAxions.request.path);
  console.log("depositAxions: ", depositAxions.data);
  const depositsArray = depositAxions.data.deposits;

  if (!depositsArray || depositsArray.length === 0) {
    console.log("Not deposits yet!");
    return;
  }
  console.log("depositsArray: ", depositsArray.data);
  console.log("We have deposits: ", depositsArray.length);
  for (let i = 0; i < depositsArray.length; i++) {
    const currentDeposit = depositsArray[i];
    if (currentDeposit.ready_for_claim) {
      if (currentDeposit.claim_tx_hash != "") {
        console.log("already claimed: ", currentDeposit.claim_tx_hash);
        continue;
      }

      const proofAxios = await axios.get(mekrleProofString, {
        params: {
          deposit_cnt: currentDeposit.deposit_cnt,
          net_id: currentDeposit.orig_net,
        },
      });

      const { proof } = proofAxios.data;
      const claimTx = await bridgeChaildChain.claimMessage(
        proof.merkle_proof,
        currentDeposit.deposit_cnt,
        proof.main_exit_root,
        proof.rollup_exit_root,
        currentDeposit.orig_net,
        currentDeposit.orig_addr,
        currentDeposit.dest_net,
        currentDeposit.dest_addr,
        currentDeposit.amount,
        currentDeposit.metadata
      );
      console.log("claim message succesfully send: ", claimTx.hash);
      await claimTx.wait();
      console.log("claim message succesfully mined");
    } else {
      console.log("Not ready yet!");
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
