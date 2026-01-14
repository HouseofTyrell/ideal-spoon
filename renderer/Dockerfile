# Kometa Preview Renderer
# Based on official Kometa image to use Kometa's overlay rendering pipeline
ARG KOMETA_IMAGE_TAG=v2.2.2

FROM kometateam/kometa:${KOMETA_IMAGE_TAG}

# Install additional dependencies for preview mode
USER root

# Create preview directories
RUN mkdir -p /preview /jobs

# Copy all preview/renderer Python modules
COPY *.py /preview/
RUN chmod +x /preview/preview_entrypoint.py

# Set working directory
WORKDIR /

# Override entrypoint for preview mode
ENTRYPOINT ["python3", "/preview/preview_entrypoint.py"]
