//ui
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

//hooks
import { useEffect } from "react";
import { useAccount } from "wagmi";
import { useToast } from "@/hooks/use-toast"
//constants
import morphoLeverageAbi from "@/constants/abi/morphoLeverage.json";
import { morphoLeverageAddress, marketParamsWethUsdc } from "@/constants";
//wagmi
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";

const ManageLeverageCard = ({
  cursorAdjustLeverage, 
  setCursorAdjustLeverage, 
  slippageAdjustLeverage, 
  setSlippageAdjustLeverage, 
  leverage,
  refetchCollateral,
  refetchLoan,
  refetchLeverage,
  maxLeverage
}) => {

  const { address } = useAccount();
  const { toast } = useToast();

  //--------------------------------
  //Handle leverage increase
  const { data: hashAdjust, isPending: isUpdating, writeContract: adjustLeverage } = useWriteContract();
  const { isSuccess: isSuccessAdjust } = useWaitForTransactionReceipt({ hash: hashAdjust });

  const handleAdjustLeverageClick = async () => {
    if(cursorAdjustLeverage > leverage){
      const _cursorAdjustLeverage = (cursorAdjustLeverage * 100).toFixed(0);
      adjustLeverage({
        address: morphoLeverageAddress,
        abi: morphoLeverageAbi,
        functionName: "leveragePosition",
        args: [{ leverageFactor: _cursorAdjustLeverage, swapSlippageBps: slippageAdjustLeverage, swapFeeBps: 30 }, 0, marketParamsWethUsdc],
        account: address,
      });
    }
    else if(cursorAdjustLeverage < leverage){
      const _cursorAdjustLeverage = (cursorAdjustLeverage * 100).toFixed(0);
      adjustLeverage({
        address: morphoLeverageAddress,
        abi: morphoLeverageAbi,
        functionName: "deLeveragedPosition",
        args: [marketParamsWethUsdc, { leverageFactor: _cursorAdjustLeverage, swapSlippageBps: slippageAdjustLeverage, swapFeeBps: 30 }, false],
        account: address,
      });
    }
  }

  useEffect(() => {
    if (isSuccessAdjust) {
        refetchCollateral();
        refetchLoan();
        refetchLeverage();
        toast({
            title: "Leverage Updated",
            description: `Transaction hash: ${hashAdjust}`,
        });
    }
}, [isSuccessAdjust]);

//set initial cursor leverage
useEffect(() => {
  if (maxLeverage) {
    setCursorAdjustLeverage(((maxLeverage - 1) / 2 + 1).toFixed(2));
  }
}, [maxLeverage]);


  return (
    <Card className="border bg-muted">
      <CardHeader className="pb-4">
        <CardTitle>Leverage</CardTitle>
      </CardHeader>
      <div className="line mx-4"></div>
      <CardContent className="flex flex-col gap-4 py-4">
        <div className="flex flex-col gap-2">
          <div className="flex justify-between">
            <Label className="text-muted-foreground">Leverage</Label>
            <p className="text-sm">{cursorAdjustLeverage}x</p>
          </div>
          <Slider value={[cursorAdjustLeverage]} onValueChange={(value) => { setCursorAdjustLeverage(value[0]); }} min={1} max={maxLeverage} step={0.01} className="custom-slider"/>
          <div className="flex justify-between">
            <p className="text-muted-foreground text-xs">Min - 1x</p>
            <p className="text-muted-foreground text-xs">Max - {maxLeverage}x</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-muted-foreground text-xs">Slippage Tolerance</Label>
          <Input type="number" placeholder="3%" value={slippageAdjustLeverage / 100} onChange={(e) => setSlippageAdjustLeverage(e.target.value * 100)} className="w-12 h-8 text-xs text-center" />
          <p className="text-muted-foreground text-xs">%</p>
        </div>
      </CardContent>
      <div className="line  mx-4"></div>
      <CardFooter className="pt-4 flex gap-4">
        <Button className="w-full" disabled={isUpdating} onClick={handleAdjustLeverageClick}>{isUpdating ? `Updating...` : `Update Leverage`} </Button>
      </CardFooter>
    </Card>
  )
}



export default ManageLeverageCard