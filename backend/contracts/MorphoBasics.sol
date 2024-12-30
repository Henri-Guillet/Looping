// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import { Id, IMorpho, MarketParams } from "@morpho-org/morpho-blue/src/interfaces/IMorpho.sol";
import { MorphoLib } from "@morpho-org/morpho-blue/src/libraries/periphery/MorphoLib.sol";
import { IOracle } from "@morpho-org/morpho-blue/src/interfaces/IOracle.sol";
import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { MarketParamsLib } from "@morpho-org/morpho-blue/src/libraries/MarketParamsLib.sol";
import { MorphoBalancesLib } from "@morpho-org/morpho-blue/src/libraries/periphery/MorphoBalancesLib.sol";
import { MorphoStorageLib } from "@morpho-org/morpho-blue/src/libraries/periphery/MorphoStorageLib.sol";
import {MathLib} from "@morpho-org/morpho-blue/src/libraries/MathLib.sol";
import {SharesMathLib} from "@morpho-org/morpho-blue/src/libraries/SharesMathLib.sol";
import "hardhat/console.sol";

interface IMorphoChainlinkOracleV2 is IOracle {
    function SCALE_FACTOR() external view returns (uint256);
}



contract MorphoBasics {
    using MorphoLib for IMorpho;
    using MarketParamsLib for MarketParams;
    using SafeERC20 for ERC20;
    using MorphoBalancesLib for IMorpho;
    using MathLib for uint256;

    // -----------------------------------------------------------------------
    // Immutable State
    // -----------------------------------------------------------------------

    IMorpho public immutable morpho;

    // -----------------------------------------------------------------------
    // Constructor
    // -----------------------------------------------------------------------

    constructor(IMorpho _morpho) {
        morpho = _morpho;
    }

    // -----------------------------------------------------------------------
    // View Functions
    // -----------------------------------------------------------------------



   /// @notice Calculates the total collateral balance of a given user in a specific market.
    /// @dev It uses extSloads to load only one storage slot of the Position struct and save gas.
    /// @param marketId The identifier of the market.
    /// @param user The address of the user whose collateral balance is being calculated.
    /// @return totalCollateralAssets The calculated total collateral balance.
    function collateral(Id marketId, address user) public view returns (uint256 totalCollateralAssets) {
        totalCollateralAssets = morpho.collateral(marketId, user);
    }

    /// @notice Calculates the total borrow balance of a given user in a specific market.
    /// @param marketParams The parameters of the market.
    /// @param user The address of the user whose borrow balance is being calculated.
    /// @return totalBorrowAssets The calculated total borrow balance.
    function borrowAssetsUser(MarketParams memory marketParams, address user) public view returns (uint256 totalBorrowAssets) {
        totalBorrowAssets = morpho.expectedBorrowAssets(marketParams, user);
    }

    /// @notice Calculates the health factor of a user in a specific market.
    /// @param marketParams The parameters of the market.
    /// @param id The identifier of the market.
    /// @param user The address of the user whose health factor is being calculated.
    /// @return healthFactor The calculated health factor.
    function userHealthFactor(MarketParams memory marketParams, Id id, address user) public view returns (uint256 healthFactor) {
        IMorphoChainlinkOracleV2 oracle = IMorphoChainlinkOracleV2(marketParams.oracle);
        uint256 _collateral = collateral(id, user);
        uint256 borrowed = borrowAssetsUser(marketParams, user);
        uint256 maxBorrow = _collateral.mulDivDown(oracle.price(), oracle.SCALE_FACTOR()).wMulDown(marketParams.lltv);
        // uint256 maxBorrow2 = (collateral * oracle.price()) / oracle.SCALE_FACTOR() * marketParams.lltv / 1e18;
        console.log("maxBorrow", maxBorrow);
        // console.log("maxBorrow2", maxBorrow2);
        maxBorrow = scaleAmount(maxBorrow, ERC20(marketParams.collateralToken).decimals(), ERC20(marketParams.loanToken).decimals());
        console.log("maxBorrow scale decimals", maxBorrow);
        if (borrowed == 0) return type(uint256).max;
        console.log("borrowed", borrowed);
        healthFactor = maxBorrow.wDivDown(borrowed);
        console.log("healthFactor", healthFactor);
    }
     

    // -----------------------------------------------------------------------
    // Helper Functions
    // -----------------------------------------------------------------------


    function scaleAmount(uint256 amount, uint256 fromDecimals, uint256 toDecimals) internal pure returns (uint256) {
        if (fromDecimals > toDecimals) {
            return amount / (10 ** (fromDecimals - toDecimals));
        } else if (fromDecimals < toDecimals) {
            return amount * (10 ** (toDecimals - fromDecimals));
        }
        return amount;
    }

}