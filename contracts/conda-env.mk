# https://github.com/mamba-org/mamba#micromamba
# https://gist.github.com/wolfv/fe1ea521979973ab1d016d95a589dcde

MICROMAMBA := $(TOP_DIR)/bin/micromamba

.PHONY: conda-env-reusable
# CONDA os, arch tuple: linux-64, osx-arm64
conda-env-reusable:
	if [ ! -f $(MICROMAMBA) ]; then \
		if [ ! -f $(HOME)/.cache/micromamba ]; then \
			case $(shell uname) in \
				Linux) CONDA_OS=linux ;; \
				Darwin) CONDA_OS=osx ;; \
				*) printf 'OS not supported: "%s"\n' $(shell uname) >&2; exit 1 ;; \
			esac; \
			case $(shell uname -p) in \
				i386|x86_64) CONDA_ARCH=64 ;; \
				arm) CONDA_ARCH=arm64 ;; \
				*) printf 'CPU Architecture not supported: "%s"\n' $(shell uname -p) >&2; exit 1 ;; \
			esac; \
			mkdir -p $(HOME)/.cache && curl -sSL https://micromamba.snakepit.net/api/micromamba/"$$CONDA_OS"-"$$CONDA_ARCH"/latest | tar -jx bin/micromamba  && mv ./bin/micromamba $(HOME)/.cache/ && chmod +x $(HOME)/.cache/micromamba; \
		fi; \
		mkdir -p $(TOP_DIR)/bin && ln -sf $(HOME)/.cache/micromamba $(MICROMAMBA); \
	fi; \
	if [ ! -d $(CONDA_ENV_DIR) ]; then \
		$(MICROMAMBA) create -y -f $(TOP_DIR)/environment.yml -p $(CONDA_ENV_DIR); \
	else \
		$(MICROMAMBA) update -y -f $(TOP_DIR)/environment.yml -p $(CONDA_ENV_DIR); \
	fi;

.PHONY: micromamba-update
micromamba-update:
	rm -f ~/.cache/micrombmba ; \
	case $(shell uname) in \
		Linux) CONDA_OS=linux ;; \
		Darwin) CONDA_OS=osx ;; \
		*) printf 'OS not supported: "%s"\n' $(shell uname) >&2; exit 1 ;; \
	esac; \
	case $(shell uname -p) in \
		i386|x86_64) CONDA_ARCH=64 ;; \
		arm) CONDA_ARCH=arm64 ;; \
		*) printf 'CPU Architecture not supported: "%s"\n' $(shell uname -p) >&2; exit 1 ;; \
	esac; \
	mkdir -p $(HOME)/.cache && curl -sSL https://micromamba.snakepit.net/api/micromamba/"$$CONDA_OS"-"$$CONDA_ARCH"/latest | tar -jx bin/micromamba  && mv ./bin/micromamba $(HOME)/.cache/ && chmod +x $(HOME)/.cache/micromamba; \
	mkdir -p $(TOP_DIR)/bin && ln -sf $(HOME)/.cache/micromamba $(MICROMAMBA)
