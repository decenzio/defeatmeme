// app/api/relay/route.ts
import { NextResponse } from "next/server";
import deployedContracts from "../../../../contracts/deployedContracts";
import type { Abi, Hex } from "viem";
import { createPublicClient, createWalletClient, decodeErrorResult, defineChain, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { hardhat } from "viem/chains";

/**
 * Body: { chainId, request: ForwardRequest, signature }
 * ForwardRequest per OZ: { from, to, value, gas, nonce, data, deadline (ignored by MinimalForwarder) }
 */

// MinimalForwarder ABIs (verify + execute)
const FORWARDER_VERIFY_ABI = [
  {
    inputs: [
      {
        components: [
          { name: "from", type: "address" },
          { name: "to", type: "address" },
          { name: "value", type: "uint256" },
          { name: "gas", type: "uint256" },
          { name: "nonce", type: "uint256" },
          { name: "data", type: "bytes" },
        ],
        name: "req",
        type: "tuple",
      },
      { name: "signature", type: "bytes" },
    ],
    name: "verify",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
] as const satisfies Abi;

const FORWARDER_EXECUTE_ABI = [
  {
    inputs: [
      {
        components: [
          { name: "from", type: "address" },
          { name: "to", type: "address" },
          { name: "value", type: "uint256" },
          { name: "gas", type: "uint256" },
          { name: "nonce", type: "uint256" },
          { name: "data", type: "bytes" },
        ],
        name: "req",
        type: "tuple",
      },
      { name: "signature", type: "bytes" },
    ],
    name: "execute",
    outputs: [
      { name: "success", type: "bool" },
      { name: "ret", type: "bytes" },
    ],
    stateMutability: "payable",
    type: "function",
  },
] as const satisfies Abi;

// Narrow typed ABIs just for the preflight checks to get perfect inference.
const GAME_ENGINE_VIEW_ABI = [
  {
    type: "function",
    name: "isTrustedForwarder",
    stateMutability: "view",
    inputs: [{ name: "forwarder", type: "address" }],
    outputs: [{ type: "bool" }],
  },
  {
    type: "function",
    name: "enemyTypesCount",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
] as const satisfies Abi;

const PLANET_NFT_VIEW_ABI = [
  {
    type: "function",
    name: "ownedPlanet",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
] as const satisfies Abi;

// Generic Error(string) ABI used for fallback decoding
const GENERIC_ERROR_STRING_ABI = [
  {
    type: "error",
    name: "Error",
    inputs: [{ name: "message", type: "string" }],
  },
] as const satisfies Abi;

type ForwardRequest = {
  from: `0x${string}`;
  to: `0x${string}`;
  value: string | number | bigint;
  gas: string | number | bigint;
  nonce: string | number | bigint;
  data: `0x${string}`;
  deadline?: string | number | bigint;
};

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Resolve chain id
    const incomingChainId = Number(body.chainId ?? process.env.NEXT_PUBLIC_CHAIN_ID ?? 31337);
    type DC = typeof deployedContracts;
    type ChainKey = keyof DC;

    const CHAIN_ID = (incomingChainId in deployedContracts ? incomingChainId : 31337) as ChainKey;

    const CHAIN_ID_NUM = Number(CHAIN_ID);

    const request = body.request as ForwardRequest;
    const signature = body.signature as Hex;

    const rpcUrl = process.env.RPC_URL || "http://127.0.0.1:8545";
    const relayerPk = process.env.RELAYER_PRIVATE_KEY as Hex | undefined;
    if (!relayerPk) {
      return NextResponse.json({ error: "RELAYER_PRIVATE_KEY not set" }, { status: 500 });
    }

    const account = privateKeyToAccount(relayerPk);

    // Proper chain instance (fixes TS typing + supports custom RPC)
    const chain =
      CHAIN_ID_NUM === 31337
        ? hardhat
        : defineChain({
            id: CHAIN_ID_NUM,
            name: `chain-${CHAIN_ID_NUM}`,
            network: `custom-${CHAIN_ID_NUM}`,
            nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
            rpcUrls: {
              default: { http: [rpcUrl] },
              public: { http: [rpcUrl] },
            },
            testnet: true,
          });

    const publicClient = createPublicClient({
      chain,
      transport: http(rpcUrl),
    });

    const walletClient = createWalletClient({
      chain,
      transport: http(rpcUrl),
      account,
    });

    const forwarder = deployedContracts[CHAIN_ID]?.MinimalForwarder?.address as `0x${string}` | undefined;
    if (!forwarder) {
      return NextResponse.json({ error: "MinimalForwarder not deployed" }, { status: 500 });
    }

    // 1) Verify signature
    const verifyOk = await publicClient.readContract({
      address: forwarder,
      abi: FORWARDER_VERIFY_ABI,
      functionName: "verify",
      args: [
        {
          from: request.from,
          to: request.to,
          value: BigInt(request.value ?? 0),
          gas: BigInt(request.gas ?? 1_000_000),
          nonce: BigInt(request.nonce),
          data: request.data,
        },
        signature,
      ],
    });

    if (!verifyOk) {
      return NextResponse.json({ error: "Invalid meta-tx signature" }, { status: 400 });
    }

    // 2) Optional domain-specific pre-checks to surface clearer errors for known targets
    try {
      const dc: any = deployedContracts as any;
      const chainContracts = dc[CHAIN_ID_NUM];
      if (chainContracts?.GameEngine?.address && chainContracts?.PlanetNFT?.address) {
        const engineAddr = (chainContracts.GameEngine.address as string).toLowerCase();
        const planetAddr = chainContracts.PlanetNFT.address as `0x${string}`;
        if (engineAddr === String(request.to).toLowerCase()) {
          // Check trust on forwarder
          try {
            const trusted = await publicClient.readContract({
              address: chainContracts.GameEngine.address as `0x${string}`,
              abi: GAME_ENGINE_VIEW_ABI,
              functionName: "isTrustedForwarder",
              args: [forwarder],
            });
            if (!trusted) {
              return NextResponse.json({ error: "forwarder not trusted by GameEngine" }, { status: 400 });
            }
          } catch {
            // ignore optional check failure
          }

          // Check enemy types > 0 (args: [] is required or inferred here)
          try {
            const etc = (await publicClient.readContract({
              address: chainContracts.GameEngine.address as `0x${string}`,
              abi: GAME_ENGINE_VIEW_ABI,
              functionName: "enemyTypesCount",
              args: [], // 👈 key fix when ABI typing isn't perfect
            })) as bigint;

            if (etc === 0n) {
              return NextResponse.json({ error: "no enemies: enemyTypesCount is 0" }, { status: 400 });
            }
          } catch {
            // ignore optional check failure
          }

          // Ensure the sender owns a planet
          const tokenId = (await publicClient.readContract({
            address: planetAddr,
            abi: PLANET_NFT_VIEW_ABI,
            functionName: "ownedPlanet",
            args: [request.from],
          })) as bigint;

          if (tokenId === 0n) {
            return NextResponse.json({ error: "need planet: mint a Planet NFT first" }, { status: 400 });
          }
        }
      }
    } catch {
      // ignore optional check scaffold errors
    }

    // 3) Preflight simulate forwarder.execute to catch inner-call reverts early
    try {
      const sim = await publicClient.simulateContract({
        chain,
        account,
        address: forwarder,
        abi: FORWARDER_EXECUTE_ABI,
        functionName: "execute",
        args: [
          {
            from: request.from,
            to: request.to,
            value: BigInt(request.value ?? 0),
            gas: BigInt(request.gas ?? 1_000_000),
            nonce: BigInt(request.nonce),
            data: request.data,
          },
          signature,
        ],
        value: BigInt(request.value ?? 0),
      });

      const result = sim.result as unknown as [boolean, `0x${string}`];

      if (Array.isArray(result) && result[0] === false) {
        let reason: string | undefined;
        try {
          const dc: any = deployedContracts as any;
          const geAbi = dc[CHAIN_ID_NUM]?.GameEngine?.abi as Abi | undefined;
          if (geAbi && result[1]) {
            const decoded = decodeErrorResult({ abi: geAbi, data: result[1] });
            // prefer errorName, fall back to first arg if present
            reason =
              (decoded as any)?.errorName ??
              ((decoded as any)?.args?.[0] ? String((decoded as any).args[0]) : undefined);
          }
        } catch {
          // ignore and try generic decode below
        }

        if (!reason && result[1] && result[1] !== "0x") {
          try {
            const d = decodeErrorResult({
              abi: GENERIC_ERROR_STRING_ABI,
              data: result[1],
            }) as any;
            if (d?.args?.[0]) reason = String(d.args[0]);
          } catch {
            // give up on decoding
          }
        }

        return NextResponse.json(
          {
            error:
              reason ||
              "Inner call would revert (forwarder.execute returned success=false). Ensure you own a Planet NFT and that the forwarder is trusted by the target contract.",
            hint: "Common causes: need planet, enemyTypesCount=0, active session not expired, or wrong forwarder address",
          },
          { status: 400 },
        );
      }
    } catch (simErr: any) {
      // Node might refuse simulation; proceed to send but surface context
      console.warn("forwarder.execute simulation failed", simErr?.message || simErr);
    }

    // 4) Execute (payable → pass top-level `value` to fund the inner call)
    const hash = await walletClient.writeContract({
      chain,
      address: forwarder,
      abi: FORWARDER_EXECUTE_ABI,
      functionName: "execute",
      args: [
        {
          from: request.from,
          to: request.to,
          value: BigInt(request.value ?? 0),
          gas: BigInt(request.gas ?? 1_000_000),
          nonce: BigInt(request.nonce),
          data: request.data,
        },
        signature,
      ],
      value: BigInt(request.value ?? 0),
    });

    // 5) Wait for receipt and surface reverts
    try {
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status !== "success") {
        return NextResponse.json({ error: "Relayed transaction reverted", hash, receipt }, { status: 500 });
      }
    } catch (waitErr: any) {
      return NextResponse.json({ error: waitErr?.message || "wait receipt failed", hash }, { status: 500 });
    }

    return NextResponse.json({ hash });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "unknown error" }, { status: 500 });
  }
}
