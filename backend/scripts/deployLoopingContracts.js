const hre = require("hardhat");
const { verify } = require("../utils/verify");
const { vars } = require("hardhat/config");

async function main() {

    //base mainnet
    const morphoAddress = "0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb";
    const uniswapV3RouterAddress = "0x2626664c2603336E57B271c5C0b26F421741e481";
    
    
    //MorphoBasics
    const argumentsMorphoBascis =[morphoAddress];
    const morphoBasics = await hre.ethers.deployContract("MorphoBasics", argumentsMorphoBascis);
    await morphoBasics.waitForDeployment();
    console.log(`MorphoBasics contract deployed to ${morphoBasics.target}`);

    //MorphoLeverage
    const argumentsMorphoLeverage =[morphoAddress, uniswapV3RouterAddress];  
    const morphoLeverage = await hre.ethers.deployContract("MorphoLeverage", argumentsMorphoLeverage);
    await morphoLeverage.waitForDeployment();

    console.log(`MorphoLeverage contract deployed to ${morphoLeverage.target}`);

    // if(hre.network.name !== 'localhost' && hre.network.name !== 'hardhat' && vars.get("ETHERSCAN_API_KEY")){
    //     console.log('Verifying...');
    //     await verify(contract.target, arguments)
    // }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});