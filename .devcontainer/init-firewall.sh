#!/bin/bash
set -euo pipefail  # Exit on error, undefined vars, and pipeline failures
IFS=$'\n\t'       # Stricter word splitting

# 1. Extract Docker DNS info BEFORE any flushing
DOCKER_DNS_RULES=$(iptables-save -t nat | grep "127\.0\.0\.11" || true)

# Flush existing rules and delete existing ipsets
iptables -F
iptables -X
iptables -t nat -F
iptables -t nat -X
iptables -t mangle -F
iptables -t mangle -X
ipset destroy allowed-domains 2>/dev/null || true

# 2. Selectively restore ONLY internal Docker DNS resolution
if [ -n "$DOCKER_DNS_RULES" ]; then
    echo "Restoring Docker DNS rules..."
    iptables -t nat -N DOCKER_OUTPUT 2>/dev/null || true
    iptables -t nat -N DOCKER_POSTROUTING 2>/dev/null || true
    while IFS= read -r rule; do
        if [ -n "$rule" ]; then
            eval "iptables -t nat $rule"
        fi
    done <<< "$DOCKER_DNS_RULES"
else
    echo "No Docker DNS rules to restore"
fi

# First allow DNS and localhost before any restrictions
# Allow outbound DNS
iptables -A OUTPUT -p udp --dport 53 -j ACCEPT
# Allow inbound DNS responses
iptables -A INPUT -p udp --sport 53 -j ACCEPT
# Allow outbound SSH
iptables -A OUTPUT -p tcp --dport 22 -j ACCEPT
# Allow inbound SSH responses
iptables -A INPUT -p tcp --sport 22 -m state --state ESTABLISHED -j ACCEPT
# Allow localhost
iptables -A INPUT -i lo -j ACCEPT
iptables -A OUTPUT -o lo -j ACCEPT

# Create ipset with CIDR support
ipset create allowed-domains hash:net

# Fetch GitHub meta information and aggregate + add their IP ranges
echo "Fetching GitHub IP ranges..."
gh_ranges=$(curl -s https://api.github.com/meta)
if [ -z "$gh_ranges" ]; then
    echo "ERROR: Failed to fetch GitHub IP ranges"
    exit 1
fi

if ! echo "$gh_ranges" | jq -e '.web and .api and .git' >/dev/null; then
    echo "ERROR: GitHub API response missing required fields"
    exit 1
fi

echo "Processing GitHub IPs..."
while read -r cidr; do
    if [[ ! "$cidr" =~ ^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}/[0-9]{1,2}$ ]]; then
        echo "ERROR: Invalid CIDR range from GitHub meta: $cidr"
        exit 1
    fi
    echo "Adding GitHub range $cidr"
    ipset add allowed-domains "$cidr"
done < <(echo "$gh_ranges" | jq -r '(.web + .api + .git)[]' | aggregate -q)

# Add Cloudflare IP ranges (for Docker Hub CDN)
echo "Fetching Cloudflare IP ranges..."
for url in https://www.cloudflare.com/ips-v4 https://www.cloudflare.com/ips-v6; do
    curl -s $url | while read -r cfip; do
        [ -z "$cfip" ] && continue
        echo "Adding Cloudflare range $cfip"
        ipset add allowed-domains "$cfip" 2>/dev/null || echo "IP $cfip already exists in set"
    done
done

