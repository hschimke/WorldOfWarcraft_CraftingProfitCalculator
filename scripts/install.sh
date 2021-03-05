#!/bin/bash
readonly INSTALL_DIRECTORY="/opt/wow_cpc"
readonly USER="WOW_CPC"
readonly TMP_DIR="/tmp/cpc_db_hold"
COPY_DB=0

# Stop everything, if it exists
systemctl disable wow_cpc_auction_scrape.service
systemctl disable wow_cpc_auction_scrape.timer
systemctl disable wow_cpc.service
systemctl stop wow_cpc_auction_scrape.service
systemctl stop wow_cpc.service
systemctl stop wow_cpc_auction_scrape.timer

# Copy out the old databases if they exist
if [ -d "${INSTALL_DIRECTORY}" ]
  then
    mkdir "${TMP_DIR}"
    cp "${INSTALL_DIRECTORY}/cache/cache.db" "${TMP_DIR}/"
    cp "${INSTALL_DIRECTORY}/historical_auctions.db" "${TMP_DIR}/"
    COPY_DB=1
fi

# Make the directory if it doesn't exist
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
./build.sh

# Copy files
cp --archive ../ $INSTALL_DIRECTORY

# Copy SystemD Units
cp "${INSTALL_DIRECTORY}/scripts/wow_cpc_auction_scrape.service" /etc/systemd/system/wow_cpc_auction_scrape.service
cp "${INSTALL_DIRECTORY}/scripts/wow_cpc_auction_scrape.timer" /etc/systemd/system/wow_cpc_auction_scrape.timer
cp "${INSTALL_DIRECTORY}/scripts/wow_cpc.service" /etc/systemd/system/wow_cpc.service

# Copy back old databases, if we copied them
if [ $COPY_DB -eq 1 ]
  then
    cp "${TMP_DIR}/cache.db" "${INSTALL_DIRECTORY}/cache/cache.db"
    cp "${TMP_DIR}/historical_auctions.db" "${INSTALL_DIRECTORY}/historical_auctions.db"
    rmdir -r "${TMP_DIR}"
fi

# Activate SystemD Units
systemctl enable wow_cpc_auction_scrape.service
systemctl enable wow_cpc_auction_scrape.timer
systemctl enable wow_cpc.service

# Start Server
systemctl start wow_cpc.service

# Start Timer
systemctl start wow_cpc_auction_scrape.timer