FROM mcr.microsoft.com/devcontainers/base:debian-12

# Install required packages for firewall functionality
RUN apt-get update && apt-get install -y --no-install-recommends \
  iptables \
  ipset \
  iproute2 \
  sudo \
  dnsutils \
  aggregate \
  wget \
  curl \
  jq \
  && apt-get clean && rm -rf /var/lib/apt/lists/*

# Install Google Chrome for headless browser automation
RUN apt-get update && apt-get install -y --no-install-recommends \
  fonts-liberation \
  libappindicator3-1 \
  libasound2 \
  libatk-bridge2.0-0 \
  libatk1.0-0 \
  libatspi2.0-0 \
  libcairo2 \
  libcups2 \
  libdbus-1-3 \
  libgbm1 \
  libglib2.0-0 \
  libgtk-3-0 \
  libnspr4 \
  libnss3 \
  libpango-1.0-0 \
  libvulkan1 \
  libx11-6 \
  libxcb1 \
  libxcomposite1 \
  libxdamage1 \
  libxext6 \
  libxfixes3 \
  libxkbcommon0 \
  libxrandr2 \
  xdg-utils \
  && wget -q https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb \
  && apt-get install -y ./google-chrome-stable_current_amd64.deb \
  && rm google-chrome-stable_current_amd64.deb \
  && apt-get clean && rm -rf /var/lib/apt/lists/*

# Copy and set up firewall script
COPY init-firewall.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/init-firewall.sh && \
  echo "vscode ALL=(root) NOPASSWD: /usr/local/bin/init-firewall.sh" > /etc/sudoers.d/vscode-firewall && \
  chmod 0440 /etc/sudoers.d/vscode-firewall

# --- Node.js セットアップ（Volta経由） ---
ARG USERNAME=vscode
ARG NODE_VERSION=22
USER ${USERNAME}
RUN curl https://get.volta.sh | bash && \
  VOLTA_HOME="/home/${USERNAME}/.volta" PATH="${VOLTA_HOME}/bin:$PATH" /home/${USERNAME}/.volta/bin/volta install node@${NODE_VERSION} && \
  # Voltaのキャッシュを削除してイメージサイズを削減
  rm -rf /home/${USERNAME}/.volta/tmp/* 2>/dev/null || true

# 環境変数をvscodeユーザーの.bashrcに設定
RUN echo 'export VOLTA_HOME="/home/vscode/.volta"' >> /home/${USERNAME}/.bashrc && \
  echo 'export PATH="$VOLTA_HOME/bin:$PATH"' >> /home/${USERNAME}/.bashrc

# --- Python セットアップ（uv経由） ---
ARG PYTHON_VERSION=3.12
RUN curl -LsSf https://astral.sh/uv/install.sh | sh && \
  /home/${USERNAME}/.local/bin/uv python install ${PYTHON_VERSION} && \
  rm -rf /home/${USERNAME}/.cache/uv/* 2>/dev/null || true

# 環境変数をvscodeユーザーの.bashrcに設定
RUN echo 'export PATH="/home/vscode/.local/bin:$PATH"' >> /home/${USERNAME}/.bashrc



# 厳しすぎて動作に支障が出る場合があるため、一旦コメントアウト
# Copy and set up firewall script
# USER root
# COPY init-firewall.sh /usr/local/bin/
# COPY revoke-firewall-sudo.sh /usr/local/bin/
# RUN chmod +x /usr/local/bin/init-firewall.sh && \
#   chmod +x /usr/local/bin/revoke-firewall-sudo.sh && \
#   chown root:root /usr/local/bin/init-firewall.sh && \
#   chown root:root /usr/local/bin/revoke-firewall-sudo.sh && \
#   echo "vscode ALL=(root) NOPASSWD: /usr/local/bin/init-firewall.sh" > /etc/sudoers.d/vscode-firewall && \
#   echo "vscode ALL=(ALL) !NOPASSWD: /usr/sbin/iptables" >> /etc/sudoers.d/vscode-firewall && \
#   echo "vscode ALL=(ALL) !NOPASSWD: /usr/sbin/ip6tables" >> /etc/sudoers.d/vscode-firewall && \
#   echo "vscode ALL=(ALL) !NOPASSWD: /usr/sbin/ipset" >> /etc/sudoers.d/vscode-firewall && \
#   chmod 0440 /etc/sudoers.d/vscode-firewall