# 2Fin Tax MCP — stdio connector to the hosted server at https://taxmcp.ai2fin.com
# The container holds no tax logic; it relays JSON-RPC over stdin/stdout.
FROM node:22-alpine
WORKDIR /app
COPY package.json ./
COPY bin ./bin
ENV TAX_MCP_URL=https://taxmcp.ai2fin.com
USER node
ENTRYPOINT ["node", "bin/stdio-proxy.mjs"]
