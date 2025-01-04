// Ui components
import { Card, CardContent,  CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";

// react
import {  useEffect } from "react";

// wagmi
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi"

// viem
import { parseEther } from "viem";

// constants
import { marketParamsWethUsdc, morphoLeverageAddress, wethAddress, morphoAddress} from "@/constants";
import morphoLeverageAbi from "@/constants/abi/morphoLeverage.json";
import morphoAbi from "@/constants/abi/morpho.json";
import wethAbi from "@/constants/abi/weth.json";

// lib
import { roundTo,  maxWithdrawableCollateral } from "@/lib/helper";

const ManageCollateralCard = ({
  refetchCollateral,
  refetchLoan,
  refetchLeverage,
  collateral,
  loan,
  leverage,
  p,
  cursorLeverage,
  setCursorLeverage,
  minLeverage,
  maxLeverage,
  amount,
  setAmount,
  slippage,
  setSlippage,
  withdraw,
  setWithdraw,
  isNotLeverage,
  setIsNotLeverage,
  setActiveTabChild
}) => {

  const { address } = useAccount();
  const { toast } = useToast();
  //check approval
  const { data: approval, refetch: refetchApproval } = useReadContract({
    address: wethAddress,
    abi: wethAbi,
    functionName: "allowance",
    args: [address, morphoLeverageAddress],
    account: address
  });

  //handle approval
  const { data: hashApprove, isPending: isApproving, writeContract: approve } = useWriteContract();
  const handleApproveClick = async () => {
    approve({
      address: wethAddress,
      abi: wethAbi,
      functionName: "approve",
      args: [morphoLeverageAddress, parseEther(amount)],
    });
  }
  const { isSuccess: isSuccessApprove } = useWaitForTransactionReceipt({ hash: hashApprove });
  useEffect(() => {
    if (isSuccessApprove) {
      refetchApproval();
      toast({
        title: "Approval Successful",
        description: `Transaction hash: ${hashApprove}`,
      });
    }
  }, [isSuccessApprove]);

  //handle supply with Leverage
  const { data: hashSupply, isPending: isSupplying, writeContract: supplyWithLeverage } = useWriteContract();
  const handleSupplyWithLeverageClick = async () => {
    const supplyLeverage = roundTo(cursorLeverage * 100, 0);
    supplyWithLeverage({
      address: morphoLeverageAddress,
      abi: morphoLeverageAbi,
      functionName: "leveragePosition",
      args: [{ leverageFactor: supplyLeverage, swapSlippageBps: slippage, swapFeeBps: 30 }, parseEther(amount), marketParamsWethUsdc],
    });
  }
  const { isSuccess: isSuccessSupply } = useWaitForTransactionReceipt({ hash: hashSupply });
  useEffect(() => {
    if (isSuccessSupply) {
      refetchCollateral();
      refetchLoan();
      refetchLeverage();
      refetchApproval();
      toast({
        title: "Supply Successful",
        description: `Transaction hash: ${hashSupply}`,
      });
    }
  }, [isSuccessSupply]);


  //handle supply without Leverage
  const { data: hashSupplyWithoutLeverage, isPending: isSupplyingWithoutLeverage, writeContract: supplyWithoutLeverage } = useWriteContract();
  const handleSupplyWithoutLeverageClick = async () => {
    supplyWithoutLeverage({
      address: morphoLeverageAddress,
      abi: morphoLeverageAbi,
      functionName: "supplyCollateral",
      args: [marketParamsWethUsdc, parseEther(amount)],
      account: address
    });
  }
  const { isSuccess: isSuccessSupplyWithoutLeverage } = useWaitForTransactionReceipt({ hash: hashSupplyWithoutLeverage });
  useEffect(() => {
    if (isSuccessSupplyWithoutLeverage) {
      refetchCollateral();
      refetchApproval();
      refetchLeverage();
      toast({
        title: "Supply Successful",
        description: `Transaction hash: ${hashSupplyWithoutLeverage}`,
      });
    }
  }, [isSuccessSupplyWithoutLeverage]);

  //handle withdraw
  const { data: hashWithdraw, isPending: isWithdrawing, writeContract: withdrawCollateral } = useWriteContract();
  const handleWithdrawClick = async () => {
    withdrawCollateral({
      address: morphoAddress,
      abi: morphoAbi,
      functionName: "withdrawCollateral",
      args: [marketParamsWethUsdc, parseEther(withdraw), address, address],
      account: address
    });
  }
  const { isSuccess: isSuccessWithdraw } = useWaitForTransactionReceipt({ hash: hashWithdraw });
  useEffect(() => {
    if (isSuccessWithdraw) {
      refetchCollateral();
      refetchLeverage();
      toast({
        title: "Withdraw Successful",
        description: `Transaction hash: ${hashWithdraw}`,
      });
    }
  }, [isSuccessWithdraw]);

  return (
    <Tabs defaultValue="supply" onValueChange={(value) => setActiveTabChild(value)}>

      {/* Supply */}
      <TabsContent value="supply">
        <Card className="border bg-muted">
          <CardHeader className="pb-4">
            <CardTitle>Collateral</CardTitle>
          </CardHeader>
          <div className="line mx-4"></div>
          <CardContent className="flex flex-col gap-4 py-4">
            <Input type="number" placeholder="Amount to Supply" value={amount} onChange={(e) => setAmount(e.target.value)} />
            <div className="flex flex-col gap-2">
              <div className="flex justify-between">
                <Label className="text-muted-foreground">Leverage</Label>
                <p className="text-sm">{cursorLeverage}x</p>
              </div>
              <Slider value={[cursorLeverage]} onValueChange={(value) => { setCursorLeverage(value[0]); }} min={minLeverage} max={maxLeverage} step={0.01} className="custom-slider" />
              <div className="flex justify-between">
                <p className="text-muted-foreground text-xs">Min - {minLeverage}x</p>
                <p className="text-muted-foreground text-xs">Max - {maxLeverage}x</p>
              </div>
            </div>
            <div className="flex justify-between items-center gap-4">
  <p className="text-muted-foreground text-xs">
    Swap Fee - 0.3%
  </p>
  <div className="flex items-center gap-2">
    <Label className="text-muted-foreground text-xs">Slippage Tolerance</Label>
    <Input 
      type="number" 
      placeholder="3%" 
      value={slippage / 100} 
      onChange={(e) => setSlippage(e.target.value * 100)} 
      className="w-12 h-8 text-xs text-center" 
    />
    <p className="text-muted-foreground text-xs">%</p>
  </div>
</div>
            <div className="flex items-center gap-2">
              <p className="text-muted-foreground text-xs">Supply without Leverage</p>
              <Checkbox checked={isNotLeverage} onCheckedChange={setIsNotLeverage} />
            </div>
          </CardContent>
          <div className="line  mx-4"></div>
          <CardFooter className="pt-4 flex gap-4">
            <Button className="w-full" disabled={isApproving} onClick={handleApproveClick}>{isApproving ? `Approving...` : `Approve`} </Button>
            {isNotLeverage ? (
              <Button
                className="w-full"
                disabled={isSupplyingWithoutLeverage || BigInt(approval || 0) < BigInt(parseEther(amount || "0"))}
                onClick={handleSupplyWithoutLeverageClick}
              >
                {isSupplyingWithoutLeverage ? `Supplying...` : `Supply`}
              </Button>
            ) : (
              <Button
                className="w-full"
                disabled={isSupplying || BigInt(approval || 0) < BigInt(parseEther(amount || "0"))}
                onClick={handleSupplyWithLeverageClick}
              >
                {isSupplying ? `Supplying...` : `Supply`}
              </Button>
            )}
          </CardFooter>
        </Card>
      </TabsContent>

      {/* Withdraw */}
      <TabsContent value="withdraw">
        <Card className="border bg-muted">
          <CardHeader className="pb-4">
            <CardTitle>Collateral</CardTitle>
          </CardHeader>
          <div className="line mx-4"></div>
          <CardContent className="flex flex-col gap-4 py-4">
            <p className="text-sm">{maxWithdrawableCollateral(collateral, loan, maxLeverage, p)} WETH are available to withdraw</p>
            <Input type="number" placeholder="Amount to Withdraw" value={withdraw} onChange={(e) => setWithdraw(e.target.value)} />
            <p className="text-sm cursor-pointer hover:underline max-w-[90px]" 
            onClick={() => setWithdraw(maxWithdrawableCollateral(collateral, loan, maxLeverage, p).toString())}>
              Set Max
            </p>
          </CardContent>
          <div className="line  mx-4"></div>
          <CardFooter className="pt-4">
            <Button className="w-full" disabled={isWithdrawing} onClick={handleWithdrawClick}>{isWithdrawing ? `Withdrawing...` : `Withdraw`} </Button>
          </CardFooter>
        </Card>
      </TabsContent>
      <TabsList className="w-full grid grid-cols-2 mt-2 ">
        <TabsTrigger value="supply">Supply</TabsTrigger>
        <TabsTrigger value="withdraw">Withdraw</TabsTrigger>
      </TabsList>
    </Tabs>

  );
};

export default ManageCollateralCard;
