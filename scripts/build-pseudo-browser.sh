#!/bin/bash

set -ex

PACKAGE="$1"

if [ -n "${NVM_BIN:-}" ]; then
  export PATH=$NVM_BIN:$PATH
fi

pnpm install --frozen-lockfile
pnpm --filter=${PACKAGE} build
