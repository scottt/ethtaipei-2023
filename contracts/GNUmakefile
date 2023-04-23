# This is used to figure out the top level dir
# where this makefile resides.
TOP_DIR := $(patsubst %/,%,$(realpath $(dir $(lastword $(MAKEFILE_LIST)))))

CONDA_ENV_DIR := $(TOP_DIR)/conda-env
CONDA ?= $(HOME)/miniconda3/bin/conda

NODE_MODULES_BIN := $(TOP_DIR)/node_modules/.bin

PATH := $(CONDA_ENV_DIR)/bin:$(NODE_MODULES_BIN):$(PATH)
YARN := $(CONDA_ENV_DIR)/bin/yarn

# `Local.mk` can be used to customized builds.
-include $(TOP_DIR)/Local.mk

export PATH

# Make the default target (first target) to all.
default: all

export TOP_DIR

# https://hardhat.org/guides/typescript.html#performance-optimizations
export TS_NODE_TRANSPILE_ONLY=true
# make `ts-node` include `hardhat.config.ts` via `package.json`
export TS_NODE_FILES=true
# (node:84116) ExperimentalWarning: stream/web is an experimental feature. This feature could change at any time
export NODE_OPTIONS=--no-warnings

include $(TOP_DIR)/conda-env.mk
.PHONY: conda-env
conda-env: conda-env-reusable
	$(YARN) install

PREFERRED_INTERACTIVE_SHELL ?= bash
PS1_NAME ?= 'hardhat-template'
MAKE_SHELL_PS1 ?= '$(PS1_NAME) $$ '
.PHONY: shell
ifeq ($(PREFERRED_INTERACTIVE_SHELL),bash)
shell:
	@INIT_FILE=$(shell mktemp); \
	$(TOP_DIR)/bin/dot-env-init-file-gen -f .env.development $$INIT_FILE; \
	printf '[ -e $$HOME/.bashrc ] && source $$HOME/.bashrc\n' >> $$INIT_FILE; \
	printf '[ -e Local.env ] && source Local.env\n' >> $$INIT_FILE; \
	printf 'PS1='"$(MAKE_SHELL_PS1) "'\n' >> $$INIT_FILE; \
	$(PREFERRED_INTERACTIVE_SHELL) --init-file $$INIT_FILE || true
else ifeq ($(PREFERRED_INTERACTIVE_SHELL),fish)
shell:
	@INIT_FILE=$(shell mktemp); \
	printf 'if functions -q fish_right_prompt\n' > $$INIT_FILE; \
	printf '    functions -c fish_right_prompt __fish_right_prompt_original\n' >> $$INIT_FILE; \
	printf '    functions -e fish_right_prompt\n' >> $$INIT_FILE; \
	printf 'else\n' >> $$INIT_FILE; \
	printf '    function __fish_right_prompt_original\n' >> $$INIT_FILE; \
	printf '    end\n' >> $$INIT_FILE; \
	printf 'end\n' >> $$INIT_FILE; \
	printf 'function fish_right_prompt\n' >> $$INIT_FILE; \
	printf '    echo -n "($(PS1_NAME)) "\n' >> $$INIT_FILE; \
	printf '    __fish_right_prompt_original\n' >> $$INIT_FILE; \
	printf 'end\n' >> $$INIT_FILE; \
	$(PREFERRED_INTERACTIVE_SHELL) --init-command="source $$INIT_FILE" || true
else
shell:
	@$(PREFERRED_INTERACTIVE_SHELL) || true
endif
