import { NextResponse } from "next/server";
import deployedContracts from "../../../../contracts/deployedContracts";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const chainIdParam = searchParams.get("chainId");
  const chainId = Number(chainIdParam || process.env.NEXT_PUBLIC_CHAIN_ID || 31337);

  // Prefer explicit env override
  const envForwarder = process.env.FORWARDER_ADDRESS;
  if (envForwarder) {
    return NextResponse.json({ chainId, address: envForwarder });
  }

  const contracts = (deployedContracts as any)[chainId];
  const address: string | undefined = contracts?.MinimalForwarder?.address;

  if (!address) {
    return NextResponse.json({ error: "MinimalForwarder not found for chain" }, { status: 404 });
  }
  return NextResponse.json({ chainId, address });
}
