import { formatEther, formatUnits } from "viem";

export function roundTo(value, decimals) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function roundDown(value, decimals) {
  const factor = 10 ** decimals;
  return Math.floor(value * factor) / factor;
}


export function roundUp(value, decimals) {
  const factor = 10 ** decimals;
  return Math.ceil(value * factor) / factor;
}

export function minLeverageFactor( initialCollateralOnMorpho, initialLoanOnMorpho, amountToDeposit, swapFeeBps, swapSlippageBps, price, loopingFees = 0.001) {
  initialCollateralOnMorpho = Number(formatEther(initialCollateralOnMorpho));
  initialLoanOnMorpho = Number(formatUnits(initialLoanOnMorpho, 6));
  amountToDeposit = Number(formatEther(amountToDeposit));
  const c_0 = initialCollateralOnMorpho - initialLoanOnMorpho / price + amountToDeposit * (1 - loopingFees);
  const swapFee = swapFeeBps / 10000;
  const swapSlippage = swapSlippageBps / 10000;
  const f = 1 - (1 - swapFee) * (1 - swapSlippage);
  const numerator = initialLoanOnMorpho * (1 - f) + c_0 * price;
  const denominator = c_0 * price - initialLoanOnMorpho * f;
  const minLeverageFactor = numerator / denominator;
  return roundUp(minLeverageFactor, 1);
}

export function maxWithdrawableCollateral(currentCollateral, currentLoan, maxLeverage, price) {
  // cmin = Lmax * loan / ( p (Lmax-1))
  if (currentCollateral == undefined || currentLoan == undefined || maxLeverage == undefined || price == undefined) {
    return undefined;
  }
  else if (currentLoan === 0n) {
    return Number(formatEther(currentCollateral));
  }
  else {
    currentCollateral = Number(formatEther(currentCollateral));
    currentLoan = Number(formatUnits(currentLoan, 6));
    const minimumCollateral = (maxLeverage * currentLoan ) / (price * ( maxLeverage - 1));
    const withdrawableCollateral = currentCollateral - minimumCollateral;
    return Math.max(roundTo(withdrawableCollateral, 6), 0);
  }
}

export function maxBorrowableLoan(currentCollateral, currentLoan, maxLeverage, price) {
  // loan_max= c * p * ( (Lmax-1) / Lmax)
  if (currentCollateral == undefined || currentLoan == undefined || maxLeverage == undefined || price == undefined) {
    return undefined;
  }
  else if (currentCollateral === 0n) {
    return 0;
  }
  else {
    currentCollateral = Number(formatEther(currentCollateral));
    currentLoan = Number(formatUnits(currentLoan, 6));
    const maxLoan = currentCollateral * price * (maxLeverage - 1) / maxLeverage;
    const borrowableLoan = maxLoan - currentLoan;
    return Math.max(roundTo(borrowableLoan, 2), 0);
  }
}

export function expectedLoanCollatAfterLeverage(initialCollateralOnMorpho, initialLoanOnMorpho, amountToDeposit, leverage, p, swapFeeBps, swapSlippageBps, loopingFees){
  //expected loan and collateral on morpho
  // l_final = c_ 0 * p (leverage - 1) / (1 + f * (leverage -1))
  // c_final = c_0 + l_final ( 1- f ) / p

  initialCollateralOnMorpho = Number(formatEther(initialCollateralOnMorpho));
  initialLoanOnMorpho = Number(formatUnits(initialLoanOnMorpho, 6));
  let c_0 = initialCollateralOnMorpho - initialLoanOnMorpho/p + amountToDeposit * (1 - loopingFees);
  let swapFee = swapFeeBps / 10000;
  let swapSlippage = swapSlippageBps / 10000;
  let f = (1 - (1 - swapFee) * (1 - swapSlippage));
  let l_final = c_0 * p * (leverage - 1) / (1 - f + leverage * f);
  let c_final = c_0 + l_final * (1-f) / p;
  return [c_final, l_final];
}

export function expectedLoanCollatAfterDeleverage(initialCollateralOnMorpho, initialLoanOnMorpho, leverage, p, swapFeeBps, swapSlippageBps){
  // x = c_0 * p - Ltarget * (c_0 * p - Lini) / (p * (1 - Ltarget * f))
  initialCollateralOnMorpho = Number(formatEther(initialCollateralOnMorpho));
  initialLoanOnMorpho = Number(formatUnits(initialLoanOnMorpho, 6));
  let c_0 = initialCollateralOnMorpho ;
  let swapFee = swapFeeBps / 10000;
  let swapSlippage = swapSlippageBps / 10000;
  let f = (1 - (1 - swapFee) * (1 - swapSlippage));
  let x = (c_0 * p - leverage * (c_0 * p - initialLoanOnMorpho)) / (p * (1 - leverage * f));
  let c_final = initialCollateralOnMorpho - x;
  let l_final = initialLoanOnMorpho - x * p * ( 1 - f);
  return [c_final, l_final];
}


export function deriveLeverage(collateral, loan, price) {
  const leverage = collateral * price / (collateral * price - loan);
  return roundTo(leverage,2);
}