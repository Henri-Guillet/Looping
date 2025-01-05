const { expect, assert } = require("chai");
const { ethers } = require("hardhat")
const hre = require("hardhat");
const { loadFixture} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const wethAbi = require("../abi/weth.json")
const morphoAbi = require("../abi/morpho.json")
const erc20Abi = require("../abi/erc20.json")
const oracleAbi = require("../abi/oracle.json")

describe("Test Looping contracts", function(){

    const morphoAddress = "0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb";
    const uniswapV3RouterAddress = "0x2626664c2603336E57B271c5C0b26F421741e481";
    const collateralAddress = "0x4200000000000000000000000000000000000006"; //weth address
    const loanAddress = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";    // usdc address
    const marketId = "0x8793cf302b8ffd655ab97bd1c695dbd967807e8367a65cb2f4edaf1380ba1bda"; // wethUsdcMarketId
    let oracle, morphoContract, loanContract, collateralContract, morphoLeverageContract, morphoBasicsContract, p, owner, addr1, addr2;
    const loopingFees = 0.001;
    const marketParams = {
        loanToken: loanAddress,
        collateralToken: collateralAddress,
        oracle: "0xFEa2D58cEfCb9fcb597723c6bAE66fFE4193aFE4",
        irm: "0x46415998764C29aB2a25CbeA6254146D50D22687",
        lltv: "860000000000000000"
    };

     //------------------------------------------------------------------------------------------------//
    // Helper functions
    //------------------------------------------------------------------------------------------------//   
    function roundTo(value, decimals) {
        const factor = 10 ** decimals;
        return Math.round(value * factor) / factor;
    }

    function roundDown(value, decimals) {
        const factor = 10 ** decimals;
        return Math.floor(value * factor) / factor;
      }

    async function getCollateralAndLoanOnMorpho(addr1, marketId, marketParams){
        collateral = await morphoBasicsContract.connect(addr1).collateral(marketId, addr1.address);
        collateral = Number(ethers.formatEther(collateral));
        loan = await morphoBasicsContract.connect(addr1).borrowAssetsUser(marketParams, addr1.address);
        loan = Number(ethers.formatUnits(loan, 6));
        return {collateral, loan};
    }

    // function used to derive final loan and collateral after increasing leverage
    function expectedLoanCollatAfterLeverage(initialCollateralOnMorpho, initialLoanOnMorpho, amountToDeposit, leverageParams){
        //expected loan and collateral on morpho
        // l_final = c_ 0 * p (leverage - 1) / (1 + f * (leverage -1))
        // c_final = c_0 + l_final ( 1- f ) / p
        let c_0 = initialCollateralOnMorpho - initialLoanOnMorpho/p + Number(ethers.formatEther(amountToDeposit)) * (1 - loopingFees);
        let swapFee = leverageParams.swapFeeBps / 10000;
        let swapSlippage = leverageParams.swapSlippageBps / 10000;
        let leverage = leverageParams.leverageFactor / 100;
        let f = (1 - (1 - swapFee) * (1 - swapSlippage));
        let l_final = c_0 * p * (leverage - 1) / (1 - f + leverage * f);
        let c_final = c_0 + l_final * (1-f) / p;
        return {c_final, l_final};
    }

    // function used to derive min leverage factor
    // Lmin = (L_ini * ( 1 - f) + c_0 * p) / ( c_0 * p - L_ini * f)
    function minLeverageFactor(initialCollateralOnMorpho, initialLoanOnMorpho, amountToDeposit, swapFeeBps, swapSlippageBps){
        let c_0 = initialCollateralOnMorpho - initialLoanOnMorpho/p + Number(ethers.formatEther(amountToDeposit)) * (1 - loopingFees);
        let swapFee = swapFeeBps / 10000;
        let swapSlippage = swapSlippageBps / 10000;
        let f = (1 - (1 - swapFee) * (1 - swapSlippage));
        let numerator = initialLoanOnMorpho * (1 - f) + c_0 * p;
        let denominator = c_0 * p - initialLoanOnMorpho * f;
        let minLeverageFactor = numerator / denominator;
        return minLeverageFactor;
    }

    // function used to derive final loan and collateral after deleveraging
    async function expectedLoanCollatAfterDeleverage(initialCollateralOnMorpho, initialLoanOnMorpho, leverageParams){
        // x = c_0 * p - Ltarget * (c_0 * p - Lini) / (p * (1 - Ltarget * f))
        let c_0 = initialCollateralOnMorpho ;
        let swapFee = leverageParams.swapFeeBps / 10000;
        let swapSlippage = leverageParams.swapSlippageBps / 10000;
        let leverage = leverageParams.leverageFactor / 100;
        let f = (1 - (1 - swapFee) * (1 - swapSlippage));
        let x = (c_0 * p - leverage * (c_0 * p - initialLoanOnMorpho)) / (p * (1 - leverage * f));
        let c_final = initialCollateralOnMorpho - x;
        let l_final = initialLoanOnMorpho - x * p * ( 1 - f);
        return {c_final, l_final, x};
    }

    //------------------------------------------------------------------------------------------------//
    // Fixtures
    //------------------------------------------------------------------------------------------------//
    async function deployContractsFixture() {
        [owner, addr1, addr2] = await ethers.getSigners();
        morphoLeverageContract = await ethers.deployContract("MorphoLeverage", [morphoAddress, uniswapV3RouterAddress]);
        morphoBasicsContract = await ethers.deployContract("MorphoBasics", [morphoAddress]);
        morphoContract = await ethers.getContractAt(morphoAbi, morphoAddress);
        loanContract = await ethers.getContractAt(erc20Abi, loanAddress);
        collateralContract = await ethers.getContractAt(wethAbi, collateralAddress);
        oracle = await hre.ethers.getContractAt(oracleAbi, "0xFEa2D58cEfCb9fcb597723c6bAE66fFE4193aFE4");
        p = await oracle.price();
        p = hre.ethers.formatUnits(p, 24);
        await morphoLeverageContract.waitForDeployment();
        await morphoBasicsContract.waitForDeployment();
      }

    async function leveragePositionFixture(leverageParams, amountToDeposit){
        const tx = await collateralContract.connect(addr1).deposit({value: amountToDeposit});
        await tx.wait();

        //Approve LoopingLeverage contract to transfer collateral from User 
        const tx1 = await collateralContract.connect(addr1).approve(morphoLeverageContract.target, amountToDeposit);
        await tx1.wait();
        
        // get collateral and loan already there on morpho
        ({ collateral: initialCollateralOnMorpho, loan: initialLoanOnMorpho } = await getCollateralAndLoanOnMorpho(addr1, marketId, marketParams));

        const tx3 = await morphoLeverageContract.connect(addr1).leveragePosition(leverageParams, amountToDeposit, marketParams);
        await tx3.wait();

        return {initialCollateralOnMorpho, initialLoanOnMorpho, amountToDeposit, leverageParams}

    }
    //------------------------------------------------------------------------------------------------//
    // end of fixtures
    //------------------------------------------------------------------------------------------------//

    //------------------------------------------------------------------------------------------------//
    // Test the leverage function
    //------------------------------------------------------------------------------------------------//

    describe("Test the leverage function", function(){
        let initialCollateralOnMorpho, initialLoanOnMorpho, amountToDeposit, leverageParams, collateralOnMorpho, loanOnMorpho;

        it("LEVERAGE: 0 initial collateral and Expected collateral = Theoretical collateral", async function(){
            // deploy contracts
            await loadFixture(deployContractsFixture);

            //Approve LoopingLeverage contract to manage user's position on morpho
            const tx = await morphoContract.connect(addr1).setAuthorization(morphoLeverageContract.target, true);
            await tx.wait();

            // create a first leveraged position with fixture
            ({ initialCollateralOnMorpho, initialLoanOnMorpho, amountToDeposit, leverageParams } = await leveragePositionFixture({
                 leverageFactor: 200, swapSlippageBps: 300, swapFeeBps: 30 }, ethers.parseEther("1"))
            );

            // derive expected collateral on morpho after leverage
            const {c_final} = expectedLoanCollatAfterLeverage(initialCollateralOnMorpho, initialLoanOnMorpho, amountToDeposit, leverageParams);

            // get final collateral on morpho
            ({collateral: collateralOnMorpho} = await getCollateralAndLoanOnMorpho(addr1, marketId, marketParams));

            // console.log(`collateralOnMorpho: ${collateralOnMorpho}`);
            // console.log(`expectedCollateralOnMorpho: ${c_final}`);
            expect(roundTo(collateralOnMorpho, 4)).to.equal(roundTo(c_final, 4), `The collateral is incorrect.`);
        })

        it("LEVERAGE: Revert if input leverage < Leverage min", async function(){
            // get collateral and loan already there on morpho
            ({collateral: initialCollateralOnMorpho, loan: initialLoanOnMorpho} = await getCollateralAndLoanOnMorpho(addr1, marketId, marketParams));

            // Define parameters for the new leverage position
            amountToDeposit = ethers.parseEther("1");
            swapFeeBps = 30;
            swapSlippageBps = 300;

            // Calculate the minimum leverage factor required to avoid deleveraging
            minLeverage = roundDown(minLeverageFactor(initialCollateralOnMorpho, initialLoanOnMorpho, amountToDeposit, swapFeeBps, swapSlippageBps), 2) * 100;
            console.log("minLeverageFactor", minLeverage);

            // Try to leverage with a leverage factor lower than the minimum required
            await expect(morphoLeverageContract.connect(addr1)
                                                .leveragePosition({leverageFactor: minLeverage, swapSlippageBps: 300, swapFeeBps: 30}, amountToDeposit, marketParams))
                                                .to.be.revertedWith("Leverage factor is too low");

        })

        it("LEVERAGE: Revert if input leverage > Leverage max", async function(){
            maxLeverage = roundTo(100 / (100 - marketParams.lltv/1e16), 2) * 100;
            // console.log("maxLeverage", maxLeverage);
            await expect(morphoLeverageContract.connect(addr1)
                                                .leveragePosition({leverageFactor: maxLeverage, swapSlippageBps: 300, swapFeeBps: 30}, amountToDeposit, marketParams))
                                                .to.be.revertedWith("Leverage factor is too high");

        })

        it("LEVERAGE: Expected collateral = Theoretical collateral", async function(){

            // Updates the current leverage position with a new leverage factor while adding more collateral
            ({ initialCollateralOnMorpho, initialLoanOnMorpho, amountToDeposit, leverageParams } = await leveragePositionFixture(
                { leverageFactor: 250, swapSlippageBps: 300, swapFeeBps: 30 },
                ethers.parseEther("1")
            ));
            
            // derive expected collateral on morpho after leverage
            const {c_final} = expectedLoanCollatAfterLeverage(initialCollateralOnMorpho, initialLoanOnMorpho, amountToDeposit, leverageParams);

            // get final collateral on morpho
            ({collateral: collateralOnMorpho} = await getCollateralAndLoanOnMorpho(addr1, marketId, marketParams));


            // console.log(`collateralOnMorpho: ${collateralOnMorpho}`);
            // console.log(`expectedCollateralOnMorpho: ${c_final}`);
            expect(roundTo(collateralOnMorpho, 4)).to.equal(roundTo(c_final, 4), `The collateral is incorrect.`);
        })

        it("LEVERAGE: Expected loan = Theoretical loan", async function(){
            const {l_final} = expectedLoanCollatAfterLeverage(initialCollateralOnMorpho, initialLoanOnMorpho, amountToDeposit, leverageParams);

            // get final loan on morpho
            ({loan: loanOnMorpho} = await getCollateralAndLoanOnMorpho(addr1, marketId, marketParams));

            // console.log(`loanOnMorpho: ${loanOnMorpho}`);
            // console.log(`expectedLoanOnMorpho: ${l_final}`);
            expect(roundTo(loanOnMorpho, 2)).to.equal(roundTo(l_final, 2), `The loan is incorrect.`)
        })

        it("LEVERAGE: input leverage = Actual leverage", async function(){
            let actualLeverage = collateralOnMorpho * p / (collateralOnMorpho * p - loanOnMorpho);
            let expectedLeverage = leverageParams.leverageFactor / 100;

            // console.log("actualLeverage", actualLeverage);
            // console.log("expectedLeverage", expectedLeverage);
            expect(roundTo(actualLeverage, 2)).to.equal(roundTo(expectedLeverage, 2), `The leverage is incorrect.`);
        })

        it("LEVERAGE: Looping fees = Expected Fees", async function(){
            //expected balances: number of deposits * amount of collateral deposited * looping fees
            let expectedLoopingBalance = 2 * 1 * loopingFees;

            //get actual balances
            let actualLoopingBalance = await collateralContract.balanceOf(morphoLeverageContract.target);
            actualLoopingBalance = Number(ethers.formatEther(actualLoopingBalance));

            // console.log("expectedLoopingBalance", expectedLoopingBalance);
            // console.log("actualLoopingBalance", actualLoopingBalance);
            expect(actualLoopingBalance).to.equal(expectedLoopingBalance, `The Looping protocol balance is incorrect.`);
        })

        it("LEVERAGE: Only morpho can call the callback function", async function(){
            await expect(morphoLeverageContract.connect(addr1).onMorphoSupplyCollateral(1, "0x1234")).to.be.revertedWith("Caller is not Morpho");
        })
      })


    //------------------------------------------------------------------------------------------------//
    // Test the deleverage function
    //------------------------------------------------------------------------------------------------//

    describe("Test the deleverage function", function(){

        it("DELEVERAGE: Revert if input leverage > Actual leverage", async function(){
            ({collateral: collateralOnMorpho, loan: loanOnMorpho} = await getCollateralAndLoanOnMorpho(addr1, marketId, marketParams));

            let actualLeverage = roundTo(collateralOnMorpho * p / (collateralOnMorpho * p - loanOnMorpho), 2) * 100;
            // console.log("actualLeverage", actualLeverage);
            leverageParams = {leverageFactor: actualLeverage, swapSlippageBps: 300, swapFeeBps: 30};

            await expect(morphoLeverageContract.connect(addr1).deLeveragedPosition(marketParams, leverageParams, false)).to.be.revertedWith("Desired leverage is too high");
        })

        it("DELEVERAGE: Revert if input leverage < 1", async function(){
            leverageParams = {leverageFactor: 99, swapSlippageBps: 300, swapFeeBps: 30};
            await expect(morphoLeverageContract.connect(addr1).deLeveragedPosition(marketParams, leverageParams, false)).to.be.revertedWith("Desired leverage has to be greater or equal to 1");
        })


        it("DELEVERAGE: Expected collateral = Theoretical collateral", async function(){
            
            // get collateral and loan already there on morpho
            ({collateral: initialCollateralOnMorpho, loan: initialLoanOnMorpho} = await getCollateralAndLoanOnMorpho(addr1, marketId, marketParams));
            
            // deleverage parameters
            leverageParams = {leverageFactor: 120, swapSlippageBps: 300, swapFeeBps: 30};

            await morphoLeverageContract.connect(addr1).deLeveragedPosition(marketParams, leverageParams, false);

            //expected collateral after deleveraging
            const {c_final} = await expectedLoanCollatAfterDeleverage(initialCollateralOnMorpho, initialLoanOnMorpho, leverageParams);

            // get final collateral on morpho
            ({collateral: collateralOnMorpho} = await getCollateralAndLoanOnMorpho(addr1, marketId, marketParams));

            // console.log("collateralOnMorpho", collateralOnMorpho);
            // console.log("expectedCollateralOnMorpho", c_final);
            expect(roundTo(collateralOnMorpho, 4)).to.equal(roundTo(c_final, 4), `The collateral is incorrect.`);
        })

        it("DELEVERAGE: Actual Leverage = Input leverage", async function(){

            // get final loan on morpho
            ({loan: loanOnMorpho} = await getCollateralAndLoanOnMorpho(addr1, marketId, marketParams));

            // deleverage parameters
            leverageParams = {leverageFactor: 120, swapSlippageBps: 300, swapFeeBps: 30};

            let actualLeverage = collateralOnMorpho * p / (collateralOnMorpho * p - loanOnMorpho);
            let expectedLeverage = leverageParams.leverageFactor / 100;

            // console.log("actualLeverage", actualLeverage);
            // console.log("expectedLeverage", expectedLeverage);
            expect(roundTo(actualLeverage, 2)).to.equal(roundTo(expectedLeverage, 2), `The collateral is incorrect.`);
        })

        it("DELEVERAGE: Should completely withdraw a leveraged position on behalf of addr1", async function(){

            // leverage params don't matter but need to be initialized
            leverageParams = {leverageFactor: 100, swapSlippageBps: 300, swapFeeBps: 30};

            await morphoLeverageContract.connect(addr1).deLeveragedPosition(marketParams, leverageParams, true);

            // get final collateral on morpho
            ({collateral: collateralOnMorpho} = await getCollateralAndLoanOnMorpho(addr1, marketId, marketParams));

            expect(collateralOnMorpho).to.equal(0, "The collateral is not 0");
        })

        it("DELEVERAGE: Should revert if there is no collateral on morpho", async function(){
            await expect(morphoLeverageContract.connect(addr1).deLeveragedPosition(marketParams, leverageParams, false)).to.be.revertedWith("No collateral on morpho");
        })

        it("DELEVERAGE: Only morpho can call the callback function", async function(){
            await expect(morphoLeverageContract.connect(addr1).onMorphoRepay(1, "0x1234")).to.be.revertedWith("Caller is not Morpho");
        })
    })

    //------------------------------------------------------------------------------------------------//
    // Test MorphoBasics view functions
    //------------------------------------------------------------------------------------------------//
    describe("Test MorphoBasics view functions", function(){
        it("MORPHOBASICS: view collateral", async function(){
            const amountToDeposit = ethers.parseEther("1");
            const tx = await collateralContract.connect(addr1).deposit({value: amountToDeposit});
            await tx.wait();
    
            //Approve morpho contract to transfer collateral from User 
            const tx1 = await collateralContract.connect(addr1).approve(morphoAddress, amountToDeposit);
            await tx1.wait();

            const tx2 = await morphoContract.connect(addr1).supplyCollateral(marketParams, amountToDeposit, addr1.address, "0x");
            await tx2.wait();

            let collateralBalance = await morphoBasicsContract.connect(addr1).collateral(marketId, addr1.address);
            // console.log("collateralBalance", collateralBalance);
            // console.log("amountToDeposit", amountToDeposit);
            expect(collateralBalance.toString()).to.equal(amountToDeposit.toString(), "The collateral balance is incorrect");
        })

        it("MORPHOBASICS: view borrow amount", async function () {
            let amountToBorrow = ethers.parseUnits("100", 6);

            const tx = await morphoContract.connect(addr1).borrow(marketParams, amountToBorrow, 0, addr1.address, addr1.address);
            await tx.wait();

            let borrowBalance = await morphoBasicsContract.connect(addr1).borrowAssetsUser(marketParams, addr1.address);
            borrowBalance = Number(ethers.formatUnits(borrowBalance, 6));
            amountToBorrow = Number(ethers.formatUnits(amountToBorrow, 6));

            expect(roundTo(borrowBalance, 5)).to.equal(roundTo(amountToBorrow, 5), "The borrow balance is incorrect");
        })

        it("MORPHOBASICS: view user leverage", async function(){
            let userLeverage = await morphoBasicsContract.connect(addr1).userLeverage(marketParams, marketId, addr1.address);
            userLeverage = Number(userLeverage) / 100;
            //get collateral and loan on morpho
            ({collateral: collateralOnMorpho, loan: loanOnMorpho} = await getCollateralAndLoanOnMorpho(addr1, marketId, marketParams));
            let expectedLeverage = collateralOnMorpho * p / (collateralOnMorpho * p - loanOnMorpho);
            // console.log("userLeverage", userLeverage);
            // console.log("expectedLeverage", expectedLeverage);
            expect(userLeverage).to.equal(roundDown(expectedLeverage, 2), "The user leverage is incorrect");
        })

        it("MORPHOBASICS: view borrow APY", async function () {
            const [
              totalSupplyAssets,
              totalSupplyShares,
              totalBorrowAssets,
              totalBorrowShares,
              lastUpdate,
              fee
            ] = await morphoContract.connect(addr1).market(marketId);
          
            const market = {totalSupplyAssets, totalSupplyShares, totalBorrowAssets, totalBorrowShares, lastUpdate, fee};
          
            const borrowApy = await morphoBasicsContract.connect(addr1).borrowAPY(marketParams, market);
            // console.log("borrowApy:", ethers.formatUnits(borrowApy, 18));
            expect(borrowApy).to.be.greaterThan(0, "The borrow APY is 0");
          });
    })

    //------------------------------------------------------------------------------------------------//
    // Test Basic functions on morphoLeverage
    //------------------------------------------------------------------------------------------------//
    describe("Test Basic functions on morphoLeverage", function(){
        it("MORPHOLEVERAGE BASICS: withdrawFees, should revert if the caller is not the owner", async function(){
            await expect(morphoLeverageContract.connect(addr1)
                                            .withdrawFees(marketParams.collateralToken))
                                            .to.be.revertedWithCustomError(morphoLeverageContract, "OwnableUnauthorizedAccount")
                                            .withArgs(addr1.address);
        })
        it("MORPHOLEVERAGE BASICS: supply without leverage", async function(){
            const amountToDeposit = ethers.parseEther("1");
            //get initial collateral on morpho
            ({collateral: initialCollateralOnMorpho} = await getCollateralAndLoanOnMorpho(addr1, marketId, marketParams));
            const tx = await collateralContract.connect(addr1).deposit({value: amountToDeposit});
            await tx.wait();
            //Approve LoopingLeverage contract to transfer collateral from User 
            const tx1 = await collateralContract.connect(addr1).approve(morphoLeverageContract.target, amountToDeposit);
            await tx1.wait();
            const tx2 = await morphoLeverageContract.connect(addr1).supplyCollateral(marketParams, amountToDeposit);
            await tx2.wait();
            // get final collateral on morpho
            ({collateral: collateralOnMorpho} = await getCollateralAndLoanOnMorpho(addr1, marketId, marketParams));
            expectedCollateral = Number(ethers.formatEther(amountToDeposit)) + initialCollateralOnMorpho;
            // console.log("expectedCollateral", expectedCollateral);
            // console.log("collateralOnMorpho", collateralOnMorpho);
            expect(collateralOnMorpho).to.equal(expectedCollateral, "The collateral is incorrect");
        })
        it("MORPHOLEVERAGE BASICS: repay the expected amount of loan", async function(){
            const amountToRepay = ethers.parseUnits("100", 6);
            const amountToBorrow = ethers.parseUnits("300", 6);
            const tx = await morphoContract.connect(addr1).borrow(marketParams, amountToBorrow, 0, addr1.address, addr1.address);
            await tx.wait();
            //get initial loan on morpho
            ({loan: initialLoanOnMorpho} = await getCollateralAndLoanOnMorpho(addr1, marketId, marketParams));
            //Approve LoopingLeverage contract to transfer repay amount from User 
            const tx1 = await loanContract.connect(addr1).approve(morphoLeverageContract.target, amountToRepay);
            await tx1.wait();
            const tx2 = await morphoLeverageContract.connect(addr1).repayAmount(marketParams, amountToRepay);
            await tx2.wait();
            //get final loan on morpho
            ({loan: loanOnMorpho} = await getCollateralAndLoanOnMorpho(addr1, marketId, marketParams));
            expectedLoan = initialLoanOnMorpho - Number(ethers.formatUnits(amountToRepay, 6));
            // console.log("expectedLoan", expectedLoan);
            // console.log("loanOnMorpho", loanOnMorpho);
            expect(loanOnMorpho.toFixed(2)).to.equal(expectedLoan.toFixed(2), "The loan is incorrect");
        })
        it("MORPHOLEVERAGE BASICS: the owner should be able to withdraw fees", async function(){
            const fees = await morphoLeverageContract.connect(owner).getFees(marketParams.collateralToken);
            // console.log("fees", fees);
            await morphoLeverageContract.connect(owner).withdrawFees(marketParams.collateralToken);
            const feesAfterWithdraw = await morphoLeverageContract.connect(owner).getFees(marketParams.collateralToken);
            // console.log("feesAfterWithdraw", feesAfterWithdraw);
            expect(feesAfterWithdraw).to.equal(0, "The fees are not 0");
        })
    })





})