'use client';

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi"
import { formatEther, formatUnits, parseEther } from "viem";

//Abi
import morphoAbi from "@/constants/abi/morpho.json";
import morphoLeverageAbi from "@/constants/abi/morphoLeverage.json";

//Cards
import ManageCollateralCard from "@/components/shared/ManageCollateralCard";
import ManageLoanCard from "@/components/shared/ManageLoanCard";
import ManageLeverageCard from "@/components/shared/ManageLeverageCard";
import ManageInfoCard from "@/components/shared/ManageInfoCard";

//Icons
import InfoIcon from "@/components/icons/InfoIcon";

//Morpho constants & contracts
import {  marketParamsWethUsdc,  morphoAddress, morphoLeverageAddress } from "@/constants";

// lib
import { roundTo, roundDown, minLeverageFactor, expectedLoanCollatAfterLeverage, deriveLeverage, expectedLoanCollatAfterDeleverage } from "@/lib/helper";


const ManagePosition = ({ refetchCollateral, refetchLoan, refetchLeverage, collateral, loan, leverage, p }) => {

    const { address } = useAccount();
    const { toast } = useToast()
    const [projectedCollateral, setProjectedCollateral] = useState(0);
    const [projectedLoan, setProjectedLoan] = useState(0);
    const [projectedLeverage, setProjectedLeverage] = useState(undefined);
    const [activeTabParent, setActiveTabParent] = useState("collateral");
    const [activeTabChild, setActiveTabChild] = useState("supply");
    const [fees, setFees] = useState(undefined);
    const loopingFees = 0.001;

    //collateral tab
    const [cursorLeverage, setCursorLeverage] = useState(1);
    const [isCursorLeverageSet, setIsCursorLeverageSet] = useState(false);
    const [slippage, setSlippage] = useState(300);
    const [minLeverage, setMinLeverage] = useState(1);
    const [amount, setAmount] = useState("");
    const [withdraw, setWithdraw] = useState("");
    const [isNotLeverage, setIsNotLeverage] = useState(false);
    //Loan tab
    const [repay, setRepay] = useState("");
    const [borrow, setBorrow] = useState("");

    //Leverage adjustement tab
    const [cursorAdjustLeverage, setCursorAdjustLeverage] = useState(1);
    const [slippageAdjustLeverage, setSlippageAdjustLeverage] = useState(300);

    //--------------------------------
    //Fees
    useEffect(() => {
        console.log("amount", amount);
        if (amount == "" || amount == 0 || isNotLeverage){
            setFees(0);
        }
        else if (amount){
            const fees = amount * loopingFees;
            setFees(fees);
            console.log("fees", fees);
        }

    }, [amount, isNotLeverage]);

    //--------------------------------
    //Authorization
    const { data: isAuthorized, refetch: refetchIsAuthorized } = useReadContract({
        address: morphoAddress,
        abi: morphoAbi,
        functionName: "isAuthorized",
        args: [address, morphoLeverageAddress],
        account: address
    });
    const handleAuthorizationClick = async () => {
        if (isAuthorized) {
            revokeLooping({
                address: morphoAddress,
                abi: morphoAbi,
                functionName: "setAuthorization",
                args: [morphoLeverageAddress, false]
            });
        } else {
            authorizeLooping({
                address: morphoAddress,
                abi: morphoAbi,
                functionName: "setAuthorization",
                args: [morphoLeverageAddress, true],
            });
        }
    }
    const { data: hashAuthorize, isPending: isAuthorizing, writeContract: authorizeLooping } = useWriteContract();
    const { data: hashRevoke, isPending: isRevoking, writeContract: revokeLooping } = useWriteContract();
    const { isSuccess: isSuccessAuthorize } = useWaitForTransactionReceipt({ hash: hashAuthorize });
    const { isSuccess: isSuccessRevoke } = useWaitForTransactionReceipt({ hash: hashRevoke });

    useEffect(() => {
        if (isSuccessAuthorize) {
            refetchIsAuthorized();
            toast({
                title: "Authorization Successful",
                description: `Transaction hash: ${hashAuthorize}`,
            });
        }
        else if (isSuccessRevoke) {
            refetchIsAuthorized();
            toast({
                title: "Authorization Revoked",
                description: `Transaction hash: ${hashRevoke}`,
            });
        }
    }, [isSuccessAuthorize, isSuccessRevoke]);

    //--------------------------------
    //Close Position
    const handleClosePositionClick = async () => {
        closePosition({
            address: morphoLeverageAddress,
            abi: morphoLeverageAbi,
            functionName: "deLeveragedPosition",
            args: [marketParamsWethUsdc, { leverageFactor: 100, swapSlippageBps: slippage, swapFeeBps: 30 }, true],
            account: address,
        });
    }
    const { data: hashClosing, isPending: isClosing, writeContract: closePosition } = useWriteContract();
    const { isSuccess: isSuccessClosing, isError: isErrorClosing } = useWaitForTransactionReceipt({ hash: hashClosing });

    useEffect(() => {
        if (isSuccessClosing) {
            refetchCollateral();
            refetchLoan();
            refetchLeverage();
            setMinLeverage(1);
            setCursorLeverage(roundTo((maxLeverage - 1) / 2 + 1, 2))
            toast({
                title: "Withdrawal Successful",
                description: `Transaction hash: ${hashClosing}`,
            });
        }
    }, [isSuccessClosing]);

    //--------------------------------
    //Leverage
    //max leverage
    const maxLeverage = roundDown(1 / (1 - Number(formatUnits(marketParamsWethUsdc.lltv, 18))), 2);
    //Update min leverage
    useEffect(() => {
        if (collateral && loan) {
            setMinLeverage(minLeverageFactor(collateral, loan, parseEther(amount), 30, slippage, p, loopingFees));
        }
    }, [collateral, loan, amount, slippage]);

    //Initial cursor leverage
    useEffect(() => {
        if (minLeverage && minLeverage != 1 && maxLeverage ) {
            setCursorLeverage(roundTo((maxLeverage - minLeverage) / 2 + minLeverage, 2));
            setIsCursorLeverageSet(true);
        }
        else if (minLeverage == 1 && !isCursorLeverageSet){
            setCursorLeverage(roundTo((maxLeverage - 1) / 2 + 1, 2));
            setIsCursorLeverageSet(true);
        }
    }, [minLeverage, maxLeverage, isCursorLeverageSet]);

    //--------------------------------
    //Projected Position
    useEffect(() => {
        if (activeTabParent == "collateral" && activeTabChild == "supply") {
            if (amount == "") {
                setProjectedCollateral(undefined);
                setProjectedLoan(undefined);
                setProjectedLeverage(undefined);
            }
            else if (collateral !== undefined && loan !== undefined && p !== undefined && slippage && amount && cursorLeverage && isNotLeverage === false) {
                const [projectedCollateral, projectedLoan] = expectedLoanCollatAfterLeverage(collateral, loan, amount, cursorLeverage, p, 30, slippage, loopingFees);
                setProjectedCollateral(projectedCollateral);
                setProjectedLoan(projectedLoan);
                setProjectedLeverage(cursorLeverage);
            }
            else if (collateral !== undefined && loan !== undefined && p !== undefined && slippage && amount && isNotLeverage === true) {
                const projectedCollateral = Number(formatEther(collateral)) + Number(amount);
                const projectedLoan = Number(formatUnits(loan, 6));
                const projectedLeverage = deriveLeverage(projectedCollateral, projectedLoan, p);
                setProjectedCollateral(projectedCollateral);
                setProjectedLoan(projectedLoan);
                setProjectedLeverage(projectedLeverage);
            }
        }
        else if (activeTabParent == "collateral" && activeTabChild == "withdraw") {
            if (withdraw == "") {
                setProjectedCollateral(undefined);
                setProjectedLoan(undefined);
                setProjectedLeverage(undefined);
            }
            else if (collateral !== undefined && loan !== undefined && p !== undefined && withdraw !== undefined) {
                let projectedCollateral = Number(formatEther(collateral)) - Number(withdraw);
                let projectedLoan = Number(formatUnits(loan, 6));
                let projectedLeverage = deriveLeverage(projectedCollateral, projectedLoan, p);
                if (projectedCollateral < 0) {
                projectedCollateral = 0;
                projectedLeverage = undefined;
                }
                setProjectedCollateral(projectedCollateral);
                setProjectedLoan(projectedLoan);
                setProjectedLeverage(projectedLeverage);
            }
        }
        else if (activeTabParent == "loan" && activeTabChild == "borrow") {
            if (borrow == "") {
                setProjectedCollateral(undefined);
                setProjectedLoan(undefined);
                setProjectedLeverage(undefined);
            }
            else if (collateral !== undefined && loan !== undefined && p !== undefined && borrow) {
                let projectedCollateral = Number(formatEther(collateral));
                let projectedLoan = Number(formatUnits(loan, 6)) + Number(borrow);
                let projectedLeverage = deriveLeverage(projectedCollateral, projectedLoan, p);
                if(projectedLeverage > maxLeverage || projectedLeverage < 1) {
                    projectedLeverage = undefined;
                    projectedLoan = undefined;
                }
                setProjectedCollateral(projectedCollateral);
                setProjectedLoan(projectedLoan);
                setProjectedLeverage(projectedLeverage);
            }
        }
        else if (activeTabParent == "loan" && activeTabChild == "repay") {
            if (repay == "") {
                setProjectedCollateral(undefined);
                setProjectedLoan(undefined);
                setProjectedLeverage(undefined);
            }
            else if (collateral !== undefined && loan !== undefined && p !== undefined && repay) {
                let projectedCollateral = Number(formatEther(collateral));
                let projectedLoan = Number(formatUnits(loan, 6)) - Number(repay);
                let projectedLeverage = deriveLeverage(projectedCollateral, projectedLoan, p);
                 if(projectedLoan < 0 ) {
                    projectedLoan = undefined;
                    projectedLeverage = undefined;
                }
                setProjectedCollateral(projectedCollateral);
                setProjectedLoan(projectedLoan);
                setProjectedLeverage(projectedLeverage);
            }
        }
        else if (activeTabParent == "leverage") {
            console.log("test")
            if(collateral !== undefined && loan !== undefined && p !== undefined && cursorAdjustLeverage && slippageAdjustLeverage && leverage) {
                console.log("test2")
                if(cursorAdjustLeverage > leverage) {
                    const [projectedCollateral, projectedLoan] = expectedLoanCollatAfterLeverage(collateral, loan, amount, cursorAdjustLeverage, p, 30, slippageAdjustLeverage, loopingFees);
                    setProjectedCollateral(projectedCollateral);
                    setProjectedLoan(projectedLoan);
                    setProjectedLeverage(cursorAdjustLeverage);                   
                }
                else if(cursorAdjustLeverage < leverage) {
                    const [projectedCollateral, projectedLoan] = expectedLoanCollatAfterDeleverage(collateral, loan, cursorAdjustLeverage, p, 30, slippageAdjustLeverage);
                    setProjectedCollateral(projectedCollateral);
                    setProjectedLoan(projectedLoan);
                    setProjectedLeverage(cursorAdjustLeverage);                   
                }
                else if (cursorAdjustLeverage == leverage) {
                    let projectedCollateral = Number(formatEther(collateral));
                    let projectedLoan = Number(formatUnits(loan, 6));
                    setProjectedCollateral(projectedCollateral);
                    setProjectedLoan(projectedLoan);
                    setProjectedLeverage(leverage);
                }
            }
        }
    }, [collateral, loan, p, slippage, amount, withdraw, borrow, repay, cursorLeverage, slippage, isNotLeverage, activeTabParent, activeTabChild, cursorAdjustLeverage, slippageAdjustLeverage]);


    //--------------------------------
    //Change parent tab
    const handleParentTabChange = (value) => {
        setActiveTabParent(value);
        // Define default child value
        if (value === "collateral") {
          setActiveTabChild("supply");
        } else if (value === "loan") {
          setActiveTabChild("repay");
        } else if (value === "leverage") {
          setActiveTabChild("");
        }
      };

  
    return (
        <div className="w-full bg-background flex flex-col items-center p-6">
            <div className="flex items-center justify-between w-full  mb-6">
                <div className="flex items-center space-x-8">
                    <h1 className="text-2xl font-medium text-foreground">Manage Your Position</h1>
                    <div className="flex items-center space-x-2">
                        {
                            isAuthorized ? (
                                <Button disabled={isRevoking} onClick={handleAuthorizationClick}>{isRevoking ? `Revoking...` : `Revoke Authorization`} </Button>
                            ) : (
                                <Button disabled={isAuthorizing} onClick={handleAuthorizationClick}>{isAuthorizing ? `Authorizing...` : `Authorize Looping`} </Button>
                            )
                        }
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger><InfoIcon size={20} /></TooltipTrigger>
                                <TooltipContent>
                                    <p>Looping needs your approval to handle your position on your behalf</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                </div>

                <Button className= "text-white bg-red-700" disabled={isClosing} onClick={handleClosePositionClick}>{isClosing ? `Closing...` : `Close Position`} </Button>
            </div>
            <div className="grid grid-cols-2 gap-6 w-full">
                <div>
                    <Tabs defaultValue="collateral" onValueChange={handleParentTabChange}>
                        <TabsList className="w-full grid grid-cols-3">
                            <TabsTrigger value="collateral">Collateral</TabsTrigger>
                            <TabsTrigger value="loan">Loan</TabsTrigger>
                            <TabsTrigger value="leverage">Leverage</TabsTrigger>
                        </TabsList>
                        <TabsContent value="collateral">
                            <ManageCollateralCard
                                refetchCollateral={refetchCollateral}
                                refetchLoan={refetchLoan}
                                refetchLeverage={refetchLeverage}
                                collateral={collateral}
                                loan={loan}
                                leverage={leverage}
                                p={p}
                                cursorLeverage={cursorLeverage}
                                setCursorLeverage={setCursorLeverage}
                                minLeverage={minLeverage}
                                maxLeverage={maxLeverage}
                                amount={amount}
                                setAmount={setAmount}
                                slippage={slippage}
                                setSlippage={setSlippage}
                                withdraw={withdraw}
                                setWithdraw={setWithdraw}
                                isNotLeverage={isNotLeverage}
                                setIsNotLeverage={setIsNotLeverage}
                                setActiveTabChild={setActiveTabChild}
                            />
                        </TabsContent>
                        <TabsContent value="loan">
                            <ManageLoanCard 
                                refetchLoan={refetchLoan}
                                refetchLeverage={refetchLeverage}
                                collateral={collateral}
                                loan={loan}
                                leverage={leverage}
                                p={p}
                                setActiveTabChild={setActiveTabChild}
                                repay={repay}
                                setRepay={setRepay}
                                borrow={borrow}
                                setBorrow={setBorrow}
                                maxLeverage={maxLeverage}
                            />
                        </TabsContent>
                        <TabsContent value="leverage">
                            <ManageLeverageCard 
                                cursorAdjustLeverage={cursorAdjustLeverage}
                                setCursorAdjustLeverage={setCursorAdjustLeverage}
                                slippageAdjustLeverage={slippageAdjustLeverage}
                                setSlippageAdjustLeverage={setSlippageAdjustLeverage}
                                leverage={leverage}
                                refetchCollateral={refetchCollateral}
                                refetchLoan={refetchLoan}
                                refetchLeverage={refetchLeverage}
                                maxLeverage={maxLeverage}
                            />
                        </TabsContent>
                    </Tabs>
                </div>
                <ManageInfoCard 
                collateral={collateral} 
                loan={loan} 
                leverage={leverage} 
                projectedCollateral={projectedCollateral}
                projectedLoan={projectedLoan}
                projectedLeverage={projectedLeverage}
                fees={fees}
                activeTabChild={activeTabChild}
                />
            </div>

        </div>
    )
}

export default ManagePosition