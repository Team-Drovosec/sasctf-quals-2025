FROM rust:1.86 AS builder

# Install dependencies
RUN apt-get update && apt-get install -y curl git build-essential pkg-config libssl-dev

# Install Foundry (which includes Anvil)
RUN curl -L https://foundry.paradigm.xyz | bash && \
    ~/.foundry/bin/foundryup && \
    ~/.foundry/bin/forge --version && \
    ~/.foundry/bin/anvil --version

# Create runtime image
FROM debian:latest

COPY --from=builder /root/.foundry/bin/anvil /usr/local/bin/anvil

CMD ["anvil", "--host", "0.0.0.0", "--port", "8546"]