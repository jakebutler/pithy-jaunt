# Pithy Jaunt Daytona Template Dockerfile
# This Dockerfile creates the base image for Daytona workspaces that execute AI agent tasks

FROM ubuntu:22.04

# Prevent interactive prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    curl \
    wget \
    python3 \
    python3-pip \
    python3-venv \
    build-essential \
    ca-certificates \
    gnupg \
    lsb-release \
    jq \
    && rm -rf /var/lib/apt/lists/*

# Install GitHub CLI
RUN curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg \
    && chmod go+r /usr/share/keyrings/githubcli-archive-keyring.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | tee /etc/apt/sources.list.d/github-cli.list > /dev/null \
    && apt-get update \
    && apt-get install -y gh \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 20 (for potential Node.js-based tools)
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy Python requirements and install dependencies
COPY daytona/requirements.txt /app/requirements.txt
RUN pip3 install --no-cache-dir -r /app/requirements.txt

# Copy agent runner and system prompt
COPY daytona/agent-runner.py /app/agent-runner.py
COPY daytona/system-prompt.md /app/system-prompt.md
RUN chmod +x /app/agent-runner.py

# Copy execution script
COPY daytona/execution.sh /app/execution.sh
RUN chmod +x /app/execution.sh

# Set up git configuration (will be overridden by workspace)
RUN git config --global init.defaultBranch main

# Create directory for temporary files
RUN mkdir -p /tmp/pj

# Default command (will be overridden by Daytona template init script)
CMD ["/app/execution.sh"]

