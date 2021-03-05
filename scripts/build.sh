#!/bin/bash

cd "${INSTALL_DIRECTORY}"
cd ./client
npm run build
rm -r ../html/build
mv ./build ../html