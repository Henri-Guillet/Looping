// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import { Id, IMorpho, MarketParams, Market } from "@morpho-org/morpho-blue/src/interfaces/IMorpho.sol";
import { IIrm } from "@morpho-org/morpho-blue/src/interfaces/IIrm.sol";
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


    function collateral(Id marketId, address user) public view returns (uint256 totalCollateralAssets) {
        totalCollateralAssets = morpho.collateral(marketId, user);
    }

    function borrowAssetsUser(MarketParams memory marketParams, address user) public view returns (uint256 totalBorrowAssets) {
        totalBorrowAssets = morpho.expectedBorrowAssets(marketParams, user);
    }

    function borrowAPY(MarketParams memory marketParams, Market memory market)
        public
        view
        returns (uint256 borrowApy)
    {
        if (marketParams.irm != address(0)) {
            borrowApy = IIrm(marketParams.irm).borrowRateView(marketParams, market).wTaylorCompounded(365 days);
        }
    }

    function userLeverage(MarketParams calldata marketParams, Id id, address user) public view returns (uint256 leverage) {
        IMorphoChainlinkOracleV2 oracle = IMorphoChainlinkOracleV2(marketParams.oracle);
        if (borrowAssetsUser(marketParams, user) == 0) return 100;
        return calculateActualLeverage(collateral(id, user), borrowAssetsUser(marketParams, user), oracle.price(), oracle.SCALE_FACTOR(), marketParams);
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

    function calculateActualLeverage(
        uint256 _collateral, 
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
        return _collateral * p * 100 / (_collateral * p - loan * oracleScaleFactor);
    }

}