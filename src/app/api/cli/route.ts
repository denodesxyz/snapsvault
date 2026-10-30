import { NextResponse } from 'next/server'
import { PUBLIC_CACHE_CONTROL } from '@/lib/api-cache'

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "SnapsVault CLI API Documentation",
    endpoints: {
      networks: {
        url: "/api/networks",
        description: "List all available blockchain networks",
        method: "GET",
        examples: [
          "curl https://celestia.snapsvault.xyz/api/networks"
        ],
        response: "Array of networks with chains, chain IDs, contributors, and snapshot counts"
      },
      snapshots: {
        url: "/api/cli/snapshots",
        description: "List snapshots for a network with filtering options",
        method: "GET",
        required: ["network"],
        optional: ["chain_id", "chain", "latest", "contributor", "type", "format"],
        examples: [
          "curl 'https://celestia.snapsvault.xyz/api/cli/snapshots?network=celestia'",
          "curl 'https://celestia.snapsvault.xyz/api/cli/snapshots?network=celestia&latest=true'",
          "curl 'https://celestia.snapsvault.xyz/api/cli/snapshots?network=celestia&chain=mainnet&format=cli'",
          "curl 'https://celestia.snapsvault.xyz/api/cli/snapshots?network=celestia&contributor=Noders&type=pruned'"
        ],
        formats: {
          detailed: "Full snapshot information (default)",
          cli: "Simplified format optimized for CLI usage"
        }
      },
      latest: {
        url: "/api/cli/latest",
        description: "Get the newest snapshot for a network",
        method: "GET",
        required: ["network"],
        optional: ["chain_id", "chain (default: the chain of chain_id, else mainnet)", "type", "contributor"],
        examples: [
          "curl 'https://celestia.snapsvault.xyz/api/cli/latest?network=celestia'",
          "curl 'https://celestia.snapsvault.xyz/api/cli/latest?network=celestia&chain_id=celestia'",
          "curl 'https://celestia.snapsvault.xyz/api/cli/latest?network=celestia&chain=testnet'",
          "curl 'https://celestia.snapsvault.xyz/api/cli/latest?network=celestia&type=pruned'"
        ],
        response: "Newest snapshot with download URL and checksum"
      }
    },
    workflow: {
      step1: {
        description: "List all available networks",
        command: "curl https://celestia.snapsvault.xyz/api/networks",
        purpose: "See what networks are available"
      },
      step2: {
        description: "Get the newest snapshot for a network",
        command: "curl 'https://celestia.snapsvault.xyz/api/cli/latest?network=NETWORK_NAME'",
        purpose: "Get the most recent snapshot"
      },
      step3: {
        description: "Download the snapshot",
        command: "curl -L 'DOWNLOAD_URL' -o 'FILENAME'",
        purpose: "Download the snapshot file"
      },
      alternative: {
        description: "Browse all snapshots for a network",
        command: "curl 'https://celestia.snapsvault.xyz/api/cli/snapshots?network=NETWORK_NAME&format=cli'",
        purpose: "See all available options"
      }
    },
    examples: {
      celestiaLatest: {
        description: "Download the newest Celestia mainnet snapshot",
        commands: [
          "# Get newest snapshot info",
          "curl 'https://celestia.snapsvault.xyz/api/cli/latest?network=celestia' | jq '.data.download_url'",
          "",
          "# Download directly",
          "url=$(curl -s 'https://celestia.snapsvault.xyz/api/cli/latest?network=celestia' | jq -r '.data.download_url')",
          "curl -fL -o \"$(basename \"$url\")\" \"$url\""
        ]
      },
      celestiaTestnet: {
        description: "Get the newest Celestia testnet snapshot",
        commands: [
          "curl 'https://celestia.snapsvault.xyz/api/cli/latest?network=celestia&chain=testnet'"
        ]
      },
      browseAll: {
        description: "Browse all available snapshots",
        commands: [
          "# List all networks",
          "curl https://celestia.snapsvault.xyz/api/networks | jq '.data[].network'",
          "",
          "# Get all snapshots for a network",
          "curl 'https://celestia.snapsvault.xyz/api/cli/snapshots?network=celestia&format=cli' | jq '.data[]'"
        ]
      }
    },
    tips: [
      "Use 'format=cli' for simplified output optimized for scripts",
      "Add 'latest=true' to get only the newest snapshots",
      "Filter by 'chain=testnet' or 'chain=mainnet'",
      "Filter by 'type=archive', 'type=pruned', etc.",
      "Use jq to parse JSON responses in shell scripts",
      "Check the 'alternatives' field in responses for other options"
    ],
    last_updated: new Date().toISOString()
  }, { headers: { 'Cache-Control': PUBLIC_CACHE_CONTROL } })
}
