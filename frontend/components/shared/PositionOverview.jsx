'use client';

import { useAccount, useReadContract } from "wagmi"
import { formatEther, formatUnits } from "viem";
import StatOverviewCard from "@/components/shared/StatOverviewCard";
//Abi
import morphoBasicsAbi from "@/constants/abi/morphoBasics.json";
import morphoAbi from "@/constants/abi/morpho.json";

//Logo
import MorphoLogo from "@/components/logo/MorphoLogo";
import BaseLogo from "@/components/logo/BaseLogo";

//Icons
import SupplyIcon from "@/components/icons/SupplyIcon";
import BorrowedIcon from "@/components/icons/BorrowedIcon";
import PercentIcon from "@/components/icons/PercentIcon";

//Morpho constants & contracts
import { marketIdWethUsdc, marketParamsWethUsdc, morphoBasicsAddress, morphoAddress } from "@/constants";



const PositionOverview = ({ collateral, loan, leverage }) => {

  const { address } = useAccount();
  const maxLeverage = roundTo(1 / (1 - Number(formatUnits(marketParamsWethUsdc.lltv, 18))), 2);

  //Helper functions
  function roundTo(value, decimals) {
    const factor = 10 ** decimals;
    return Math.round(value * factor) / factor;
  }

  //Get borrow apy
  const { data: market } = useReadContract({
    address: morphoAddress,
    abi: morphoAbi,
    functionName: "market",
    args: [marketIdWethUsdc],
    account: address,
  });


  let marketObject;
  if (market !== undefined) {
    marketObject = {
      totalSupplyAssets: market[0],
      totalSupplyShares: market[1],
      totalBorrowAssets: market[2],
      totalBorrowShares: market[3],
      lastUpdate: market[4],
      fee: market[5],
    };
  }


  const { data: borrowApy } = useReadContract({
    address: morphoBasicsAddress,
    abi: morphoBasicsAbi,
    functionName: "borrowAPY",
    args: [marketParamsWethUsdc, marketObject],
    account: address
  });



  return (
    <div className="w-full bg-background flex flex-col items-center p-6">
      <div className="relative flex items-center justify-between w-full mb-6">
        <div className="flex items-center space-x-3">
          <MorphoLogo />
          <h1 className="text-2xl font-medium text-foreground">Morpho Position Overview</h1>
        </div>
        <div className="absolute inset-0 flex justify-center">
          <div className="flex items-center px-4 py-2 bg-muted rounded-lg border border-border">
            <BaseLogo />
            <p className="text-foreground text-lg font-medium ml-2">Base Network</p>
          </div>
        </div>
        <div className="flex items-center px-4 py-2 bg-muted rounded-lg border border-border space-x-2">
          <div className="flex flex-row items-center justify-start">
            <img src="/icons/eth.svg" alt="ETH Logo" className="w-6 h-6" />
            <img src="/icons/usdc.svg" alt="USDC Logo" className="w-6 h-6 -ml-2" />
          </div>
          <p className="text-foreground text-sm font-medium">WETH / USDC (LTV: 86%)</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 w-full">
        <StatOverviewCard value={collateral} unit="WETH" label="Supplied" icon={SupplyIcon} formatValue={(value) => parseFloat(formatEther(value)).toFixed(4)} />
        <StatOverviewCard value={loan} unit="USDC" label="Borrowed" icon={BorrowedIcon} formatValue={(value) => parseFloat(formatUnits(value, 6)).toFixed(2)} />
        <StatOverviewCard value={leverage} unit="" label="Leverage" formatValue={(value) => value}>
          <div className="mt-2 flex flex-col  space-y-1">
            <div
              className={`flex items-center justify-center whitespace-nowrap rounded-lg px-3 py-1 text-white text-xs font-medium ${leverage >= 0.7 * maxLeverage ? "bg-red-700" : "bg-green-700"
                }`}
            >
              {leverage >= 0.7 * maxLeverage ? "Unsafe" : "Safe"}
            </div>
            <div className="text-grey-pure flex items-center whitespace-nowrap">
              <p className="text-sm text-muted-foreground">Max - {maxLeverage}</p>
            </div>
          </div>
        </StatOverviewCard>
        <StatOverviewCard value={borrowApy} unit="%" label="USDC Borrow APY" icon={PercentIcon} formatValue={(value) => (value !== undefined ? parseFloat(formatUnits(value, 16)).toFixed(2) : undefined)} />
      </div>
    </div>
  );
};

export default PositionOverview;
