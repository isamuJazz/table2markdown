#!/bin/bash
# This script revokes sudo access to firewall script after initial setup
# Must be run as root

set -euo pipefail

echo "Revoking vscode user's sudo access to firewall commands..."

# Remove the sudoers file that allows vscode to run firewall script
if [ -f /etc/sudoers.d/vscode-firewall ]; then
    rm -f /etc/sudoers.d/vscode-firewall
    echo "Removed /etc/sudoers.d/vscode-firewall"
else
    echo "Sudoers file already removed or doesn't exist"
fi

echo "Firewall sudo access revoked. vscode user can no longer modify firewall rules."
