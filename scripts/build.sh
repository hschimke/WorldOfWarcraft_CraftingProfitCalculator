#!/bin/bash

cd "${INSTALL_DIRECTORY}"
cd ./client
npm run build
mv --force ./build ../html