# Add Google Cloud IP ranges (for dl.google.com and storage.googleapis.com)
echo "Fetching Google Cloud IP ranges..."
goog_ranges=$(curl -s https://www.gstatic.com/ipranges/goog.json)
if [ -n "$goog_ranges" ]; then
    echo "$goog_ranges" | jq -r '.prefixes[]?.ipv4Prefix // empty' | while read -r goog_cidr; do
        [ -z "$goog_cidr" ] && continue
        echo "Adding Google Cloud range $goog_cidr"
        ipset add allowed-domains "$goog_cidr" 2>/dev/null || echo "IP $goog_cidr already exists in set"
    done
else
    echo "WARNING: Failed to fetch Google Cloud IP ranges, will try individual resolution"
fi

# ALLOW Domains
# Resolve and add other allowed domains (including VS Code Copilot and Docker Hub, Python Package Index)
for domain in \
    "registry.npmjs.org" \
    "api.anthropic.com" \
    "sentry.io" \
    "statsig.anthropic.com" \
    "statsig.com" \
    "copilot-proxy.githubusercontent.com" \
    "default.exp-tas.com" \
    "vscodeexperiments.azureedge.net" \
    "az764295.vo.msecnd.net" \
    "marketplace.visualstudio.com" \
    "vscode.cdn.azure.cn" \
    "update.code.visualstudio.com" \
    "registry-1.docker.io" \
    "auth.docker.io" \
    "hub.docker.com" \
    "docker.io" \
    "docs.docker.com" \
    "production.cloudflare.docker.com" \
    "index.docker.io" \
    "pypi.org" \
    "files.pythonhosted.org" \
    "pypi.python.org" \
    "gallery.vsassets.io" \
    "gallerycdn.vsassets.io" \
    "vscode.gallerycdn.azureedge.net" \
    "mobile.events.data.microsoft.com" \
    "GitHub.gallerycdn.vsassets.io" \
    "GitHub.gallery.vsassets.io" \
    "get.sdkman.io" \
    "get.volta.sh" \
    "corretto.aws" \
    "d3pxv6yz143wms.cloudfront.net" \
    "npm.pkg.github.com" \
    "nodejs.org" \
    "ui.shadcn.com" \
    "repo1.maven.org" \
    "central.maven.org" \
    "repo.maven.apache.org" \
    "go.dev" \
    "proxy.golang.org" \
    "sum.golang.org" \
    "dl.google.com" \
    "storage.googleapis.com" \
    "www.gstatic.com" \
    "gstatic.com" \
    "search.maven.org"; do 
    echo "Resolving $domain..."
    ips=$(dig +short A "$domain")
    if [ -z "$ips" ]; then
        # CNAMEかもしれないのでCNAMEを解決
        cname=$(dig +short CNAME "$domain")
        if [ -n "$cname" ]; then
            echo "CNAME found for $domain: $cname"
            ips=$(dig +short A "$cname")
        fi
    fi
    if [ -z "$ips" ]; then
        echo "WARNING: Failed to resolve $domain (may not be critical)"
        continue
    fi
    while read -r ip; do
        if [[ ! "$ip" =~ ^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$ ]]; then
            echo "WARNING: Non-IP DNS result for $domain: $ip (skipped)"
            continue
        fi
        echo "Adding $ip for $domain"
        ipset add allowed-domains "$ip" 2>/dev/null || echo "IP $ip already exists in set"
    done < <(echo "$ips")
done

# Get host IP from default route
HOST_IP=$(ip route | grep default | cut -d" " -f3)
if [ -z "$HOST_IP" ]; then
    echo "ERROR: Failed to detect host IP"
    exit 1
fi

HOST_NETWORK=$(echo "$HOST_IP" | sed "s/\.[0-9]*$/.0\/24/")
echo "Host network detected as: $HOST_NETWORK"

# Set up remaining iptables rules
iptables -A INPUT -s "$HOST_NETWORK" -j ACCEPT
iptables -A OUTPUT -d "$HOST_NETWORK" -j ACCEPT

# Set default policies to DROP first
iptables -P INPUT DROP
iptables -P FORWARD DROP
iptables -P OUTPUT DROP

# First allow established connections for already approved traffic
iptables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT
iptables -A OUTPUT -m state --state ESTABLISHED,RELATED -j ACCEPT

# Then allow only specific outbound traffic to allowed domains
iptables -A OUTPUT -m set --match-set allowed-domains dst -j ACCEPT

echo "Firewall configuration complete"
echo "Verifying firewall rules..."
if curl --connect-timeout 5 https://example.com >/dev/null 2>&1; then
    echo "ERROR: Firewall verification failed - was able to reach https://example.com"
    exit 1
else
    echo "Firewall verification passed - unable to reach https://example.com as expected"
fi

# Verify GitHub API access
if ! curl --connect-timeout 5 https://api.github.com/zen >/dev/null 2>&1; then
    echo "ERROR: Firewall verification failed - unable to reach https://api.github.com"
    exit 1
else
    echo "Firewall verification passed - able to reach https://api.github.com as expected"
fi

# Verify VS Code Copilot access
if ! curl --connect-timeout 5 https://copilot-proxy.githubusercontent.com >/dev/null 2>&1; then
    echo "WARNING: Unable to reach VS Code Copilot proxy (may affect Copilot functionality)"
else
    echo "Firewall verification passed - able to reach VS Code Copilot proxy"
fi

# Revoke sudo access to firewall commands after setup
# echo "Revoking vscode user's sudo access to firewall commands..."
# if [ -f /etc/sudoers.d/vscode-firewall ]; then
#     rm -f /etc/sudoers.d/vscode-firewall
#     echo "✓ Firewall sudo access revoked. vscode user can no longer modify firewall rules."
# else
#     echo "✓ Sudoers file already removed"
# fi

# # Restrict vscode user's sudo access to prevent firewall modifications
# echo "Restricting vscode user's sudo access..."
# cat > /etc/sudoers.d/vscode << 'EOF'
# vscode ALL=(root) NOPASSWD: ALL, !/usr/sbin/iptables, !/usr/sbin/ip6tables, !/usr/sbin/ipset, !/usr/local/bin/init-firewall.sh
# EOF
# chmod 0440 /etc/sudoers.d/vscode
# echo "✓ Sudo access restricted. vscode user cannot use sudo with iptables, ip6tables, ipset, or init-firewall.sh"

