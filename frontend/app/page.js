'use client'
import { useAccount } from "wagmi";
import NotConnected from "@/components/shared/NotConnected";
import MorphoLeverage from "@/components/shared/MorphoLeverage";

export default function Home() {

  const {isConnected} = useAccount()

  return(
    <>
    <MorphoLeverage/>
    </>
  )
}
