# CDK ERC20 bridge example

This folder provides an example on how to **bridge ERC20** using the message layer that `polygonZKEVMBridge` implements

## Requirements

- node version: >= 14.x
- npm version: >= 7.x

## Deployment NFT ERC20

### Deployment

In project root execute:

```
npm i
cp .env.example .env
```

Fill `.env` with your

```
PRIVATE_KEY_ROOTCHAIN="Your-RootChain-private key"
PRIVATE_KEY_CHILDCHAIN="Your CDK private key"
ROOTCHAIN_URL="Root chain JSON rpc url"
CHILDCHAIN_URL="Child chain JSON rpc url"
BRIDGE_ADDRESS="CDK Bridge address"
CHILD_CHAIN_BRIDGE_API_URL="CDK Bridge API url"
```

To deploy use:`deploy:erc20Bridge`

As example for `goerli`(as root chain)/`polygonZKEVMTestnet/CDK`(as child chain) testnets:
This script will deploy on both networks the same contract using the deterministic deployment:

```
npm run deploy:erc20Bridge
```

Once the deployment is finished, we will find the results on `ERC20Bridge_output.json`

## Using the erc20 bridge

In order to use the bridge, some scripts are provided:

```
npm run bridge:MockERC20
```

- Now we have to wait until the message is forwarded to L2, there is a final script that will check it if the claim is ready. If it is ready, it will actually claim the erc20 in the other layer:

```
npm run claim:MockERC20:
```
