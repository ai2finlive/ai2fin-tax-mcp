<img src="assets/logo-400.png" alt="2Fin" width="72" align="right" />

# 2Fin Tax MCP

Free, no-auth tax tools for AI assistants: GST/VAT, income, company and capital-gains tax, in every country we have verified data for, each answer cited to the national tax authority.

- **Endpoint:** `https://taxmcp.ai2fin.com` (streamable HTTP, JSON-RPC, no API key, stateless)
- **Clients:** Claude, ChatGPT (developer mode), Cursor, VS Code, or any MCP client
- **Source of truth:** the same tax engine behind the calculators at [ai2fin.com/tools](https://ai2fin.com/tools/compare)

Every result carries its source authority and a "general information, not tax advice" note. Where data isn't verified for a country, the tool says so instead of guessing.

## Tools

| Tool | Title | What it does |
| --- | --- | --- |
| `tax_rate_as_of` | Historical tax rate lookup | The GST/VAT standard rate that applied in a country on a given date. |
| `tax_rate_lookup` | Country tax rate lookup | Headline GST/VAT, top income tax and company tax rates for 193 countries, plus CA and US state/provincial sales tax. |
| `compute_gst_vat` | GST/VAT add or remove calculator | Add or remove a country's GST/VAT (or other national consumption tax) on an amount: net, tax and gross. |
| `compare_countries` | Multi-country tax comparison | GST/VAT, top income tax and company tax side by side across several countries. |
| `income_tax_estimate` | Income tax & take-home estimate | Income tax and take-home pay for 57 countries over effective-dated brackets, with each country's levies and offsets. |
| `company_tax_estimate` | Company tax estimate | Company tax on an annual profit for 139 countries, marking which are verified against the national authority. |
| `cgt_estimate` | Capital gains tax estimate | Capital gains tax on one sale of shares or property by a resident individual, for 71 countries. |
| `student_loan_repayment` | Australian HELP/HECS repayment | The compulsory annual study-loan repayment from repayment income, effective-dated by financial year. |
| `superannuation_estimate` | Australian superannuation estimate | Superannuation Guarantee, concessional cap usage, contributions tax and Division 293. |
| `tax_facts` | Sourced tax facts | When and why a country's GST/VAT began and other true, sourced stories about its tax system. |

All tools are read-only and idempotent, and each declares an output schema.

## Connect

**Remote (recommended).** Add `https://taxmcp.ai2fin.com` as a custom connector:

- **Claude:** Settings → Connectors → Add custom connector
- **ChatGPT:** Settings → Apps & Connectors → developer mode → Create
- **Cursor / VS Code / others:**

```json
{
  "mcpServers": {
    "2fin-tax": { "url": "https://taxmcp.ai2fin.com" }
  }
}
```

**stdio.** For clients that only run local servers, this repo's connector relays stdio to the hosted endpoint (Node 18+, no dependencies):

```json
{
  "mcpServers": {
    "2fin-tax": { "command": "npx", "args": ["-y", "github:ai2finlive/ai2fin-tax-mcp"] }
  }
}
```

or with Docker:

```bash
docker build -t 2fin-tax-mcp . && docker run -i --rm 2fin-tax-mcp
```

## Quick check

```bash
curl -s https://taxmcp.ai2fin.com -X POST -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"compute_gst_vat","arguments":{"country":"AU","amount":100,"mode":"add"}}}'
```

## What's in this repo

The hosted server does the computing. This repo is the public home of the listing and a small stdio connector ([`bin/stdio-proxy.mjs`](bin/stdio-proxy.mjs)) that forwards JSON-RPC to the endpoint. It contains no tax logic or data. Set `TAX_MCP_URL` to point it at another deployment.

```bash
npm test   # connector tests (local stand-in endpoint, no network)
```

## Privacy

The endpoint is stateless: it computes over public rate data and stores nothing you send. It is separate from the authenticated 2Fin app MCP at `app.ai2fin.com/mcp`, which works on your own financial data behind OAuth.

## License

MIT for the code in this repo. See [LICENSE](LICENSE).
