'use client';

import { useAccount, useReadContract } from 'wagmi';
import { useState, useEffect } from "react";
import PositionOverview from "./PositionOverview";
import ManagePosition from "./ManagePosition";
import { formatUnits } from "viem";

// Abi and constants
import morphoBasicsAbi from '@/constants/abi/morphoBasics.json';
import morphoOracleAbi from '@/constants/abi/morphoOracle.json';
import { marketIdWethUsdc, morphoBasicsAddress, marketParamsWethUsdc } from '@/constants';

const MorphoLeverage = () => {

  const { address } = useAccount();
  const [oraclePrice, setOraclePrice] = useState(undefined);
  const [leverage, setLeverage] = useState(undefined);

  //Get collateral
  const { data: collateral, refetch: refetchCollateral } = useReadContract({
    address: morphoBasicsAddress,
    abi: morphoBasicsAbi,
    functionName: "collateral",
    args: [marketIdWethUsdc, address],
    account: address,
  });


  //Get loan
  const { data: loan, refetch: refetchLoan } = useReadContract({
    address: morphoBasicsAddress,
    abi: morphoBasicsAbi,
    functionName: "borrowAssetsUser",
    args: [marketParamsWethUsdc, address],
    account: address,
  });


  //Get leverage
  const { data: rawLeverage, refetch: refetchLeverage } = useReadContract({
    address: morphoBasicsAddress,
    abi: morphoBasicsAbi,
    functionName: "userLeverage",
    args: [marketParamsWethUsdc, marketIdWethUsdc, address],
    account: address,
  });

  useEffect(() => {
    if (rawLeverage !== undefined) {
      let formattedLeverage = parseFloat(formatUnits(rawLeverage, 2)).toFixed(2);
      if (formattedLeverage < 1 || Number(collateral) == 0) formattedLeverage = undefined;
      setLeverage(formattedLeverage);
    }
  }, [rawLeverage, collateral]);

  //Get oracle price only once
  const { data: fetchedPrice } = useReadContract({
    address: marketParamsWethUsdc.oracle,
    abi: morphoOracleAbi,
    functionName: "price",
    account: address,
  });

  let { data: scaleFactor } = useReadContract({
    address: marketParamsWethUsdc.oracle,
    abi: morphoOracleAbi,
    functionName: "SCALE_FACTOR",
    account: address,
  });

  useEffect(() => {
    if (fetchedPrice !== undefined && oraclePrice === undefined && scaleFactor !== undefined) {
      const scaleFactorExponent = Math.log10(Number(scaleFactor));
      setOraclePrice(formatUnits(fetchedPrice, scaleFactorExponent));
    }
  }, [fetchedPrice, oraclePrice, scaleFactor]);

  return (
    <div className="w-full bg-background flex flex-col items-center justify-start space-y-12">
      {/* Position Overview Section */}
      <div className="w-full max-w-6xl">
        <PositionOverview collateral={collateral} loan={loan} leverage={leverage} />
      </div>

      {/* Manage Your Position Section */}
      <div className="w-full max-w-6xl">
        <ManagePosition 
          refetchCollateral={refetchCollateral} 
          refetchLoan={refetchLoan} 
          refetchLeverage={refetchLeverage} 
          collateral={collateral} 
          loan={loan} 
          leverage={leverage}
          p={oraclePrice}
        />
      </div>
    </div>
  );
};

export default MorphoLeverage;
