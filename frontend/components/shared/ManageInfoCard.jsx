import { Card, CardContent,  CardHeader, CardTitle } from "@/components/ui/card"
import { formatEther, formatUnits } from "viem";

const ManageInfoCard = ({collateral, loan, leverage, projectedCollateral, projectedLoan, projectedLeverage, fees, activeTabChild}) => {
  return (
    <Card className="border bg-muted">
      <CardHeader>
        <CardTitle>Current Position Information</CardTitle>
      </CardHeader>
      <div className="line mx-4"></div>
      <CardContent className="flex flex-col gap-4 py-4">
        <div className="flex justify-between">
          <p className="text-muted-foreground">Collateral</p>
          <p>{collateral !== undefined ? parseFloat(formatEther(collateral)).toFixed(4) : "N/A"} WETH</p>
        </div>
        <div className="flex justify-between">
          <p className="text-muted-foreground">Loan</p>
          {loan !== undefined ? parseFloat(formatUnits(loan, 6)).toFixed(2) : "N/A"} USDC
        </div>
        <div className="flex justify-between">
          <p className="text-muted-foreground">Leverage</p>
          <p>{leverage ? leverage : "N/A"}x</p>
        </div>
      </CardContent>
      <CardHeader>
        <CardTitle>Projected Position Information</CardTitle>
      </CardHeader>
      <div className="line mx-4"></div>
      <CardContent className="flex flex-col gap-4 py-4">
        <div className="flex justify-between">
          <p className="text-muted-foreground">Collateral</p>
          <p>{projectedCollateral !== undefined ? projectedCollateral.toFixed(4) : "N/A"} WETH</p>
        </div>
        <div className="flex justify-between">
          <p className="text-muted-foreground">Loan</p>
          {projectedLoan !== undefined ? projectedLoan.toFixed(2) : "N/A"} USDC
        </div>
        <div className="flex justify-between">
          <p className="text-muted-foreground">Leverage</p>
          {projectedLeverage !== undefined ? projectedLeverage : "N/A"}x
        </div>
        {activeTabChild != undefined && activeTabChild == "supply" ? <div className="flex justify-between">
          <p className="text-muted-foreground">Fees</p>
          {fees} WETH
        </div> : null}
      </CardContent>
    </Card>
  )
}

export default ManageInfoCard