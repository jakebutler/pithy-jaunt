# Pithy Jaunt Daytona Template Dockerfile
# This Dockerfile creates the base image for Daytona workspaces that execute AI agent tasks

FROM ubuntu:22.04

# Prevent interactive prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive

# Install system dependencies and Python 3.11
# Ubuntu 22.04 comes with Python 3.10, so we need to add deadsnakes PPA for Python 3.11
RUN apt-get update && apt-get install -y \
    software-properties-common \
    && add-apt-repository ppa:deadsnakes/ppa -y \
    && apt-get update && apt-get install -y \
    git \
    curl \
    wget \
    python3.11 \
    python3.11-dev \
    python3.11-venv \
    python3.11-distutils \
    build-essential \
    ca-certificates \
    gnupg \
    lsb-release \
    jq \
    && rm -rf /var/lib/apt/lists/*

# Install pip for Python 3.11
RUN curl -sS https://bootstrap.pypa.io/get-pip.py | python3.11

# Set python3.11 as default python3
RUN update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.11 1
RUN update-alternatives --install /usr/bin/python python /usr/bin/python3.11 1

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

# Install Playwright browsers (required for browser-use)
RUN pip3 install playwright && \
    playwright install chromium --with-deps

# Copy bootstrap script (this will download latest scripts at runtime)
COPY daytona/bootstrap.sh /app/bootstrap.sh
RUN chmod +x /app/bootstrap.sh

# Copy scripts as fallback (in case GitHub is unavailable)
# These will be overwritten by bootstrap.sh if download succeeds
COPY daytona/agent-runner.py /app/agent-runner.py
COPY daytona/system-prompt.md /app/system-prompt.md
COPY daytona/system-prompt-file-generation.md /app/system-prompt-file-generation.md
COPY daytona/execution.sh /app/execution.sh
RUN chmod +x /app/agent-runner.py /app/execution.sh

# Set up git configuration (will be overridden by workspace)
RUN git config --global init.defaultBranch main

# Create directory for temporary files
RUN mkdir -p /tmp/pj

# Default command (will be overridden by Daytona template init script)
# Use bootstrap.sh which downloads latest scripts, then runs execution.sh
CMD ["/app/bootstrap.sh"]

