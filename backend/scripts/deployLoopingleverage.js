const hre = require("hardhat");
const { verify } = require("../utils/verify");
const { vars } = require("hardhat/config");

async function main() {

    //base mainnet
    const morphoAddress = "0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb";
    const swapperAddress = "0x2626664c2603336E57B271c5C0b26F421741e481";
    const arguments =[morphoAddress, swapperAddress];  
    const contract = await hre.ethers.deployContract("LoopingLeverage", arguments);
    await contract.waitForDeployment();

    console.log(`contract deployed to ${contract.target}`);

    if(hre.network.name !== 'localhost' && hre.network.name !== 'hardhat' && vars.get("ETHERSCAN_API_KEY")){
        console.log('Verifying...');
        await verify(contract.target, arguments)
    }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});