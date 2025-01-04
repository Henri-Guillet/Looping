// Ui components
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
// react
import { useEffect } from "react";

// wagmi
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi"

// viem
import { formatUnits, parseUnits } from "viem";

// constants
import { marketParamsWethUsdc, morphoLeverageAddress, wethAddress, morphoAddress, usdcAddress } from "@/constants";
import morphoLeverageAbi from "@/constants/abi/morphoLeverage.json";
import morphoAbi from "@/constants/abi/morpho.json";
import wethAbi from "@/constants/abi/weth.json";
import erc20Abi from "@/constants/abi/erc20.json";
// lib
import { maxBorrowableLoan } from "@/lib/helper";

const ManageLoanCard = ({
  refetchLoan,
  refetchLeverage,
  collateral,
  loan,
  leverage,
  maxLeverage,
  p,
  setActiveTabChild,
  repay,
  setRepay,
  borrow,
  setBorrow
}) => {

  const { address } = useAccount();
  const { toast } = useToast();
  //check usdcapproval
  const { data: approval, refetch: refetchApproval } = useReadContract({
    address: usdcAddress,
    abi: erc20Abi,
    functionName: "allowance",
    args: [address, morphoLeverageAddress],
    account: address
  });

  //handle usdc approval
  const { data: hashApprove, isPending: isApproving, writeContract: approve } = useWriteContract();
  const handleApproveClick = async () => {
    approve({
      address: usdcAddress,
      abi: erc20Abi,
      functionName: "approve",
      args: [morphoLeverageAddress, parseUnits(repay, 6)],
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


  //handle repay
  const { data: hashRepay, isPending: isRepaying, writeContract: repayLoan } = useWriteContract();
  const handleRepayClick = async () => {
    repayLoan({
      address: morphoLeverageAddress,
      abi: morphoLeverageAbi,
      functionName: "repayAmount",
      args: [marketParamsWethUsdc, parseUnits(repay, 6)],
      account: address
    });
  }
  const { isSuccess: isSuccessRepay } = useWaitForTransactionReceipt({ hash: hashRepay });
  useEffect(() => {
    if (isSuccessRepay) {
      refetchLoan();
      refetchApproval();
      refetchLoanBalance();
      refetchLeverage();
      toast({
        title: "Repay Successful",
        description: `Transaction hash: ${hashRepay}`,
      });
    }
  }, [isSuccessRepay]);

  //handle borrow
  const { data: hashBorrow, isPending: isBorrowing, writeContract: borrowLoan } = useWriteContract();
  const handleBorrowClick = async () => {
    borrowLoan({
      address: morphoAddress,
      abi: morphoAbi,
      functionName: "borrow",
      args: [marketParamsWethUsdc, parseUnits(borrow, 6), 0, address, address],
      account: address
    });
  }
  const { isSuccess: isSuccessBorrow } = useWaitForTransactionReceipt({ hash: hashBorrow });
  useEffect(() => {
    if (isSuccessBorrow) {
      refetchLoan();
      refetchLoanBalance();
      refetchLeverage();
      toast({
        title: "Borrow Successful",
        description: `Transaction hash: ${hashBorrow}`,
      });
    }
  }, [isSuccessBorrow]);

  //available loan balance
  const { data: loanBalance, refetch: refetchLoanBalance } = useReadContract({
    address: usdcAddress,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [address],
    account: address
  });

console.log("repay", repay);
console.log("approval", approval);

  return (
    <Tabs defaultValue="repay" onValueChange={(value) => setActiveTabChild(value)}>

      {/* Supply */}
      <TabsContent value="repay">
        <Card className="border bg-muted">
          <CardHeader className="pb-4">
            <CardTitle>Loan</CardTitle>
          </CardHeader>
          <div className="line mx-4"></div>
          <CardContent className="flex flex-col gap-4 py-4">
            <p className="text-sm" >{loanBalance != undefined ? `${parseFloat(formatUnits(loanBalance, 6)).toFixed(2)} USDC are available in your balance` : "Loading..."}</p>
            <Input type="number" placeholder="Amount to Repay" value={repay} onChange={(e) => setRepay(e.target.value)} />
            <p className="text-sm cursor-pointer hover:underline max-w-[90px]"
              onClick={() => {
                if (loanBalance !== undefined && loan !== undefined) {
                  setRepay(Math.min(Number(formatUnits(loanBalance, 6)), Number(formatUnits(loan, 6))).toString());
                }
              }}>
              Set Max
            </p>


          </CardContent>
          <div className="line  mx-4"></div>
          <CardFooter className="pt-4 flex gap-4">
            <Button className="w-full" disabled={isApproving} onClick={handleApproveClick}>{isApproving ? `Approving...` : `Approve`} </Button>
            <Button className="w-full" disabled={isRepaying || BigInt(approval || 0) < BigInt(parseUnits(repay || "0", 6))} onClick={handleRepayClick}>
              {isRepaying ? `Repaying...` : `Repay`}
            </Button>
          </CardFooter>
        </Card>
      </TabsContent>

      {/* Withdraw */}
      <TabsContent value="borrow">
        <Card className="border bg-muted">
          <CardHeader className="pb-4">
            <CardTitle>Loan</CardTitle>
          </CardHeader>
          <div className="line mx-4"></div>
          <CardContent className="flex flex-col gap-4 py-4">
            <p className="text-sm">{maxBorrowableLoan(collateral, loan, maxLeverage, p)} USDC are available to borrow</p>
            <Input type="number" placeholder="Amount to Borrow" value={borrow} onChange={(e) => setBorrow(e.target.value)} />
            <p className="text-sm cursor-pointer hover:underline max-w-[90px]"
              onClick={() => setBorrow(maxBorrowableLoan(collateral, loan, maxLeverage, p).toString())}>
              Set Max
            </p>
          </CardContent>
          <div className="line  mx-4"></div>
          <CardFooter className="pt-4">
            <Button className="w-full" disabled={isBorrowing} onClick={handleBorrowClick}>{isBorrowing ? `Borrowing...` : `Borrow`} </Button>
          </CardFooter>
        </Card>
      </TabsContent>
      <TabsList className="w-full grid grid-cols-2 mt-2 ">
        <TabsTrigger value="repay">Repay</TabsTrigger>
        <TabsTrigger value="borrow">Borrow</TabsTrigger>
      </TabsList>
    </Tabs>

  );
};

export default ManageLoanCard;