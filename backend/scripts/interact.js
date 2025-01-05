const hre = require("hardhat");
const { vars } = require("hardhat/config");
const wethAbi = require("../abi/weth.json");
const morphoAbi = require("../abi/morpho.json");

async function main() {

    //constants
    const marketId = "0x8793cf302b8ffd655ab97bd1c695dbd967807e8367a65cb2f4edaf1380ba1bda"; // wethUsdcMarketId
    const collateralAddress = "0x4200000000000000000000000000000000000006"; //weth address
    const loanAddress = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";    // usdc address
    const morphoBasicsAddress = "0x447786d977Ea11Ad0600E193b2d07A06EfB53e5F"; //morphoBasics address
    const morphoAddress = "0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb"; //morpho address
    const morphoLeverageAddress = "0x6DcBc91229d812910b54dF91b5c2b592572CD6B0"; //morphoLeverage address
    const marketParams = {
      loanToken: loanAddress,
      collateralToken: collateralAddress,
      oracle: "0xFEa2D58cEfCb9fcb597723c6bAE66fFE4193aFE4",
      irm: "0x46415998764C29aB2a25CbeA6254146D50D22687",
      lltv: "860000000000000000"
  };
  morphoContract = await ethers.getContractAt(morphoAbi, morphoAddress);

    //deposit weth for signer 1
    [owner, addr1, addr2] = await ethers.getSigners();
    console.log("address of signer 1:", addr1.address);
    collateralContract = await ethers.getContractAt(wethAbi, collateralAddress);
    amountToDeposit = ethers.parseEther("10");
    const tx = await collateralContract.connect(addr1).deposit({value: amountToDeposit});
    await tx.wait();

    // const tx1 = await collateralContract.connect(addr1).approve(morphoAddress, amountToDeposit);
    // await tx1.wait();

    // const tx2 = await morphoContract.connect(addr1).supplyCollateral(marketParams, amountToDeposit, addr1.address, "0x");
    // await tx2.wait();

    // //borrow 500 usdc
    // let amountToBorrow = ethers.parseUnits("500", 6);

    // const tx3 = await morphoContract.connect(addr1).borrow(marketParams, amountToBorrow, 0, addr1.address, addr1.address);
    // await tx3.wait();

    //authorize looping
    // const tx4 = await morphoContract.connect(addr1).setAuthorization(morphoLeverageAddress, true);
    // await tx4.wait();





    // //check weth balance of signer 1
    // const wethBalance = await collateralContract.balanceOf(addr1.address);
    // console.log("WETH balance of signer 1:", ethers.formatEther(wethBalance));

    // //check collateral of signer 1
 
    morphoBasicsContract = await ethers.getContractAt("MorphoBasics", morphoBasicsAddress);
    collateral = await morphoBasicsContract.connect(addr1).collateral(marketId, addr1.address);
    console.log("Collateral of signer 1 on Morpho:", ethers.formatEther(collateral));

    // // checks
    // morphoContract = await ethers.getContractAt(morphoAbi, morphoAddress);
    // market = await morphoContract.connect(addr1).market(marketId);
    // console.log("Market of signer 1 on Morpho:", market);
    // borrowApy = await morphoBasicsContract.connect(addr1).borrowAPY(marketParams, market);
    // console.log("Borrow APY of signer 1 on Morpho:", borrowApy);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});