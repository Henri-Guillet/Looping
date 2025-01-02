'use client';

import { useAccount, useReadContract } from 'wagmi';
import PositionOverview from "./PositionOverview";
import ManagePosition from "./ManagePosition";
import { formatUnits } from "viem";

// Abi and constants
import morphoBasicsAbi from '@/constants/abi/morphoBasics.json';
import { marketIdWethUsdc, morphoBasicsAddress, marketParamsWethUsdc } from '@/constants';

const MorphoLeverage = () => {

  const { address } = useAccount();

  //Get collateral
  const { data: collateral, refetch: refetchCollateral } = useReadContract({
    address: morphoBasicsAddress,
    abi: morphoBasicsAbi,
    functionName: "collateral",
    args: [marketIdWethUsdc, address],
    account: address,
  });

  console.log("Collateral", collateral);

  //Get borrow
  const { data: borrow, refetch: refetchBorrow } = useReadContract({
    address: morphoBasicsAddress,
    abi: morphoBasicsAbi,
    functionName: "borrowAssetsUser",
    args: [marketParamsWethUsdc, address],
    account: address,
  });

  //Get leverage
  let { data: leverage, refetch: refetchLeverage } = useReadContract({
    address: morphoBasicsAddress,
    abi: morphoBasicsAbi,
    functionName: "userLeverage",
    args: [marketParamsWethUsdc, marketIdWethUsdc, address],
    account: address,
  });

  if (leverage !== undefined) {
    leverage = parseFloat(formatUnits(leverage, 2)).toFixed(2);
    if (leverage < 1) leverage = undefined;
  }

  return (
    <div className="w-full bg-background flex flex-col items-center justify-start space-y-12">
      {/* Position Overview Section */}
      <div className="w-full max-w-6xl">
        <PositionOverview collateral={collateral} borrow={borrow} leverage={leverage} />
      </div>

      {/* Manage Your Position Section */}
      <div className="w-full max-w-6xl">
        <ManagePosition refetchCollateral={refetchCollateral} refetchBorrow={refetchBorrow} refetchLeverage={refetchLeverage} />
      </div>
    </div>
  );
};

export default MorphoLeverage;
