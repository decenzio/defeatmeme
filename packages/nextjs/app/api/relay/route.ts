// app/api/relay/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Hex, createPublicClient, createWalletClient, decodeErrorResult, getAddress, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import deployedContracts from "~~/contracts/deployedContracts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const rpcUrl = process.env.NEXT_PUBLIC_ZIRCUIT_RPC!;
const chainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID!);
const forwarderAddress = getAddress(process.env.NEXT_PUBLIC_FORWARDER_ADDRESS!);
const registrarAddress = getAddress(process.env.NEXT_PUBLIC_REGISTRAR_ADDRESS!);
const planetAddress = getAddress(process.env.NEXT_PUBLIC_PLANET_ADDRESS!);
const relayerKey = process.env.RELAYER_PRIVATE_KEY!;

function getAbi(name: string) {
  const net = (deployedContracts as any)[chainId] ?? {};
  const c = net.contracts?.[name] ?? net[name];
  if (!c?.abi) throw new Error(`${name} ABI not found for chainId=${chainId}`);
  return c.abi as any;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { request: r, signature } = body as {
      request: {
        from: Hex;
        to: Hex;
        value: string;
        gas: string;
        nonce: string;
        data: Hex;
      };
      signature: Hex;
    };

    const forwardReq = {
      from: getAddress(r.from),
      to: getAddress(r.to),
      value: BigInt(r.value),
      gas: BigInt(r.gas),
      nonce: BigInt(r.nonce),
      data: r.data,
    };

    if (forwardReq.to !== registrarAddress) {
      throw new Error(`ForwardRequest.to (${forwardReq.to}) != registrar (${registrarAddress})`);
    }

    const forwarderAbi = getAbi("MinimalForwarder");
    const planetAbi = getAbi("PlanetNFT");

    const account = privateKeyToAccount(relayerKey as Hex);
    const chain = {
      id: chainId,
      name: "zircuit",
      nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
      rpcUrls: { default: { http: [rpcUrl] } },
    };

    const pub = createPublicClient({ chain, transport: http(rpcUrl) });
    const wallet = createWalletClient({ account, chain, transport: http(rpcUrl) });

    // Ensure forwarder deployed
    const code = await pub.getBytecode({ address: forwarderAddress });
    if (!code || code === "0x") {
      throw new Error(`No bytecode at forwarder ${forwarderAddress}`);
    }

    // --- 1) Dry-run simulate to see if registrar call will succeed
    const sim = await pub.simulateContract({
      address: forwarderAddress,
      abi: forwarderAbi,
      functionName: "execute",
      args: [forwardReq, signature],
      account: account.address,
    });

    let innerSuccess = false;
    let innerData: Hex | undefined;

    if (Array.isArray(sim.result)) {
      innerSuccess = Boolean(sim.result[0]);
      innerData = sim.result[1] as Hex;
    } else {
      innerSuccess = Boolean(sim.result as any);
    }

    if (!innerSuccess) {
      try {
        const decoded = decodeErrorResult({
          data: innerData!,
          abi: getAbi("GameRegistrar"),
        });
        throw new Error(`Registrar reverted: ${decoded?.errorName ?? "revert"}`);
      } catch {
        throw new Error("Forwarded call failed (execute returned false).");
      }
    }

    // --- 2) Send real tx
    const txHash = await wallet.writeContract({
      address: forwarderAddress,
      abi: forwarderAbi,
      functionName: "execute",
      args: [forwardReq, signature],
    });

    // --- 3) Wait a moment, then read planet id for the player
    let planetId: string | null = null;
    try {
      await new Promise(r => setTimeout(r, 500));
      const id = await pub.readContract({
        address: planetAddress,
        abi: planetAbi,
        functionName: "getPlanetIdByOwner",
        args: [forwardReq.from],
      });
      planetId = (id as bigint).toString();
    } catch {
      // ignore
    }

    return NextResponse.json({ ok: true, txHash, innerSuccess, planetId });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}
