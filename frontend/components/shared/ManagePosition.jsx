'use client';

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from "@/components/ui/tooltip"
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi"
import { formatEther, formatUnits } from "viem";
import StatOverviewCard from "@/components/shared/StatOverviewCard";

//Abi
import morphoBasicsAbi from "@/constants/abi/morphoBasics.json";
import morphoAbi from "@/constants/abi/morpho.json";
import morphoLeverageAbi from "@/constants/abi/morphoLeverage.json";

//Cards
import ManageCollateralCard from "@/components/shared/ManageCollateralCard";
import ManageInfoCard from "@/components/shared/ManageInfoCard";

//Icons
import InfoIcon from "@/components/icons/InfoIcon";

//Morpho constants & contracts
import { marketIdWethUsdc, marketParamsWethUsdc, morphoBasicsAddress, morphoAddress, morphoLeverageAddress } from "@/constants";
import { writeContract } from "viem/actions";


const ManagePosition = ({ refetchCollateral, refetchBorrow, refetchLeverage }) => {

    const { address } = useAccount();
    const { data: isAuthorized, refetch: refetchIsAuthorized } = useReadContract({
        address: morphoAddress,
        abi: morphoAbi,
        functionName: "isAuthorized",
        args: [address, morphoLeverageAddress],      
    });

    const { data: hashAuthorize, isPending: isAuthorizing, writeContract: authorizeLooping } = useWriteContract();
    const { data: hashRevoke, isPending: isRevoking, writeContract: revokeLooping } = useWriteContract();
    const { data: hashClosing, isPending: isClosing, writeContract: closePosition } = useWriteContract();

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

    const handleClosePositionClick = async () => {
        closePosition({
            address: morphoLeverageAddress,
            abi: morphoLeverageAbi,
            functionName: "deLeveragedPosition",
            args: [marketParamsWethUsdc, {leverageFactor:100, swapSlippageBps: 300, swapFeeBps: 30}, true],      
        });
    }

    const { isSuccess: isSuccessAuthorize } = useWaitForTransactionReceipt({ hash: hashAuthorize});
    const { isSuccess: isSuccessRevoke } = useWaitForTransactionReceipt({ hash: hashRevoke});
    const { isSuccess: isSuccessClosing } = useWaitForTransactionReceipt({ hash: hashClosing});

    useEffect(() => {
        if (isSuccessAuthorize || isSuccessRevoke) {
            refetchIsAuthorized();
        }
    }, [isSuccessAuthorize, isSuccessRevoke]);

    useEffect(() => {
        if (isSuccessClosing) {
            refetchCollateral();
            refetchBorrow();
            refetchLeverage();
        }
    }, [isSuccessClosing]);



    // const { data: hashClosing, isPending: isClosing, errorClosing, writeContract: closePosition } = useWriteContract({
    //     address: morphoLeverageAddress,
    //     abi: morphoLeverageAbi,
    //     functionName: "deLeveragedPosition",
    //     args: [marketParamsWethUsdc, {leverageFactor:100, swapSlippageBps: 300, swapFeeBps: 30}, true],       
    // })

    // const { isSuccess: isSuccessAuthorize, isSuccess: isSuccessRevoke, isSuccess: isSuccessClosing } = useWaitForTransactionReceipt({ hashAuthorize, hashRevoke, hashClosing });

    // console.log("isAuthorized", isAuthorized);


    // const closePosition = async () => {
    //     writeContract({
    //         address: morphoAddress,
    //         abi: morphoAbi,
    //         functionName: "setAuthorization",
    //         args: [morphoLeverageAddress, true],      
    //     });

    //     if (isSuccess) {
    //         writeContract({
    //             address: morphoLeverageAddress,
    //             abi: morphoLeverageAbi,
    //             functionName: "deLeveragedPosition",
    //             args: [marketParamsWethUsdc, {leverageFactor:100, swapSlippageBps: 300, swapFeeBps: 30}, true],      
    //         });
    //     }
    // }


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
                        <TooltipTrigger><InfoIcon size={20}/></TooltipTrigger>
                        <TooltipContent>
                        <p>Looping needs your approval to handle your position on your behalf</p>
                        </TooltipContent>
                    </Tooltip>
                    </TooltipProvider>
                    </div>
                </div>
                
                <Button disabled={isClosing} onClick={handleClosePositionClick}>{isClosing ? `Closing...` : `Close Position`} </Button>
            </div>
            <div className="grid grid-cols-2 gap-6 w-full">             
                <ManageCollateralCard />
                <ManageInfoCard />
            </div>
            
        </div>
    )
}

export default ManagePosition