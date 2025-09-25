#!/bin/bash

echo "========================================"
echo "StaPOS Offline Setup for Mac/Linux"
echo "========================================"
echo

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed!"
    echo "Please download and install Node.js from https://nodejs.org/"
    exit 1
fi

echo "Node.js found! Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "ERROR: Failed to install dependencies!"
    exit 1
fi

echo "Building production version..."
npm run build

if [ $? -ne 0 ]; then
    echo "ERROR: Failed to build project!"
    exit 1
fi

echo
echo "========================================"
echo "Setup Complete!"
echo "========================================"
echo
echo "To start the offline server, run:"
echo "  npm run serve"
echo
echo "Then access from:"
echo "  PC: http://localhost:3000"
echo "  Other devices: http://[YOUR-PC-IP]:3000"
echo
echo "To find your PC IP address, run: ifconfig (Mac) or ip addr (Linux)"
echo

# Make the script executable
chmod +x offline-setup.sh