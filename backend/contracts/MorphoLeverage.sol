// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import { IMorphoSupplyCollateralCallback, IMorphoRepayCallback } from "@morpho-org/morpho-blue/src/interfaces/IMorphoCallbacks.sol";
import "@uniswap/swap-router-contracts/contracts/interfaces/IV3SwapRouter.sol";

import { Id, IMorpho, MarketParams } from "@morpho-org/morpho-blue/src/interfaces/IMorpho.sol";
import { IOracle } from "@morpho-org/morpho-blue/src/interfaces/IOracle.sol";
import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { MorphoLib } from "@morpho-org/morpho-blue/src/libraries/periphery/MorphoLib.sol";
import { MarketParamsLib } from "@morpho-org/morpho-blue/src/libraries/MarketParamsLib.sol";
import { MorphoBalancesLib } from "@morpho-org/morpho-blue/src/libraries/periphery/MorphoBalancesLib.sol";
import { MorphoStorageLib } from "@morpho-org/morpho-blue/src/libraries/periphery/MorphoStorageLib.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import "hardhat/console.sol";

interface IMorphoChainlinkOracleV2 is IOracle {
    function SCALE_FACTOR() external view returns (uint256);
}

contract MorphoLeverage is IMorphoSupplyCollateralCallback, Ownable {
    using MorphoLib for IMorpho;
    using MarketParamsLib for MarketParams;
    using SafeERC20 for ERC20;
    using MorphoBalancesLib for IMorpho;

    // -----------------------------------------------------------------------
    // Immutable State
    // -----------------------------------------------------------------------

    IMorpho public immutable morpho;
    IV3SwapRouter public immutable swapper;

    // -----------------------------------------------------------------------
    // Constructor
    // -----------------------------------------------------------------------

    constructor(IMorpho _morpho, IV3SwapRouter _swapper) Ownable(msg.sender) {
        morpho = _morpho;
        swapper = _swapper;
    }

    // -----------------------------------------------------------------------
    // Modifiers
    // -----------------------------------------------------------------------

    modifier onlyMorpho() {
        require(msg.sender == address(morpho), "Caller is not Morpho");
        _;
    }

    // -----------------------------------------------------------------------
    // Data Structures
    // -----------------------------------------------------------------------

    mapping(address => uint256) private userSwappedAmount;
    mapping(address => uint256) private feesPerToken;

    struct SupplyCollateralData {
        uint256 loanAmount;
        uint256 morphoInitialCollateral;
        uint256 newCollateralAdded;
        uint256 totalExpectedCollateral;
        MarketParams marketParams;
        address user;
    }

    struct LeverageParams {
        uint16 leverageFactor; // percentage-based
        uint16 swapSlippageBps;
        uint16 swapFeeBps;
    }

    struct LeverageData {
        uint256 initialLoan;
        uint256 c_0;
        uint256 morphoBalance;
        uint256 newCollateralAdded;
        uint256 totalInitialCollateral;
        uint256 totalCollateralExpected;
        uint256 collateralToSupply;
    }

    struct DeLeverageData {
        uint256 initialLoan;
        uint256 c_0;
        uint256 newCollateralAdded;
        uint256 totalInitialCollateral;
        uint256 totalCollateralExpected;
        uint256 toSwap;
        uint256 toWithdraw;
        uint256 toRepay;
    }
  

    struct RepayData {
        MarketParams marketParams;
        address user;
        uint256 toWithdraw;
    }

    // -----------------------------------------------------------------------
    // Managing Functions without leverage
    // -----------------------------------------------------------------------


    function supplyCollateral(MarketParams memory marketParams, uint256 amount) external {
        ERC20(marketParams.collateralToken).forceApprove(address(morpho), type(uint256).max);
        ERC20(marketParams.collateralToken).safeTransferFrom(msg.sender, address(this), amount);

        address onBehalf = msg.sender;

        morpho.supplyCollateral(marketParams, amount, onBehalf, hex"");
    }


    function repayAmount(MarketParams memory marketParams, uint256 amount)
        external
        returns (uint256 assetsRepaid, uint256 sharesRepaid)
    {
        ERC20(marketParams.loanToken).forceApprove(address(morpho), type(uint256).max);
        ERC20(marketParams.loanToken).safeTransferFrom(msg.sender, address(this), amount);

        uint256 shares;
        address onBehalf = msg.sender;
        (assetsRepaid, sharesRepaid) = morpho.repay(marketParams, amount, shares, onBehalf, hex"");
    }

    // -----------------------------------------------------------------------
    // Leverage Functions
    // -----------------------------------------------------------------------

    function leveragePosition(LeverageParams calldata leverageParams, uint256 userNewCollateral, MarketParams calldata marketParams) public {
        IMorphoChainlinkOracleV2 oracle = IMorphoChainlinkOracleV2(marketParams.oracle);
        LeverageData memory data;

        //Net collateral on morpho
        data.morphoBalance = morpho.collateral(marketParams.id(), msg.sender) - morpho.expectedBorrowAssets(marketParams, msg.sender) * oracle.SCALE_FACTOR() * 1e12  / oracle.price();

        // Deduct protocol fees (0.1%) on the new collateral added
        feesPerToken[marketParams.collateralToken] = feesPerToken[marketParams.collateralToken] + (userNewCollateral / 1000);
        data.newCollateralAdded = userNewCollateral - (userNewCollateral / 1000);

        // Define the initial collateral in the formula
        data.c_0 = data.morphoBalance + data.newCollateralAdded;

        // Min leverage factor so final loan is > to the initial loan (i.e no deleveraging)
        // Lmin = (L_ini * ( 1 - f) + c_0 * p) / ( c_0 * p - L_ini * f)
        // with f = (1-swapSlippageBps/10000) * (1-swapFeeBps/10000) 
        uint256 minLeverageFactor = calculateMinLeverageFactor(
            data.c_0,
            morpho.expectedBorrowAssets(marketParams, msg.sender),
            oracle.price(),
            oracle.SCALE_FACTOR(),
            leverageParams.swapFeeBps,
            leverageParams.swapSlippageBps,
            marketParams
        );
        
        //Make sure no deleveraging is needed after accounting for the new user collateral (i.e some borrow amount has to be repaid)
        require(leverageParams.leverageFactor > minLeverageFactor, "Leverage factor is too low");
        //Make sure target leverage is lower than the highest leverage possible ( 1 / (1-LLTV))
        require(leverageParams.leverageFactor < 100*100 / (100 - marketParams.lltv/1e16), "Leverage factor is too high");

        // Transfer initial collateral from the user to Looping contract
        ERC20(marketParams.collateralToken).safeTransferFrom(msg.sender, address(this), userNewCollateral);

        // Total loan expected on morpho in the end
        uint256 loanAmount = calculateLoanAmount(
            leverageParams.leverageFactor,
            data.c_0,
            oracle.price(),
            oracle.SCALE_FACTOR(),
            leverageParams.swapFeeBps,
            leverageParams.swapSlippageBps,
            marketParams
        );

        // Total collateral expected on morpho in the end
        // C_final = C_0 * + Loan * (1-f) / P
        data.totalCollateralExpected = data.c_0
        + scaleAmount(loanAmount * (10000 - leverageParams.swapFeeBps) / 10000 * (10000 - leverageParams.swapSlippageBps) / 10000 * oracle.SCALE_FACTOR() / oracle.price(),
        ERC20(marketParams.loanToken).decimals(),
        ERC20(marketParams.collateralToken).decimals()
        );

        //Collateral to add on morpho on top of the current collateral
        data.collateralToSupply = data.totalCollateralExpected - morpho.collateral(marketParams.id(), msg.sender);

        // Approve Morpho to handle collateral tokens to supply on morpho
        ERC20(marketParams.collateralToken).forceApprove(address(morpho), type(uint256).max);

        //Amount to borrow considering the initial loan on morpho
        loanAmount = loanAmount - morpho.expectedBorrowAssets(marketParams, msg.sender);

        // Supply collateral and trigger the callback for the borrowing and swapping process
        morpho.supplyCollateral(
            marketParams,
            data.collateralToSupply,
            msg.sender,
            abi.encode(
                SupplyCollateralData({
                    loanAmount: loanAmount,
                    morphoInitialCollateral: morpho.collateral(marketParams.id(), msg.sender),
                    newCollateralAdded: data.newCollateralAdded,
                    totalExpectedCollateral: data.totalCollateralExpected,
                    marketParams: marketParams,
                    user: msg.sender
                })
            )
        );

        // Send back the extra amount of token not used during the swap to the user
        ERC20(marketParams.collateralToken).safeTransferFrom(address(this), msg.sender, userSwappedAmount[msg.sender] + data.newCollateralAdded - data.collateralToSupply);
    }

    function deLeveragedPosition(MarketParams calldata marketParams, LeverageParams calldata leverageParams, bool fullWithdraw) public  {
        IMorphoChainlinkOracleV2 oracle = IMorphoChainlinkOracleV2(marketParams.oracle);
        DeLeverageData memory data;

        require(morpho.collateral(marketParams.id(), msg.sender) > 0, "No collateral on morpho");

        // Approve Morpho to handle loan tokens to repay the loan
        ERC20(marketParams.loanToken).forceApprove(address(morpho), type(uint256).max);

        if (fullWithdraw) {
            uint256 totalShares = morpho.borrowShares(marketParams.id(), msg.sender);
            data.toWithdraw = morpho.collateral(marketParams.id(), msg.sender);
            morpho.repay(
                marketParams, 
                0, 
                totalShares, 
                msg.sender, 
                abi.encode(
                    RepayData({
                        marketParams: marketParams, 
                        user: msg.sender, 
                        toWithdraw: data.toWithdraw
                    })
                )
            );
        } else {

            //Make sure the desired leverage is greater than 1
            require(leverageParams.leverageFactor >= 100, "Desired leverage has to be greater or equal to 1");

            // Define the initial collateral in the formula
            data.c_0 = morpho.collateral(marketParams.id(), msg.sender);

            uint256 actualLeverage = calculateActualLeverage(
                data.c_0,
                morpho.expectedBorrowAssets(marketParams, msg.sender),
                oracle.price(),
                oracle.SCALE_FACTOR(),
                marketParams
            );

            // Make sure the desired leverage is lower than the actual leverage
            require(actualLeverage > leverageParams.leverageFactor, "Desired leverage is too high");

            // Collateral to swap in order to repay the necesary loan to achieve the desired leverage (including swapping and pool fees)
            // toSwap = (c0 * p - Ltarget * (c0*p - Lini)) / (p * (1 - Ltarget * f))
            data.toWithdraw = calculateCollateralToWithdraw(
                leverageParams.leverageFactor, 
                data.c_0, 
                morpho.expectedBorrowAssets(marketParams, msg.sender),
                oracle.price(), 
                oracle.SCALE_FACTOR(),
                leverageParams.swapFeeBps,
                leverageParams.swapSlippageBps,
                marketParams
            );

            // Amount to repay is the amount to withdraw considering conversion rate, swapping fees and pool fees
            // Amount to repay = amountToWithdraw * conversionRate * (1 - Swappingfees) * (1 - Poolfees)
            data.toRepay = data.toWithdraw * oracle.price() / oracle.SCALE_FACTOR() * (10000 - leverageParams.swapFeeBps) / 10000 * (10000 - leverageParams.swapSlippageBps) / 10000;
            data.toRepay = scaleAmount(
                data.toRepay,
                ERC20(marketParams.collateralToken).decimals(),
                ERC20(marketParams.loanToken).decimals()
            );
            morpho.repay(
                marketParams, 
                data.toRepay, 
                0, 
                msg.sender, 
                abi.encode(
                    RepayData({
                        marketParams: marketParams, 
                        user: msg.sender, 
                        toWithdraw: data.toWithdraw
                    })
                )
            );
        }

        // Transfer the remaining collateral back to the user
        ERC20(marketParams.collateralToken).safeTransferFrom(address(this), msg.sender, data.toWithdraw - userSwappedAmount[msg.sender]);
    }    

    // -----------------------------------------------------------------------
    // Leverage Callbacks 
    // -----------------------------------------------------------------------


    // Callback for the supplyCollateral function
    function onMorphoSupplyCollateral(uint256 collateralToSupply, bytes calldata data) external onlyMorpho {
        SupplyCollateralData memory supplyData = abi.decode(data, (SupplyCollateralData));

        // Borrow against the supplied collateral
        (uint256 borrowedAmount, ) = morpho.borrow(
            supplyData.marketParams,
            supplyData.loanAmount,
            0,
            supplyData.user,
            address(this)
        );

        uint256 minimumSwappedAmount = collateralToSupply - supplyData.newCollateralAdded;  

        ERC20(supplyData.marketParams.loanToken).forceApprove(address(swapper), borrowedAmount);

        IV3SwapRouter.ExactInputSingleParams memory swapParams = IV3SwapRouter.ExactInputSingleParams({
            tokenIn: supplyData.marketParams.loanToken,
            tokenOut: supplyData.marketParams.collateralToken,
            fee: 3000,
            recipient: address(this),
            amountIn: borrowedAmount,
            amountOutMinimum: minimumSwappedAmount,
            sqrtPriceLimitX96: 0
        });

        userSwappedAmount[supplyData.user] = swapper.exactInputSingle(swapParams);
    }

    // Callback for the repay function
    function onMorphoRepay(uint256 amount, bytes calldata data) external onlyMorpho {
        RepayData memory repayData = abi.decode(data, (RepayData));
        morpho.withdrawCollateral(repayData.marketParams, repayData.toWithdraw, repayData.user, address(this));
        ERC20(repayData.marketParams.collateralToken).forceApprove(address(swapper), repayData.toWithdraw);

        IV3SwapRouter.ExactOutputSingleParams memory swapParams = IV3SwapRouter.ExactOutputSingleParams({
            tokenIn: repayData.marketParams.collateralToken,
            tokenOut: repayData.marketParams.loanToken,
            fee: 3000,
            recipient: address(this),
            amountOut: amount,
            amountInMaximum: repayData.toWithdraw,
            sqrtPriceLimitX96: 0
        });

        userSwappedAmount[repayData.user] = swapper.exactOutputSingle(swapParams);
    }

     // -----------------------------------------------------------------------
    // Fees Functions
    // ----------------------------------------------------------------------- 

    function withdrawFees(address collateralToken) external onlyOwner {
        uint256 feesToWithdraw = feesPerToken[collateralToken];
        feesPerToken[collateralToken] = 0;
        ERC20(collateralToken).safeTransfer(owner(), feesToWithdraw);
    }

    function getFees(address collateralToken) external view returns (uint256) {
        return feesPerToken[collateralToken];
    }

    // -----------------------------------------------------------------------
    // Internal Functions
    // -----------------------------------------------------------------------

    // Min leverage factor so final loan is > to the initial loan (i.e no deleveraging)
    // Lmin = (L_ini * ( 1 - f) + c_0 * p) / ( c_0 * p - L_ini * f)
    function calculateMinLeverageFactor(
        uint256 c_0,
        uint256 l_ini,
        uint256 p,
        uint256 oracleScaleFactor,
        uint256 swapFeeBps,
        uint256 swapSlippageBps,
        MarketParams calldata marketParams
    ) internal view returns (uint256) {
        //numerator -> L_ini * ( 1 - f) + c_0 * p
        uint256 c0_P = scaleAmount(c_0 * p / oracleScaleFactor, ERC20(marketParams.collateralToken).decimals(), ERC20(marketParams.loanToken).decimals());
        uint256 numerator = l_ini * (10000 - swapFeeBps) * (10000 - swapSlippageBps) / 10000 + c0_P * 10000;
        //denominator -> c_0 * p - L_ini * f
        uint256 denominator = c0_P * 10000 - l_ini * (10000*10000 - (10000 - swapFeeBps) * (10000 - swapSlippageBps))/ 10000;
        //min leverage factor
        uint256 minLeverageFactor = numerator * 100 / denominator;
        return minLeverageFactor;
    }


    function calculateLoanAmount(
        uint256 leverageFactor,
        uint256 c_0,
        uint256 p,
        uint256 oracleScaleFactor,
        uint256 swapFeeBps,
        uint256 swapSlippageBps,
        MarketParams calldata marketParams
    ) internal view returns (uint256) {
        // numerator -> C_0 * P (Lev - 1)
        uint256 numerator = c_0 * p / oracleScaleFactor * (leverageFactor - 100) * 10000 * 10000;
        // denominator -> (1 - fpool) * (1-fslippage) + Lev * (1 - (1-fpool) * (1-fslippage))
        uint256 denominator = (10000 - swapFeeBps) * (10000 - swapSlippageBps) * 100 + leverageFactor * (10000 * 10000 - (10000 - swapFeeBps) * (10000 - swapSlippageBps));
        //loan amount
        uint256 loanAmount = numerator / denominator;

        //adjust amount to match the loan token decimals
        loanAmount = scaleAmount(
            loanAmount,
            ERC20(marketParams.collateralToken).decimals(),
            ERC20(marketParams.loanToken).decimals()
        );
        return loanAmount;
    }

    function calculateCollateralToWithdraw(
        uint256 leverageFactor, 
        uint256 c_0,
        uint256 l_ini, 
        uint256 p, 
        uint256 oracleScaleFactor,
        uint256 swapFeeBps,
        uint256 swapSlippageBps,
        MarketParams calldata marketParams
    ) internal view returns (uint256) {
        //numerator -> (c0 * p - Ltarget * (c0*p - Lini))
        l_ini = scaleAmount(
            l_ini,
            ERC20(marketParams.loanToken).decimals(),
            ERC20(marketParams.collateralToken).decimals()
        );

        uint256 numerator = c_0 * p - leverageFactor * (c_0 * p - l_ini * oracleScaleFactor) / 100;
        //denominator -> p * ( 1 - Ltarget * f)
        uint256 denominator = p * (10000*10000*100 - leverageFactor * (10000 * 10000 - (10000 - swapFeeBps) * (10000 - swapSlippageBps))) /  (10000*10000*100) ;
        //amount to swap
        uint256 amountToWithdraw = numerator / denominator;
        return amountToWithdraw;
    }

    function calculateActualLeverage(
        uint256 collateral, 
        uint256 loan, 
        uint256 p, 
        uint256 oracleScaleFactor,
        MarketParams calldata marketParams
    ) internal view returns (uint256) {
        loan = scaleAmount(
            loan,
            ERC20(marketParams.loanToken).decimals(),
            ERC20(marketParams.collateralToken).decimals()
        );
        return collateral * p * 100 / (collateral * p - loan * oracleScaleFactor);
    }

    function scaleAmount(uint256 amount, uint256 fromDecimals, uint256 toDecimals) internal pure returns (uint256) {
        if (fromDecimals > toDecimals) {
            return amount / (10 ** (fromDecimals - toDecimals));
        } else if (fromDecimals < toDecimals) {
            return amount * (10 ** (toDecimals - fromDecimals));
        }
        return amount;
    }
}
