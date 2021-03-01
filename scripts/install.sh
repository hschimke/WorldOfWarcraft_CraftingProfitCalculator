#!/bin/bash
INSTALL_DIRECTORY="/opt/wow_cpc"
USER="WOW_CPC"

[ ! -d "${INSTALL_DIRECTORY}" ] && mkdir "${INSTALL_DIRECTORY}"

user_exists(){ id "$1" &>/dev/null; }
if user_exists $USER; then
    echo "User ${USER} already exists."
else
    echo "${USER} does not exist, creating."
    useradd -M $USER
    usermod -L $USER
fi

# Perform build
build.sh

# Stop everything, if it exists
systemctl disable wow_cpc_auction_scrape.service
systemctl disable wow_cpc_auction_scrape.timer
systemctl disable wow_cpc.service
systemctl stop wow_cpc_auction_scrape.service
systemctl stop wow_cpc.service

# Copy files
cp --archive ../ $INSTALL_DIRECTORY

# Copy SystemD Units
cp "${INSTALL_DIRECTORY}/scripts//wow_cpc_auction_scrape.service" /etc/systemd/system/wow_cpc_auction_scrape.service
cp "${INSTALL_DIRECTORY}/scripts//wow_cpc_auction_scrape.timer" /etc/systemd/system/wow_cpc_auction_scrape.timer
cp "${INSTALL_DIRECTORY}/scripts//wow_cpc.service" /etc/systemd/system/wow_cpc.service

# Activate SystemD Units
systemctl enable wow_cpc_auction_scrape.service
systemctl enable wow_cpc_auction_scrape.timer
systemctl enable wow_cpc.service

# Start Server
systemctl start wow_cpc.service