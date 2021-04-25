#!/bin/bash

cd "${INSTALL_DIRECTORY}"
npm run build
cd ./client
npm run build
rm -r ../html/build
mv ./build ../html