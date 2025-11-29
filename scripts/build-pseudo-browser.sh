#!/bin/bash

set -ex

if [ -n "${NVM_BIN:-}" ]; then
  export PATH=$NVM_BIN:$PATH
fi

pnpm install
pnpm build
