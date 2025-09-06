import { NextResponse } from "next/server";
import deployedContracts from "../../../../contracts/deployedContracts";
import { Hex, createPublicClient, createWalletClient, defineChain, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { hardhat } from "viem/chains";

// Body: { chainId, request: ForwardRequest, signature }
// ForwardRequest per OZ: { from, to, value, gas, nonce, data, deadline }

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
] as const;

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
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const incomingChainId = Number(body.chainId ?? process.env.NEXT_PUBLIC_CHAIN_ID ?? 31337);
    type DC = typeof deployedContracts;
    type ChainKey = keyof DC;
    const CHAIN_ID = (incomingChainId in deployedContracts ? incomingChainId : 31337) as ChainKey;
    const CHAIN_ID_NUM = Number(CHAIN_ID);

    const request = body.request as {
      from: `0x${string}`;
      to: `0x${string}`;
      value: string | number | bigint;
      gas: string | number | bigint;
      nonce: string | number | bigint;
      data: `0x${string}`;
      deadline?: string | number | bigint;
    };
    const signature = body.signature as Hex;

    const rpcUrl = process.env.RPC_URL || "http://127.0.0.1:8545";
    const relayerPk = process.env.RELAYER_PRIVATE_KEY as Hex | undefined;
    if (!relayerPk) {
      return NextResponse.json({ error: "RELAYER_PRIVATE_KEY not set" }, { status: 500 });
    }

    const account = privateKeyToAccount(relayerPk);

    // ✅ Proper Chain instance (fixes TS2322)
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

    // 2) Execute (nonpayable → do NOT pass top-level `value`)
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
    });

    return NextResponse.json({ hash });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "unknown error" }, { status: 500 });
  }
}
