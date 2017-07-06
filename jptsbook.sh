#!/usr/bin/env bash
echo @pynb@

cd @jptsDir@
export JUPYTER_PATH=$PWD
exec @pynb@/bin/ipython notebook --config=@jupyterConfig@ $@
