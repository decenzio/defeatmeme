"use client";

import { useMemo, useState } from "react";
import { type Hex, encodeFunctionData, getAddress } from "viem";
import { useAccount, useChainId, usePublicClient, useReadContract, useWalletClient } from "wagmi";
import deployedContracts from "~~/contracts/deployedContracts";
import { useDeployedContractInfo } from "~~/hooks/scaffold-eth";

const ENV_CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID!);

// helpers to load addr/abi with robust fallbacks
function getContractInfo(
  name: "MinimalForwarder" | "GameRegistrar" | "PlanetNFT",
  hookData: { address?: `0x${string}`; abi?: any } | undefined,
) {
  const fromHook = hookData?.address && hookData?.abi ? hookData : null;

  // try NEXT_PUBLIC_*
  const envAddrMap: Record<string, string | undefined> = {
    MinimalForwarder: process.env.NEXT_PUBLIC_FORWARDER_ADDRESS,
    GameRegistrar: process.env.NEXT_PUBLIC_REGISTRAR_ADDRESS,
    PlanetNFT: process.env.NEXT_PUBLIC_PLANET_ADDRESS,
  };
  const fromEnvAddr = envAddrMap[name];

  // try generated deployedContracts
  const net = (deployedContracts as any)[ENV_CHAIN_ID] ?? {};
  const fromGen = net.contracts?.[name] ?? net[name]; // some templates export either shape

  const address =
    (fromHook?.address as `0x${string}` | undefined) ??
    (fromEnvAddr ? (getAddress(fromEnvAddr) as `0x${string}`) : undefined) ??
    (fromGen?.address ? (getAddress(fromGen.address) as `0x${string}`) : undefined);

  const abi = fromHook?.abi ?? fromGen?.abi;

  return { address, abi };
}

type ForwardRequest = {
  from: string;
  to: string;
  value: bigint;
  gas: bigint;
  nonce: bigint;
  data: Hex;
};

export default function RegisterCard() {
  const { address } = useAccount();
  const activeChainId = useChainId();
  const publicClient = usePublicClient();
  const { data: wallet } = useWalletClient();

  // attempt to load via hook
  const { data: forwarderHook } = useDeployedContractInfo({ contractName: "MinimalForwarder" });
  const { data: registrarHook } = useDeployedContractInfo({ contractName: "GameRegistrar" });
  const { data: planetHook } = useDeployedContractInfo({ contractName: "PlanetNFT" });

  // resilient contract info
  const forwarder = getContractInfo("MinimalForwarder", forwarderHook);
  const registrar = getContractInfo("GameRegistrar", registrarHook);
  const planet = getContractInfo("PlanetNFT", planetHook);

  console.log("[DefeatMeme] addrs", {
    forwarder: forwarder.address,
    registrar: registrar.address,
    planet: planet.address,
  });

  const [busy, setBusy] = useState(false);
  const [hash, setHash] = useState<string | null>(null);

  const { data: myPlanetId, refetch } = useReadContract({
    address: planet.address,
    abi: planet.abi as any,
    functionName: "getPlanetIdByOwner",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address && planet.address && planet.abi) },
  });

  const needsRegistration = useMemo(() => {
    if (!address) return false;
    if (myPlanetId === undefined || myPlanetId === null) return false;
    try {
      return (myPlanetId as unknown as bigint) === 0n;
    } catch {
      return false;
    }
  }, [address, myPlanetId]);

  async function claimGasless() {
    if (
      !wallet ||
      !publicClient ||
      !address ||
      !forwarder.address ||
      !forwarder.abi ||
      !registrar.address ||
      !registrar.abi
    ) {
      alert("Contracts not loaded. Check .env addresses or run `yarn deploy`.");
      return;
    }

    setBusy(true);
    setHash(null);

    try {
      const data = encodeFunctionData({
        abi: registrar.abi as any,
        functionName: "register",
        args: [],
      });

      const nonce = (await publicClient.readContract({
        address: forwarder.address,
        abi: forwarder.abi as any,
        functionName: "getNonce",
        args: [address],
      })) as bigint;

      const gas: bigint = 150000n;

      const request: ForwardRequest = {
        from: getAddress(address),
        to: getAddress(registrar.address),
        value: 0n,
        gas,
        nonce,
        data: data as Hex,
      };

      const domain = {
        name: "MinimalForwarder",
        version: "0.0.1",
        chainId: ENV_CHAIN_ID,
        verifyingContract: forwarder.address,
      } as const;

      const types = {
        ForwardRequest: [
          { name: "from", type: "address" },
          { name: "to", type: "address" },
          { name: "value", type: "uint256" },
          { name: "gas", type: "uint256" },
          { name: "nonce", type: "uint256" },
          { name: "data", type: "bytes" },
        ],
      } as const;

      const signature = await wallet.signTypedData({
        account: address,
        domain,
        types,
        primaryType: "ForwardRequest",
        message: request,
      });

      console.log("ForwardRequest check", {
        from: request.from,
        to: request.to,
        registrar: registrar.address,
        forwarder: forwarder.address,
      });

      const res = await fetch("/api/relay", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          request: {
            from: request.from,
            to: request.to,
            value: request.value.toString(),
            gas: request.gas.toString(),
            nonce: request.nonce.toString(),
            data: request.data,
          },
          signature,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json?.error || "Relay failed");
      setHash(json.txHash as string);

      setTimeout(() => refetch(), 1500);
    } catch (e: any) {
      console.error(e);
      alert(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  const wrongChain = activeChainId !== ENV_CHAIN_ID;

  return (
    <div className="max-w-md mx-auto p-6 rounded-2xl shadow bg-base-200">
      <h2 className="text-xl font-bold">Your Planet</h2>
      {!address && <p className="mt-2">Connect your wallet to begin.</p>}
      {address && myPlanetId === undefined && <p className="mt-2 opacity-70">Checking your planet…</p>}

      {address && myPlanetId !== undefined && !needsRegistration && (
        <p className="mt-2">
          🌍 Planet ID: <b>{(myPlanetId as bigint).toString()}</b>
        </p>
      )}

      {address && needsRegistration && (
        <button
          className="btn btn-primary mt-4"
          onClick={claimGasless}
          disabled={busy || wrongChain || !registrar.address || !forwarder.address}
          title={wrongChain ? `Please switch your wallet to chain ${ENV_CHAIN_ID}` : ""}
        >
          {busy ? "Claiming…" : "Claim your free Planet (gasless)"}
        </button>
      )}

      {hash && (
        <p className="text-sm mt-3 break-all">
          Tx hash: <span className="font-mono">{hash}</span>
        </p>
      )}

      {address && wrongChain && (
        <p className="mt-3 text-sm opacity-70">
          You’re on chain <b>{activeChainId}</b>. Switch to <b>{ENV_CHAIN_ID}</b> to claim.
        </p>
      )}
    </div>
  );
}
